// Self-delete account edge function.
// Allows the currently authenticated user to permanently delete their own
// account. Mirrors the anonymization logic of `admin-delete-user` so that
// historical event registrations / orders / invite links survive the deletion
// but lose the FK to the removed auth user.
// Admins cannot self-delete here – another admin has to remove them.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader =
      req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const userId = user.id;

    // Block admins from self-deleting through this endpoint.
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const hasAdmin = (roles || []).some((r: any) => r.role === 'admin');
    if (hasAdmin) {
      return new Response(
        JSON.stringify({
          error:
            'Konto administratora może usunąć wyłącznie inny administrator.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Mark related team_contacts as "user deleted"
    await supabaseAdmin
      .from('team_contacts')
      .update({ linked_user_deleted_at: new Date().toISOString() })
      .eq('linked_user_id', userId);

    // Anonymize references in event-related tables BEFORE deleting the auth user.
    const anonymizeOps: Array<Promise<any>> = [
      supabaseAdmin
        .from('event_form_submissions')
        .update({ partner_user_id: null })
        .eq('partner_user_id', userId),
      supabaseAdmin
        .from('paid_event_orders')
        .update({ user_id: null })
        .eq('user_id', userId),
      supabaseAdmin
        .from('guest_event_registrations')
        .update({ invited_by_user_id: null })
        .eq('invited_by_user_id', userId),
      supabaseAdmin
        .from('user_reflinks')
        .update({ creator_user_id: null })
        .eq('creator_user_id', userId),
      supabaseAdmin
        .from('guest_invite_links')
        .update({ created_by: null })
        .eq('created_by', userId),
    ];
    const results = await Promise.allSettled(anonymizeOps);
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`[self-delete-account] anonymize op #${i} failed`, r.reason);
      }
    });

    // Best-effort audit log
    try {
      await supabaseAdmin.from('admin_activity_log').insert({
        actor_user_id: userId,
        target_user_id: userId,
        action_type: 'self_account_deletion',
        action_details: `User ${user.email ?? userId} self-deleted their account.`,
      } as any);
    } catch (e) {
      console.warn('[self-delete-account] activity log insert failed', e);
    }

    // Finally delete the auth user (CASCADE removes profile + user_roles).
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[self-delete-account] delete failed', deleteError);
      throw deleteError;
    }

    console.log(`[self-delete-account] user ${userId} deleted themselves`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[self-delete-account] error', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
