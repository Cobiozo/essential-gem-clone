import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verifyAdmin, corsHeaders, jsonResponse } from "../_shared/admin-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth: any = await verifyAdmin(req);
    if (!auth.ok) return auth.response;
    const { supabaseAdmin, userId } = auth;

    const body = await req.json().catch(() => ({}));
    const submissionId: string | undefined = body?.submissionId;
    const partnerUserId: string | null = body?.partnerUserId ?? null;

    if (!submissionId) return jsonResponse({ success: false, error: "submissionId required" }, 400);

    // Load submission
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("event_form_submissions")
      .select("id, event_id, form_id, first_name, last_name, email, phone, partner_user_id")
      .eq("id", submissionId)
      .maybeSingle();
    if (subErr || !sub) return jsonResponse({ success: false, error: "submission_not_found" }, 404);

    // Update submission
    const { error: updErr } = await supabaseAdmin
      .from("event_form_submissions")
      .update({ partner_user_id: partnerUserId })
      .eq("id", submissionId);
    if (updErr) throw updErr;

    // If a partner is assigned, ensure CRM contact (team_contacts) exists for that partner
    if (partnerUserId) {
      // Get event title for contact_reason text
      let eventTitle: string | null = null;
      if (sub.event_id) {
        const { data: ev } = await supabaseAdmin
          .from("paid_events")
          .select("title")
          .eq("id", sub.event_id)
          .maybeSingle();
        eventTitle = ev?.title ?? null;
      }

      // Dedup by (user_id, email)
      const { data: existing } = await supabaseAdmin
        .from("team_contacts")
        .select("id")
        .eq("user_id", partnerUserId)
        .eq("email", (sub.email || "").toLowerCase())
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from("team_contacts").insert({
          user_id: partnerUserId,
          first_name: sub.first_name,
          last_name: sub.last_name,
          email: (sub.email || "").toLowerCase(),
          phone_number: sub.phone,
          role: "client",
          contact_type: "private",
          contact_source: "event_invite",
          contact_reason: `Przypisany przez admina z rejestracji na: ${eventTitle || "wydarzenie"}`,
          is_active: true,
        });
      }
    }

    // Activity log
    await supabaseAdmin.from("admin_activity_log").insert({
      admin_user_id: userId,
      action_type: partnerUserId ? "event_form_partner_assigned" : "event_form_partner_unassigned",
      action_description: partnerUserId
        ? `Przypisano partnera do zgłoszenia ${sub.email}`
        : `Odpięto partnera od zgłoszenia ${sub.email}`,
      target_table: "event_form_submissions",
      target_id: submissionId,
      details: { partner_user_id: partnerUserId, email: sub.email },
    });

    return jsonResponse({ success: true });
  } catch (e: any) {
    console.error("[admin-assign-submission-partner]", e);
    return jsonResponse({ success: false, error: e?.message || "Internal error" }, 500);
  }
});
