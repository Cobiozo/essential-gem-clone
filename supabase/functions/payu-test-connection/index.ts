// Edge function: payu-test-connection
// Admin-only. Pulls credentials from public.payu_settings, attempts OAuth,
// persists the result (last_test_at / last_test_ok / last_test_message)
// and returns a clear payload to the UI.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPayUConfig, getPayUAccessToken } from "../_shared/payu-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const persist = async (ok: boolean, message: string) => {
    try {
      const { data: row } = await service
        .from("payu_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (row?.id) {
        await service
          .from("payu_settings")
          .update({
            last_test_at: new Date().toISOString(),
            last_test_ok: ok,
            last_test_message: message.slice(0, 300),
          })
          .eq("id", row.id);
      }
    } catch (e) {
      console.error("[payu-test-connection] persist failed", e);
    }
  };

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
    const message = `Połączono ze środowiskiem: ${cfg.environment}`;
    const tested_at = new Date().toISOString();
    await persist(true, message);

    return new Response(
      JSON.stringify({
        ok: true,
        environment: cfg.environment,
        token_preview: token.slice(0, 8) + "…",
        is_enabled: cfg.isEnabled,
        message,
        tested_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[payu-test-connection]", message);
    const tested_at = new Date().toISOString();
    await persist(false, message);
    return new Response(
      JSON.stringify({ ok: false, error: message, message, tested_at }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
