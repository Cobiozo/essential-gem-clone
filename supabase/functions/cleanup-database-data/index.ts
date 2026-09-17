import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  countForRule,
  cutoffISOFor,
  deleteForRule,
  isMachineAuthorized,
  resolveRule,
  runAll,
} from './logic.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get('CLEANUP_CRON_SECRET');
    const machineAuthorized = isMachineAuthorized(req.headers.get('x-cron-secret'), cronSecret);

    // Service role client for DB operations (used by both auth paths)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    if (!machineAuthorized) {
      // Existing user path: JWT + admin role (unchanged)
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return json({ error: 'Unauthorized' }, 401);
      }

      const token = authHeader.replace('Bearer ', '');
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: userData, error: authError } = await supabaseAnon.auth.getUser(token);
      if (authError || !userData?.user) {
        return json({ error: 'Unauthorized' }, 401);
      }

      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        return json({ error: 'Admin access required' }, 403);
      }
    }

    const body = await req.json().catch(() => ({}));
    const { action, table_name, extra_condition, retention_days, category_key } = body ?? {};

    // ---------- run_all: machine-only batch execution of enabled retention rules ----------
    if (action === 'run_all') {
      if (!machineAuthorized) {
        return json({ error: 'Unauthorized' }, 401);
      }
      const summary = await runAll(supabaseAdmin);
      return json(summary, 200);
    }

    // ---------- existing single-rule actions (unchanged semantics) ----------
    const resolved = resolveRule({
      category_key,
      table_name,
      extra_condition: extra_condition ?? null,
      retention_days: retention_days ?? null,
    });
    if (!resolved.ok) {
      return json({ error: resolved.error }, 400);
    }

    const cutoffISO = cutoffISOFor(resolved.retentionDays);
    console.log(
      `[cleanup-database-data] action=${action}, table=${table_name}, days=${resolved.retentionDays}, cutoff=${cutoffISO}`
    );

    if (action === 'count') {
      const count = await countForRule(
        supabaseAdmin, table_name, resolved.tableConfig, resolved.safeExtraCondition, cutoffISO,
      );
      return json({ count }, 200);
    }

    if (action === 'delete') {
      const deletedCount = await deleteForRule(
        supabaseAdmin, table_name, resolved.tableConfig, resolved.safeExtraCondition, cutoffISO,
      );
      console.log(`[cleanup-database-data] Deleted ${deletedCount} records from ${table_name}`);
      return json({ success: true, deleted_count: deletedCount }, 200);
    }

    return json({ error: 'Invalid action. Use count or delete.' }, 400);

  } catch (error: any) {
    console.error('[cleanup-database-data] Error:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
});
