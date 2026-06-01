import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verifyAdmin, corsHeaders, jsonResponse } from "../_shared/admin-auth.ts";

interface Body {
  orderId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  resetConfirmation?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return auth.response;

    const { orderId, firstName, lastName, email, phone, resetConfirmation } = (await req.json()) as Body;
    if (!orderId) return jsonResponse({ error: "orderId required" }, 400);

    const updates: Record<string, any> = {};
    if (typeof firstName === "string") updates.first_name = firstName.trim();
    if (typeof lastName === "string") updates.last_name = lastName.trim();
    if (typeof email === "string") updates.email = email.trim().toLowerCase();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
    if (resetConfirmation) {
      updates.email_confirmed_at = null;
      updates.status = "awaiting_email_confirmation";
    }

    if (Object.keys(updates).length === 0) {
      return jsonResponse({ error: "no_fields" }, 400);
    }

    const { error } = await auth.supabaseAdmin
      .from("paid_event_orders")
      .update(updates)
      .eq("id", orderId);
    if (error) return jsonResponse({ error: error.message }, 500);

    // Best-effort: zsynchronizuj pierwszego attendee (seat 1) jeśli istnieje
    if (updates.first_name || updates.last_name || updates.email || updates.phone !== undefined) {
      const attUpd: Record<string, any> = {};
      if (updates.first_name) attUpd.first_name = updates.first_name;
      if (updates.last_name) attUpd.last_name = updates.last_name;
      if (updates.email) attUpd.email = updates.email;
      if (updates.phone !== undefined) attUpd.phone = updates.phone;
      try {
        await auth.supabaseAdmin
          .from("paid_event_order_attendees")
          .update(attUpd)
          .eq("order_id", orderId)
          .eq("seat_index", 1);
      } catch (_) { /* ignore */ }
    }

    return jsonResponse({ success: true });
  } catch (e: any) {
    console.error("[admin-update-event-order]", e);
    return jsonResponse({ error: e.message }, 500);
  }
});
