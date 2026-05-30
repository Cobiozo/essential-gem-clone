// Edge function: payu-blik-charge
// Initiates a PayU order with BLIK Authorization Code (on-site, no redirect).
// Frontend then polls payu-check-order for status changes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPayUConfig, getPayUAccessToken } from "../_shared/payu-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://purelife.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { orderId, blikCode } = await req.json();
    if (!orderId || !/^\d{6}$/.test(String(blikCode || ""))) {
      return new Response(JSON.stringify({ error: "Podaj 6-cyfrowy kod BLIK" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let cfg;
    try { cfg = await getPayUConfig(); }
    catch (err) {
      return new Response(JSON.stringify({ error: "PayU nieskonfigurowane", detail: (err as Error).message }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: oErr } = await supabase
      .from("paid_event_orders")
      .select(`*, paid_events ( title, slug ), paid_event_tickets ( name, price_pln )`)
      .eq("id", orderId).maybeSingle();
    if (oErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.status === "paid" || order.status === "completed") {
      return new Response(JSON.stringify({ error: "Zamówienie już opłacone" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getPayUAccessToken(cfg);
    const customerIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    const payuOrder = {
      notifyUrl: `${supabaseUrl}/functions/v1/payu-webhook`,
      continueUrl: `${APP_URL}/ticket/${order.ticket_code}?orderId=${order.id}`,
      customerIp,
      merchantPosId: cfg.posId,
      description: `${(order as any).paid_events?.title || "Wydarzenie"} - BLIK`,
      currencyCode: "PLN",
      totalAmount: String(order.total_amount),
      extOrderId: order.id,
      buyer: {
        email: order.email,
        firstName: order.first_name,
        lastName: order.last_name,
        phone: order.phone || "",
      },
      payMethods: {
        payMethod: { type: "PBL", value: "blik", authorizationCode: String(blikCode) },
      },
      products: [{
        name: (order as any).paid_event_tickets?.name || "Bilet",
        unitPrice: String((order as any).paid_event_tickets?.price_pln || order.total_amount),
        quantity: String(order.quantity || 1),
      }],
    };

    const payuRes = await fetch(`${cfg.baseUrl}/api/v2_1/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payuOrder),
      redirect: "manual",
    });
    const payuData = await payuRes.json().catch(() => ({}));
    console.log("[payu-blik-charge]", JSON.stringify(payuData));

    const sc = payuData?.status?.statusCode;
    if (sc !== "SUCCESS" && sc !== "WARNING_CONTINUE_3DS") {
      await supabase.from("paid_event_orders").update({ status: "failed" }).eq("id", order.id);
      return new Response(JSON.stringify({
        error: payuData?.status?.statusDesc || "BLIK odrzucony",
        code: sc,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("paid_event_orders").update({
      payment_order_id: payuData.orderId,
      payment_method: "payu_blik",
      payu_blik_auth_code: String(blikCode),
    }).eq("id", order.id);

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      payuOrderId: payuData.orderId,
      redirectUri: payuData.redirectUri || null, // null for pure BLIK, present for 3DS
      message: "Potwierdź płatność w aplikacji bankowej",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[payu-blik-charge]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
