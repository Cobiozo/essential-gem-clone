import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify admin
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { submissionId, paymentStatus, adminNotes } = await req.json();
    if (!submissionId || !["pending", "paid", "cancelled", "refunded"].includes(paymentStatus)) {
      return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const update: any = {
      payment_status: paymentStatus,
      payment_marked_at: new Date().toISOString(),
      payment_marked_by: userId,
    };
    if (typeof adminNotes === "string") update.admin_notes = adminNotes;
    if (paymentStatus === "cancelled") {
      update.status = "cancelled";
      update.cancelled_at = new Date().toISOString();
      update.cancelled_by = "admin";
    }

    const { data, error } = await supabase
      .from("event_form_submissions")
      .update(update)
      .eq("id", submissionId)
      .select("id, email, payment_status")
      .single();

    if (error) throw error;

    // Activity log
    await supabase.from("admin_activity_log").insert({
      admin_user_id: userId,
      action_type: "event_form_payment_update",
      action_description: `Zmieniono status płatności zgłoszenia na "${paymentStatus}"`,
      target_table: "event_form_submissions",
      target_id: submissionId,
      details: { payment_status: paymentStatus, email: data.email },
    });

    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[admin-mark-event-payment]", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
