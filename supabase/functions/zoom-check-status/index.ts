import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create service role client for database operations and JWT verification
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user using getUser with service role key
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('JWT verification failed:', authError?.message || 'No user');
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Authenticated user:', user.id);

    // Check if Zoom credentials are configured
    const accountId = Deno.env.get('ZOOM_ACCOUNT_ID');
    const clientId = Deno.env.get('ZOOM_CLIENT_ID');
    const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');

    const isConfigured = !!(accountId && clientId && clientSecret);

    if (!isConfigured) {
      return new Response(
        JSON.stringify({
          configured: false,
          status: 'not_configured',
          message: 'Zoom API credentials are not configured',
          instructions: [
            '1. Przejdź do https://marketplace.zoom.us/',
            '2. Utwórz Server-to-Server OAuth App',
            '3. Nadaj uprawnienia: meeting:write:admin, meeting:read:admin, user:read:admin',
            '4. Dodaj sekrety w ustawieniach projektu Supabase:',
            '   - ZOOM_ACCOUNT_ID',
            '   - ZOOM_CLIENT_ID',
            '   - ZOOM_CLIENT_SECRET',
            '   - ZOOM_HOST_EMAIL (opcjonalnie)'
          ]
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optionally test the connection
    const url = new URL(req.url);
    const testConnection = url.searchParams.get('test') === 'true';

    if (testConnection) {
      try {
        const credentials = btoa(`${clientId}:${clientSecret}`);
        const tokenResponse = await fetch(
          `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        if (!tokenResponse.ok) {
          // Update settings with error status
          await supabase
            .from('zoom_integration_settings')
            .update({
              api_status: 'error',
              last_api_check_at: new Date().toISOString(),
            })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

          return new Response(
            JSON.stringify({
              configured: true,
              status: 'error',
              message: 'Failed to authenticate with Zoom API. Check your credentials.',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update settings with success status
        await supabase
          .from('zoom_integration_settings')
          .update({
            is_configured: true,
            api_status: 'active',
            last_api_check_at: new Date().toISOString(),
          })
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

        return new Response(
          JSON.stringify({
            configured: true,
            status: 'active',
            message: 'Zoom API connection successful',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Zoom API test error:', error);
        return new Response(
          JSON.stringify({
            configured: true,
            status: 'error',
            message: 'Failed to connect to Zoom API',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return configured status without testing
    return new Response(
      JSON.stringify({
        configured: true,
        status: 'unknown',
        message: 'Zoom credentials are configured. Use ?test=true to verify connection.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in zoom-check-status:', error);
    return new Response(
      JSON.stringify({ 
        configured: false,
        status: 'error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
