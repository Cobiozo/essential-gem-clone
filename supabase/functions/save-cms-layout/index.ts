// Save CMS layout (sections and items ordering/section assignment) with admin check
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
    if (!body || !Array.isArray(body.sections) || !Array.isArray(body.items)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sections: Array<{ id: string; position: number }> = body.sections;
    const items: Array<{ id: string; section_id: string; position: number }> = body.items;

    // Service role client to bypass RLS for the actual updates
    const sr = createClient(supabaseUrl, serviceRoleKey);

    // Update sections positions with explicit error handling
    const sectionResults = await Promise.all(
      sections.map(async (s) => {
        const res = await sr
          .from("cms_sections")
          .update({ position: s.position })
          .eq("id", s.id);
        if (res.error) {
          console.error("Section update error", { id: s.id, error: res.error });
        }
        return { type: "section" as const, id: s.id, error: res.error };
      })
    );

    // Update items (position + section_id) with explicit error handling
    const itemResults = await Promise.all(
      items.map(async (it) => {
        const res = await sr
          .from("cms_items")
          .update({ position: it.position, section_id: it.section_id })
          .eq("id", it.id);
        if (res.error) {
          console.error("Item update error", { id: it.id, error: res.error });
        }
        return { type: "item" as const, id: it.id, error: res.error };
      })
    );

    const failures = [...sectionResults, ...itemResults].filter((r) => r.error);

    if (failures.length > 0) {
      console.error("Some updates failed", failures);
      return new Response(
        JSON.stringify({ error: "Partial failure", failed: failures.length, details: failures }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, updated_sections: sectionResults.length, updated_items: itemResults.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("save-cms-layout error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});