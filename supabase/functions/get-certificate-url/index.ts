import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji. Zaloguj się ponownie.', sessionExpired: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client for user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Admin client for storage operations (private bucket)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Sesja wygasła. Zaloguj się ponownie.', sessionExpired: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { certificateId } = await req.json();

    if (!certificateId) {
      return new Response(
        JSON.stringify({ error: 'Certificate ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching certificate:', certificateId);

    // Get certificate details and verify ownership using admin client
    const { data: certificate, error: certError } = await supabaseAdmin
      .from('certificates')
      .select('file_url, user_id')
      .eq('id', certificateId)
      .single();

    if (certError || !certificate) {
      console.error('Certificate fetch error:', certError);
      return new Response(
        JSON.stringify({ error: 'Certificate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this certificate or is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    
    if (certificate.user_id !== user.id && !isAdmin) {
      console.error('Unauthorized access attempt by:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to certificate' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract file path from the stored URL
    let filePath = certificate.file_url;
    
    console.log('Original file_url:', filePath);

    // Check if file_url is a placeholder (not yet generated)
    if (filePath.startsWith('pending-generation')) {
      console.error('Certificate file not yet generated:', filePath);
      return new Response(
        JSON.stringify({ 
          error: 'Certificate is still being generated. Please try again in a moment.',
          pending: true 
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If it's a full URL, extract the path after the bucket name
    if (filePath.includes('/storage/v1/object/')) {
      const parts = filePath.split('certificates/');
      if (parts.length > 1) {
        filePath = parts[1];
      }
    }
    
    console.log('Extracted file path:', filePath);

    // Create a signed URL with download option using admin client (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('certificates')
      .createSignedUrl(filePath, 3600, {
        download: true
      });

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate download URL', details: urlError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signed URL created successfully');

    return new Response(
      JSON.stringify({ url: signedUrlData.signedUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
