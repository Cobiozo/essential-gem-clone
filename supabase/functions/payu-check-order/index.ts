// Edge function: payu-check-order
// Polls PayU order status. Used by the BLIK on-site flow to detect COMPLETED.
// Returns { status, payuStatus } where status is the local DB status after sync.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPayUConfig, getPayUAccessToken } from "../_shared/payu-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: order } = await supabase
      .from("paid_event_orders")
      .select("id, status, payment_order_id, ticket_code")
      .eq("id", orderId).maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already finalized?
    if (order.status === "paid" || order.status === "completed") {
      return new Response(JSON.stringify({
        status: order.status, payuStatus: "COMPLETED", ticketCode: order.ticket_code,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!order.payment_order_id) {
      return new Response(JSON.stringify({ status: order.status, payuStatus: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = await getPayUConfig();
    const token = await getPayUAccessToken(cfg);
    const res = await fetch(`${cfg.baseUrl}/api/v2_1/orders/${order.payment_order_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    const payuStatus = data?.orders?.[0]?.status || null;

    let newLocalStatus = order.status;
    if (payuStatus === "COMPLETED") newLocalStatus = "paid";
    else if (payuStatus === "CANCELED") newLocalStatus = "cancelled";

    if (newLocalStatus !== order.status) {
      await supabase.from("paid_event_orders").update({ status: newLocalStatus }).eq("id", order.id);

      // Trigger PDF generation on success
      if (newLocalStatus === "paid") {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-event-ticket-pdf`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ orderId: order.id }),
          });
        } catch (e) { console.warn("[payu-check-order] pdf gen trigger failed", e); }
      }
    }

    return new Response(JSON.stringify({
      status: newLocalStatus, payuStatus, ticketCode: order.ticket_code,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[payu-check-order]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
