// Edge function: payu-test-connection
// Admin-only. Pulls credentials from public.payu_settings and tries to obtain an OAuth token.
// Returns { ok: true } on success or a clear error message.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPayUConfig, getPayUAccessToken } from "../_shared/payu-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Admin gate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: hasAdmin } = await service.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!hasAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = await getPayUConfig();
    const token = await getPayUAccessToken(cfg);

    return new Response(
      JSON.stringify({
        ok: true,
        environment: cfg.environment,
        token_preview: token.slice(0, 8) + "…",
        is_enabled: cfg.isEnabled,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[payu-test-connection]", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 200, // 200 so the frontend can show the message
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
