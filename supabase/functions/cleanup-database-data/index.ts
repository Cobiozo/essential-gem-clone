import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed tables and their date columns (whitelist for security)
const ALLOWED_TABLES: Record<string, { dateColumn: string; allowExtraCondition: boolean }> = {
  email_logs: { dateColumn: 'created_at', allowExtraCondition: false },
  google_calendar_sync_logs: { dateColumn: 'created_at', allowExtraCondition: false },
  cron_job_logs: { dateColumn: 'created_at', allowExtraCondition: false },
  events: { dateColumn: 'created_at', allowExtraCondition: true }, // extra: end_time < NOW()
  user_notifications: { dateColumn: 'created_at', allowExtraCondition: true }, // extra: is_read = true
  banner_interactions: { dateColumn: 'created_at', allowExtraCondition: false },
  push_notification_logs: { dateColumn: 'created_at', allowExtraCondition: false },
  medical_chat_history: { dateColumn: 'created_at', allowExtraCondition: false },
  ai_compass_contact_history: { dateColumn: 'created_at', allowExtraCondition: false },
  reflink_events: { dateColumn: 'created_at', allowExtraCondition: false },
};

// Safe extra conditions whitelist (no user input goes into SQL)
const ALLOWED_EXTRA_CONDITIONS: Record<string, string> = {
  'end_time < NOW()': 'end_time < NOW()',
  'is_read = true': 'is_read = true',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, table_name, extra_condition, retention_days, category_key } = body;

    // Validate table name against whitelist
    const tableConfig = ALLOWED_TABLES[table_name];
    if (!tableConfig) {
      return new Response(JSON.stringify({ error: `Table '${table_name}' is not allowed for cleanup` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate extra condition against whitelist
    let safeExtraCondition: string | null = null;
    if (extra_condition) {
      safeExtraCondition = ALLOWED_EXTRA_CONDITIONS[extra_condition] || null;
      if (!safeExtraCondition) {
        return new Response(JSON.stringify({ error: `Extra condition '${extra_condition}' is not allowed` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const retentionDays = Math.max(1, Math.min(3650, parseInt(retention_days) || 90));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`[cleanup-database-data] action=${action}, table=${table_name}, days=${retentionDays}, cutoff=${cutoffISO}`);

    if (action === 'count') {
      // For events, count based on end_time condition, not created_at
      if (table_name === 'events' && safeExtraCondition === 'end_time < NOW()') {
        const { count, error } = await supabaseAdmin
          .from(table_name as any)
          .select('*', { count: 'exact', head: true })
          .lt('end_time', cutoffISO);
        if (error) throw error;
        return new Response(JSON.stringify({ count: count ?? 0 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let query = supabaseAdmin
        .from(table_name as any)
        .select('*', { count: 'exact', head: true })
        .lt(tableConfig.dateColumn, cutoffISO);

      if (safeExtraCondition === 'is_read = true') {
        query = query.eq('is_read', true);
      }

      const { count, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ count: count ?? 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'delete') {
      let deletedCount = 0;

      // Special handling for events: delete registrations first (cascade safety), then events
      if (table_name === 'events' && safeExtraCondition === 'end_time < NOW()') {
        // Get IDs of past events
        const { data: pastEvents, error: fetchError } = await supabaseAdmin
          .from('events')
          .select('id')
          .lt('end_time', cutoffISO);

        if (fetchError) throw fetchError;

        if (pastEvents && pastEvents.length > 0) {
          const eventIds = pastEvents.map((e: any) => e.id);

          // Delete registrations for those events
          await supabaseAdmin
            .from('event_registrations')
            .delete()
            .in('event_id', eventIds);

          // Delete the events
          const { error: deleteError, count } = await supabaseAdmin
            .from('events')
            .delete()
            .in('id', eventIds);

          if (deleteError) throw deleteError;
          deletedCount = count ?? eventIds.length;
        }

        console.log(`[cleanup-database-data] Deleted ${deletedCount} past events (+ their registrations)`);
        return new Response(JSON.stringify({ success: true, deleted_count: deletedCount }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Standard delete
      let query = supabaseAdmin
        .from(table_name as any)
        .delete()
        .lt(tableConfig.dateColumn, cutoffISO);

      if (safeExtraCondition === 'is_read = true') {
        query = query.eq('is_read', true);
      }

      const { error, count } = await query;
      if (error) throw error;
      deletedCount = count ?? 0;

      console.log(`[cleanup-database-data] Deleted ${deletedCount} records from ${table_name}`);
      return new Response(JSON.stringify({ success: true, deleted_count: deletedCount }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use count or delete.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('[cleanup-database-data] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
