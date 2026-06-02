import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { issueFreeTicketForOrder } from "../_shared/free-event-ticket.ts";

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
      .select("id, email, payment_status, submitted_data")
      .single();

    if (error) throw error;

    // === Ticket issuance after admin confirms transfer payment ===
    // When admin marks payment as "paid", flip linked paid_event_orders to paid
    // and send the ticket PDF + QR for any transfer reservation orders.
    const ticketResults: any[] = [];
    if (paymentStatus === "paid") {
      const sd: any = data.submitted_data || {};
      const orderIds: string[] = Array.isArray(sd.order_ids)
        ? sd.order_ids.filter((v: any) => typeof v === "string")
        : (sd.order_id ? [String(sd.order_id)] : []);

      for (const oid of orderIds) {
        try {
          const { data: ord } = await supabase
            .from("paid_event_orders")
            .select("id, status, payment_provider, ticket_sent_at, total_amount")
            .eq("id", oid)
            .maybeSingle();
          if (!ord) continue;

          // Flip order to paid if it's a transfer reservation still awaiting payment
          if (ord.status !== "paid" && ord.status !== "cancelled" && ord.status !== "refunded") {
            const { error: upErr } = await supabase
              .from("paid_event_orders")
              .update({ status: "paid" })
              .eq("id", oid);
            if (upErr) {
              console.error("[admin-mark-event-payment] order status update failed", oid, upErr);
              ticketResults.push({ orderId: oid, ok: false, error: `status_update: ${upErr.message}` });
              continue;
            }
          }

          // Issue ticket if not already sent
          if (!ord.ticket_sent_at) {
            try {
              const res = await issueFreeTicketForOrder(supabase, oid);
              ticketResults.push({ orderId: oid, ok: true, res });
            } catch (e: any) {
              console.error("[admin-mark-event-payment] ticket send failed", oid, e);
              ticketResults.push({ orderId: oid, ok: false, error: e?.message });
            }
          }
        } catch (perOrderErr) {
          console.error("[admin-mark-event-payment] per-order error", oid, perOrderErr);
          ticketResults.push({ orderId: oid, ok: false, error: String(perOrderErr) });
        }
      }
    }

    // Activity log
    await supabase.from("admin_activity_log").insert({
      admin_user_id: userId,
      action_type: "event_form_payment_update",
      action_description: paymentStatus === "paid"
        ? `Potwierdzono płatność i wysłano bilet (${ticketResults.filter(r => r.ok).length}/${ticketResults.length})`
        : `Zmieniono status płatności zgłoszenia na "${paymentStatus}"`,
      target_table: "event_form_submissions",
      target_id: submissionId,
      details: { payment_status: paymentStatus, email: data.email, ticket_results: ticketResults },
    });

    return new Response(
      JSON.stringify({ success: true, data, ticket_results: ticketResults }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[admin-mark-event-payment]", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
