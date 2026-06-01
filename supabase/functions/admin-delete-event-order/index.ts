import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verifyAdmin, corsHeaders, jsonResponse } from "../_shared/admin-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return auth.response;

    const { orderId } = await req.json();
    if (!orderId) return jsonResponse({ error: "orderId required" }, 400);

    // Load order so we can also clear related rows in every table that ties a
    // registration to the (event_id, email/user_id) pair. The goal: after delete
    // there is ZERO trace of this registration so the gość/partner can re-register
    // cleanly and receive confirmation + ticket emails again.
    const { data: order } = await auth.supabaseAdmin
      .from("paid_event_orders")
      .select("id, event_id, user_id, email")
      .eq("id", orderId)
      .maybeSingle();

    const summary: Record<string, number | string> = { order_id: orderId };

    // 1) attendees + order_history kasują się kaskadowo z paid_event_orders
    const { error } = await auth.supabaseAdmin
      .from("paid_event_orders")
      .delete()
      .eq("id", orderId);
    if (error) return jsonResponse({ error: error.message }, 500);
    summary.paid_event_orders = 1;

    if (order?.event_id) {
      const eventId = order.event_id;
      const emailLower = order.email ? String(order.email).toLowerCase() : null;
      const userId = order.user_id;

      // 2) event_registrations (partner zalogowany)
      if (userId) {
        const { count } = await auth.supabaseAdmin
          .from("event_registrations")
          .delete({ count: "exact" })
          .eq("event_id", eventId)
          .eq("user_id", userId);
        summary.event_registrations = count ?? 0;
      }

      // 3) guest_event_registrations (gość po e-mailu)
      if (emailLower) {
        const { count } = await auth.supabaseAdmin
          .from("guest_event_registrations")
          .delete({ count: "exact" })
          .eq("event_id", eventId)
          .eq("email", emailLower);
        summary.guest_event_registrations = count ?? 0;
      }

      // 4) event_form_submissions (formularz rejestracyjny eventu) — wszystkie
      //    rekordy dla pary event+email LUB event+partner_user_id; bez tego UI
      //    nadal pokazuje „Masz zarezerwowane miejsce — potwierdź e-mail".
      try {
        const filters: string[] = [];
        if (emailLower) filters.push(`email.eq.${emailLower}`);
        if (userId) filters.push(`partner_user_id.eq.${userId}`);
        if (filters.length > 0) {
          const { count } = await auth.supabaseAdmin
            .from("event_form_submissions")
            .delete({ count: "exact" })
            .eq("event_id", eventId)
            .or(filters.join(","));
          summary.event_form_submissions = count ?? 0;
        }
      } catch (e) {
        console.warn("[admin-delete-event-order] event_form_submissions cleanup failed", e);
        summary.event_form_submissions = `error: ${(e as any)?.message || e}`;
      }

      // 5) user_notifications powiązane z tym zamówieniem / tą rejestracją
      try {
        const { count: byOrder } = await auth.supabaseAdmin
          .from("user_notifications")
          .delete({ count: "exact" })
          .eq("metadata->>order_id", orderId);
        let total = byOrder ?? 0;
        if (emailLower) {
          const { count: byEmail } = await auth.supabaseAdmin
            .from("user_notifications")
            .delete({ count: "exact" })
            .eq("metadata->>event_id", eventId)
            .eq("metadata->>email", emailLower);
          total += byEmail ?? 0;
        }
        summary.user_notifications = total;
      } catch (e) {
        console.warn("[admin-delete-event-order] user_notifications cleanup failed", e);
        summary.user_notifications = `error: ${(e as any)?.message || e}`;
      }

      // 6) Sygnalizacja, jeśli e-mail jest na liście suppression — admin musi
      //    wiedzieć, że mimo wyczyszczenia śladu wiadomości nadal nie pójdą.
      if (emailLower) {
        try {
          const { data: supp } = await auth.supabaseAdmin
            .from("suppressed_emails")
            .select("email, reason")
            .eq("email", emailLower)
            .maybeSingle();
          if (supp) summary.suppressed_email_warning = `Email ${emailLower} jest na liście suppression (${(supp as any).reason || "?"}) — wiadomości mogą nie dochodzić.`;
        } catch (_) { /* tabela może nie istnieć w starszych projektach */ }
      }
    }

    return jsonResponse({ success: true, deleted: summary });
  } catch (e: any) {
    console.error("[admin-delete-event-order]", e);
    return jsonResponse({ error: e.message }, 500);
  }
});
