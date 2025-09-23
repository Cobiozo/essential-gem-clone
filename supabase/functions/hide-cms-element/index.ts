// Hide or show CMS element (section or item) with admin verification
// Uses JWT to verify admin and service role to perform updates reliably
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client bound to caller JWT (to check is_admin via RLS-based function)
    const jwtClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify admin
    const { data: isAdmin, error: adminErr } = await jwtClient.rpc("is_admin");
    if (adminErr) {
      console.error("is_admin RPC error:", adminErr);
      return new Response(JSON.stringify({ error: "Authorization check failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse payload
    const body = await req.json().catch(() => null);
    if (!body || !body.id || !body.elementType) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const elementType = body.elementType as "section" | "item";
    const is_active = typeof body.isActive === "boolean" ? body.isActive : false;
    const id = body.id as string;

    const sr = createClient(supabaseUrl, serviceRoleKey);

    const table = elementType === "section" ? "cms_sections" : "cms_items";
    const { error } = await sr.from(table).update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);

    if (error) {
      console.error("Hide element error", { table, id, error });
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hide-cms-element error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
