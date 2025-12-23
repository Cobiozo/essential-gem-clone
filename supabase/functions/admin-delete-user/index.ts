import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header (check both cases)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is authenticated and get their user id
    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token?.length);
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError) {
      console.error('Auth error:', authError.message);
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${authError.message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.error('No user found for token');
      return new Response(
        JSON.stringify({ error: 'User not found for provided token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Authenticated user:', user.id, user.email);

    // Check if the user is an admin based on the user_roles table
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    // Also check if user profile is active
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError || !userRole || userRole.role !== 'admin' || profile?.is_active === false) {
      console.error('Admin check failed. Role:', userRole, 'Profile:', profile, 'Errors:', roleError, profileError);
      return new Response(
        JSON.stringify({ error: 'Access denied: admin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark all team_contacts linked to this user as "user deleted"
    // This preserves the contact data but indicates the user no longer exists
    const { error: markError } = await supabaseClient
      .from('team_contacts')
      .update({ linked_user_deleted_at: new Date().toISOString() })
      .eq('linked_user_id', userId);

    if (markError) {
      console.warn('Warning: Could not mark team contacts for deleted user:', markError.message);
      // Continue with deletion even if marking fails
    } else {
      console.log(`Marked team contacts for user ${userId} as deleted`);
    }

    // Delete the user from auth.users
    // This will cascade delete related records in profiles and user_roles tables
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw deleteError;
    }

    console.log(`User ${userId} successfully deleted by admin ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in admin-delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
