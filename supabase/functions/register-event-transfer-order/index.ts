import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Branding logos celowo nieużywane — e-mail rezerwacji pokazuje wyłącznie banner wydarzenia.

interface BuyerData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface ReqBody {
  eventId: string;
  ticketId: string;
  buyer: BuyerData;
  acceptMarketing?: boolean;
  refCode?: string | null;
}

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  encryption_type: string;
  sender_email: string;
  sender_name: string;
}

interface ContactPerson {
  role: 'upline' | 'inviter';
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 12; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function base64Encode(str: string): string {
  const data = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...data));
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
  ]);
}

async function sendSmtp(s: SmtpSettings, to: string, subject: string, html: string) {
  let conn: Deno.TcpConn | Deno.TlsConn;
  if (s.encryption_type === "ssl") {
    conn = await withTimeout(Deno.connectTls({ hostname: s.smtp_host, port: s.smtp_port }), 15000, "TLS timeout");
  } else {
    conn = await withTimeout(Deno.connect({ hostname: s.smtp_host, port: s.smtp_port }), 15000, "TCP timeout");
  }
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const read = async () => {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return n ? dec.decode(buf.subarray(0, n)) : "";
  };
  const send = async (cmd: string) => {
    await conn.write(enc.encode(cmd + "\r\n"));
    return await read();
  };
  try {
    await read();
    const senderDomain = s.sender_email.split("@")[1] || "localhost";
    await send(`EHLO ${senderDomain}`);
    if (s.encryption_type === "starttls") {
      await send("STARTTLS");
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: s.smtp_host });
      await send(`EHLO ${senderDomain}`);
    }
    await send("AUTH LOGIN");
    await send(btoa(s.smtp_username));
    const auth = await send(btoa(s.smtp_password));
    if (!auth.includes("235")) throw new Error(`Auth failed: ${auth}`);
    await send(`MAIL FROM:<${s.sender_email}>`);
    await send(`RCPT TO:<${to}>`);
    await send("DATA");
    const boundary = `b_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${senderDomain}>`;
    const plain = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const msg = [
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `From: "${s.sender_name}" <${s.sender_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(plain),
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(html),
      ``,
      `--${boundary}--`,
      `.`,
    ].join("\r\n");
    const r = await send(msg);
    if (!r.includes("250")) throw new Error(`Send failed: ${r}`);
    await send("QUIT");
  } finally {
    try { conn.close(); } catch (_) { /* ignore */ }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildContactSection(contact: ContactPerson | null): string {
  if (!contact || (!contact.firstName && !contact.lastName && !contact.email && !contact.phone)) {
    return `<p style="font-size:13px;color:#888;margin-top:20px;">
        W razie pytań prosimy o kontakt z organizatorem.
      </p>`;
  }

  const heading = contact.role === 'upline'
    ? '👤 Twój opiekun w Pure Life'
    : '👤 Osoba zapraszająca';
  const intro = contact.role === 'upline'
    ? 'W razie pytań do tego wydarzenia skontaktuj się ze swoim opiekunem:'
    : 'W razie dodatkowych pytań skontaktuj się bezpośrednio z osobą, która Cię zaprosiła:';

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
  const rows: string[] = [];
  if (fullName) {
    rows.push(`<div style="font-size:15px;font-weight:600;color:#222;margin-bottom:6px;">${escapeHtml(fullName)}</div>`);
  }
  if (contact.email) {
    rows.push(`<div style="font-size:14px;margin:2px 0;">📧 <a href="mailto:${escapeHtml(contact.email)}" style="color:#D4AF37;text-decoration:none;">${escapeHtml(contact.email)}</a></div>`);
  }
  if (contact.phone) {
    const telHref = contact.phone.replace(/\s+/g, '');
    rows.push(`<div style="font-size:14px;margin:2px 0;">📞 <a href="tel:${escapeHtml(telHref)}" style="color:#D4AF37;text-decoration:none;">${escapeHtml(contact.phone)}</a></div>`);
  }

  return `
    <div style="margin:28px 0 0;padding:18px 20px;background:#fdf8ec;border:1px solid #f0e2b6;border-radius:8px;">
      <div style="font-size:14px;font-weight:700;color:#8a6d1c;margin-bottom:8px;">${heading}</div>
      <div style="font-size:13px;color:#555;margin-bottom:10px;">${intro}</div>
      ${rows.join('\n')}
    </div>`;
}

function buildEmail(opts: {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  ticketName: string;
  amountFormatted: string;
  transferDetails: string;
  ticketCode: string;
  bannerUrl?: string | null;
  contact: ContactPerson | null;
  confirmUrl?: string | null;
  cancelUrl?: string | null;
}): string {
  const transferHtml = `<pre style="background:#fdf8ec;border-left:4px solid #D4AF37;padding:18px 22px;border-radius:8px;margin:20px 0;font-family:'Courier New',monospace;font-size:13px;white-space:pre-wrap;color:#333;">${escapeHtml(opts.transferDetails)}</pre>`;

  // Banner wydarzenia jako jedyny nagłówek graficzny (bez złotego paska Pure Life / Eqology).
  const bannerHtml = opts.bannerUrl
    ? `<div style="background:#000;">
         <img src="${escapeHtml(opts.bannerUrl)}" alt="${escapeHtml(opts.eventTitle)}" style="display:block;width:100%;max-width:620px;height:auto;margin:0 auto;" />
       </div>`
    : '';

  const confirmCtaHtml = opts.confirmUrl
    ? `<div style="margin:24px 0;text-align:center;">
         <a href="${escapeHtml(opts.confirmUrl)}" style="display:inline-block;background:#D4AF37;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">✅ Potwierdzam otrzymanie wiadomości</a>
       </div>`
    : '';

  const cancelLinkHtml = opts.cancelUrl
    ? `<p style="text-align:center;font-size:13px;color:#888;margin:18px 0 0;">
         Chcesz anulować zgłoszenie? <a href="${escapeHtml(opts.cancelUrl)}" style="color:#c0392b;">Anuluj rejestrację</a>
       </p>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    ${bannerHtml}
    <div style="padding:30px;">
      <h1 style="margin:0 0 10px;font-size:22px;color:#222;">Rezerwacja przyjęta</h1>
      <p style="font-size:15px;">Cześć <strong>${escapeHtml(opts.firstName)}</strong>!</p>
      <p style="font-size:15px;line-height:1.6;">
        Dziękujemy za rejestrację na wydarzenie <strong>${escapeHtml(opts.eventTitle)}</strong>${opts.eventDate ? ` (${escapeHtml(opts.eventDate)})` : ""}.
      </p>
      <p style="font-size:15px;line-height:1.6;">
        Bilet: <strong>${escapeHtml(opts.ticketName)}</strong><br/>
        Kwota do zapłaty: <strong style="color:#D4AF37;font-size:18px;">${escapeHtml(opts.amountFormatted)}</strong><br/>
        Numer rezerwacji: <code style="background:#f3f3f3;padding:2px 6px;border-radius:4px;">${escapeHtml(opts.ticketCode)}</code>
      </p>

      ${confirmCtaHtml}

      <h3 style="font-size:16px;color:#D4AF37;margin:24px 0 8px;">💳 Dane do przelewu</h3>
      ${transferHtml}

      <p style="font-size:14px;line-height:1.6;color:#555;">
        Po zaksięgowaniu wpłaty wyślemy do Ciebie email z biletem i/lub kodem QR potrzebnym do wejścia na wydarzenie.
      </p>

      ${buildContactSection(opts.contact)}

      ${cancelLinkHtml}
    </div>
    <div style="text-align:center;padding:18px;background:#fafafa;color:#999;font-size:12px;border-top:1px solid #eee;">
      © ${new Date().getFullYear()} Pure Life Center. Wszelkie prawa zastrzeżone.
    </div>
  </div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: ReqBody = await req.json();
    const { eventId, ticketId, buyer, refCode } = body;

    if (!eventId || !ticketId || !buyer?.email || !buyer?.firstName || !buyer?.lastName) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try to identify the logged-in user from the Authorization header (best-effort).
    let currentUserId: string | null = null;
    let currentUserProfile: any = null;
    try {
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.slice(7).trim();
        if (token) {
          const supabaseAuth = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!
          );
          const { data: userData } = await supabaseAuth.auth.getUser(token);
          if (userData?.user?.id) {
            currentUserId = userData.user.id;
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name, email, phone_number, upline_eq_id, upline_first_name, upline_last_name")
              .eq("id", currentUserId)
              .maybeSingle();
            currentUserProfile = profile || null;
            console.log(`[auth] logged-in user resolved: ${currentUserId}`);
          }
        }
      }
    } catch (authErr) {
      console.warn("[auth] could not resolve user from Authorization header", authErr);
    }

    // Fetch event + ticket (include banner_url for the email header)
    const { data: ticket, error: ticketErr } = await supabase
      .from("paid_event_tickets")
      .select("*, paid_events(id, title, slug, event_date, transfer_payment_details, payment_method_transfer, banner_url)")
      .eq("id", ticketId)
      .eq("event_id", eventId)
      .eq("is_active", true)
      .single();

    if (ticketErr || !ticket) {
      return new Response(JSON.stringify({ error: "ticket_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = ticket.paid_events as any;
    if (!event.payment_method_transfer) {
      return new Response(JSON.stringify({ error: "transfer_disabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transferDetails = (event.transfer_payment_details || "").trim();
    if (!transferDetails) {
      return new Response(JSON.stringify({ error: "transfer_details_missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve partner via ref code (best-effort) + load partner profile for contact section
    let partnerUserId: string | null = null;
    let partnerProfile: any = null;
    if (refCode) {
      const { data: link } = await supabase
        .from("paid_event_partner_links")
        .select("partner_user_id")
        .eq("ref_code", refCode)
        .maybeSingle();
      partnerUserId = link?.partner_user_id ?? null;

      if (partnerUserId) {
        const { data: pp } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, phone_number")
          .eq("id", partnerUserId)
          .maybeSingle();
        partnerProfile = pp || null;
      }
    }

    const ticketCode = generateTicketCode();
    const totalAmount = Number(ticket.price_pln) || 0; // grosze

    // Insert order — now stores user_id when the buyer is logged in
    const { data: order, error: orderErr } = await supabase
      .from("paid_event_orders")
      .insert({
        event_id: eventId,
        ticket_id: ticketId,
        user_id: currentUserId,
        email: buyer.email.trim().toLowerCase(),
        first_name: buyer.firstName.trim(),
        last_name: buyer.lastName.trim(),
        phone: buyer.phone?.trim() || null,
        quantity: 1,
        total_amount: totalAmount,
        status: "awaiting_transfer",
        payment_provider: "transfer",
        ticket_code: ticketCode,
      })
      .select()
      .single();

    if (orderErr) {
      console.error("order insert failed", orderErr);
      return new Response(JSON.stringify({ error: orderErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mirror this order into event_form_submissions so it shows up in the
    // admin "Formularze → Zgłoszenia" view (Goście / Partnerzy tabs).
    // Best-effort: never fail the order if mirroring fails.
    try {
      const { data: regForm } = await supabase
        .from("event_registration_forms")
        .select("id")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (regForm?.id) {
        // Resolve partner_link_id + partner_user_id:
        //  1. via refCode + form_id
        //  2. fallback for logged-in users: their own link for this form
        let mirrorPartnerLinkId: string | null = null;
        let mirrorPartnerUserId: string | null = partnerUserId;

        if (refCode) {
          const { data: link } = await supabase
            .from("paid_event_partner_links")
            .select("id, partner_user_id")
            .eq("ref_code", refCode)
            .eq("form_id", regForm.id)
            .eq("is_active", true)
            .maybeSingle();
          if (link) {
            mirrorPartnerLinkId = link.id;
            mirrorPartnerUserId = link.partner_user_id;
          }
        }

        // Fallback: logged-in user is a partner who registered themselves
        if (!mirrorPartnerLinkId && currentUserId) {
          const { data: ownLink } = await supabase
            .from("paid_event_partner_links")
            .select("id, partner_user_id")
            .eq("partner_user_id", currentUserId)
            .eq("form_id", regForm.id)
            .eq("is_active", true)
            .maybeSingle();
          if (ownLink) {
            mirrorPartnerLinkId = ownLink.id;
            mirrorPartnerUserId = ownLink.partner_user_id;
          } else {
            // Even if no link row exists, keep attribution to the user
            mirrorPartnerUserId = currentUserId;
          }
        }

        // One submission per (form_id, email). Multiple ticket orders by the
        // same person never create new submission rows — we just append the
        // new order_id to submitted_data.order_ids on the existing row.
        const lowerEmail = buyer.email.trim().toLowerCase();
        const { data: existingSub } = await supabase
          .from("event_form_submissions")
          .select("id, submitted_data, confirmation_token, cancellation_token")
          .eq("form_id", regForm.id)
          .eq("email", lowerEmail)
          .maybeSingle();

        if (existingSub) {
          // Append order_id to the existing submission, no counter increment.
          const existingData: any = existingSub.submitted_data || {};
          const existingIds: string[] = Array.isArray(existingData.order_ids)
            ? existingData.order_ids.filter((v: any) => typeof v === "string")
            : (existingData.order_id ? [String(existingData.order_id)] : []);
          if (!existingIds.includes(order.id)) existingIds.push(order.id);
          const { error: updErr } = await supabase
            .from("event_form_submissions")
            .update({
              submitted_data: {
                ...existingData,
                source: existingData.source || "ticket_order",
                order_ids: existingIds,
                last_order_id: order.id,
                last_ticket_id: ticketId,
                last_total_amount: totalAmount,
              },
            })
            .eq("id", existingSub.id);
          if (updErr) {
            console.error("[mirror] event_form_submissions update failed", updErr);
          }
          mirrorConfirmationToken = (existingSub as any).confirmation_token ?? null;
          mirrorCancellationToken = (existingSub as any).cancellation_token ?? null;
        } else {
          const { data: insertedSub, error: subErr } = await supabase
            .from("event_form_submissions")
            .insert({
              form_id: regForm.id,
              event_id: eventId,
              first_name: buyer.firstName.trim() || null,
              last_name: buyer.lastName.trim() || null,
              email: lowerEmail,
              phone: buyer.phone?.trim() || null,
              partner_user_id: mirrorPartnerUserId,
              partner_link_id: mirrorPartnerLinkId,
              payment_status: "pending",
              email_status: "sent",
              submitted_data: {
                source: "ticket_order",
                order_id: order.id,
                order_ids: [order.id],
                ticket_id: ticketId,
                quantity: 1,
                total_amount: totalAmount,
              },
            })
            .select("id, confirmation_token, cancellation_token")
            .maybeSingle();
          if (subErr) {
            // Likely a race against the new unique index — treat as already-mirrored.
            console.error("[mirror] event_form_submissions insert failed", subErr);
            // Try fetching the row that won the race so we still have tokens for the email.
            const { data: raceRow } = await supabase
              .from("event_form_submissions")
              .select("confirmation_token, cancellation_token")
              .eq("form_id", regForm.id)
              .eq("email", lowerEmail)
              .maybeSingle();
            mirrorConfirmationToken = (raceRow as any)?.confirmation_token ?? null;
            mirrorCancellationToken = (raceRow as any)?.cancellation_token ?? null;
          } else {
            mirrorConfirmationToken = (insertedSub as any)?.confirmation_token ?? null;
            mirrorCancellationToken = (insertedSub as any)?.cancellation_token ?? null;
            if (mirrorPartnerLinkId) {
              await supabase.rpc("increment_partner_link_submission" as any, {
                _link_id: mirrorPartnerLinkId,
              }).then(() => {}, async () => {
                // RPC may not exist — fall back to manual increment
                const { data: cur } = await supabase
                  .from("paid_event_partner_links")
                  .select("submission_count")
                  .eq("id", mirrorPartnerLinkId)
                  .maybeSingle();
                await supabase
                  .from("paid_event_partner_links")
                  .update({ submission_count: (cur?.submission_count ?? 0) + 1 })
                  .eq("id", mirrorPartnerLinkId);
              });
            }
          }
        }
      }
    } catch (mirrorErr) {
      console.error("[mirror] unexpected error mirroring order to event_form_submissions", mirrorErr);
    }

    // Build the contact-person block:
    //  - logged-in user → use upline from profiles (look up full profile by upline_eq_id if possible)
    //  - guest with refCode → use partner profile
    //  - fallback → none
    let contact: ContactPerson | null = null;
    if (currentUserId && currentUserProfile) {
      let uplineProfile: any = null;
      const uplineEqId = (currentUserProfile as any).upline_eq_id;
      if (uplineEqId) {
        const { data: up } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, phone_number")
          .eq("eq_id", uplineEqId)
          .maybeSingle();
        uplineProfile = up || null;
      }
      const upFirst = uplineProfile?.first_name || (currentUserProfile as any).upline_first_name || null;
      const upLast = uplineProfile?.last_name || (currentUserProfile as any).upline_last_name || null;
      if (upFirst || upLast || uplineProfile?.email || uplineProfile?.phone_number) {
        contact = {
          role: 'upline',
          firstName: upFirst,
          lastName: upLast,
          email: uplineProfile?.email || null,
          phone: uplineProfile?.phone_number || null,
        };
      }
    } else if (partnerProfile) {
      contact = {
        role: 'inviter',
        firstName: partnerProfile.first_name || null,
        lastName: partnerProfile.last_name || null,
        email: partnerProfile.email || null,
        phone: partnerProfile.phone_number || null,
      };
    }

    // Format event date (PL)
    const eventDateStr = event.event_date
      ? new Date(event.event_date).toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "";

    const amountFormatted = new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalAmount / 100);

    // Run side-effects (email, notifications, CRM upsert) in the background.
    const sideEffects = (async () => {
      // Send email (best-effort)
      try {
        const { data: smtp, error: smtpErr } = await supabase
          .from("smtp_settings")
          .select("*")
          .eq("is_active", true)
          .maybeSingle();

        if (smtpErr) {
          console.error("[email] failed to load SMTP settings", smtpErr);
        }

        if (smtp) {
          const smtpSettings: SmtpSettings = {
            smtp_host: (smtp as any).smtp_host,
            smtp_port: (smtp as any).smtp_port,
            smtp_username: (smtp as any).smtp_username,
            smtp_password: (smtp as any).smtp_password,
            encryption_type: (smtp as any).smtp_encryption,
            sender_email: (smtp as any).sender_email,
            sender_name: (smtp as any).sender_name,
          };

          console.log(
            `[email] sending to ${buyer.email} via ${smtpSettings.smtp_host}:${smtpSettings.smtp_port} (${smtpSettings.encryption_type})`
          );

          const html = buildEmail({
            firstName: buyer.firstName,
            eventTitle: event.title,
            eventDate: eventDateStr,
            ticketName: ticket.name,
            amountFormatted,
            transferDetails,
            ticketCode,
            bannerUrl: event.banner_url,
            contact,
          });
          await sendSmtp(
            smtpSettings,
            buyer.email,
            `Rezerwacja przyjęta – ${event.title} – dane do przelewu`,
            html
          );
          console.log(`[email] sent successfully to ${buyer.email}`);
        } else {
          console.warn("[email] No active SMTP settings — skipping email");
        }
      } catch (mailErr) {
        console.error("[email] send failed", mailErr instanceof Error ? mailErr.message : mailErr);
      }

      // Notify all admins + inviting partner
      try {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        const recipients = new Set<string>();
        (admins || []).forEach((a: any) => recipients.add(a.user_id));
        if (partnerUserId) recipients.add(partnerUserId);

        const notifications = Array.from(recipients).map((uid) => ({
          user_id: uid,
          notification_type: "event_order_pending",
          source_module: "paid_events",
          title: "📥 Nowa rezerwacja oczekująca na przelew",
          message: `${buyer.firstName} ${buyer.lastName} zarezerwował bilet "${ticket.name}" na "${event.title}" (${amountFormatted}).`,
          link: `/admin/paid-events`,
          metadata: {
            order_id: order.id,
            event_id: eventId,
            ticket_id: ticketId,
            ticket_code: ticketCode,
            buyer_user_id: currentUserId,
          },
        }));

        if (notifications.length > 0) {
          await supabase.from("user_notifications").insert(notifications);
        }
      } catch (notifyErr) {
        console.error("notification insert failed", notifyErr);
      }

      // Upsert into partner's CRM (team_contacts) — best-effort
      if (partnerUserId) {
        try {
          const noteLine = `📥 ${new Date().toLocaleString("pl-PL")} – Zarezerwował bilet "${ticket.name}" na "${event.title}" (${amountFormatted}, oczekuje na przelew, kod: ${ticketCode})`;

          const { data: existing } = await supabase
            .from("team_contacts")
            .select("id, notes")
            .eq("user_id", partnerUserId)
            .eq("email", buyer.email.trim().toLowerCase())
            .maybeSingle();

          if (existing) {
            const newNotes = existing.notes ? `${existing.notes}\n${noteLine}` : noteLine;
            await supabase
              .from("team_contacts")
              .update({ notes: newNotes, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
          } else {
            await supabase.from("team_contacts").insert({
              user_id: partnerUserId,
              first_name: buyer.firstName.trim(),
              last_name: buyer.lastName.trim(),
              email: buyer.email.trim().toLowerCase(),
              phone_number: buyer.phone?.trim() || null,
              role: "client",
              contact_source: "paid_event_transfer",
              notes: noteLine,
            });
          }
        } catch (crmErr) {
          console.error("CRM upsert failed", crmErr);
        }
      }
    })();

    try {
      // @ts-ignore — EdgeRuntime is provided by the Supabase edge runtime
      EdgeRuntime.waitUntil(sideEffects);
    } catch (_) {
      sideEffects.catch((e) => console.error("side-effects error", e));
    }

    return new Response(
      JSON.stringify({ success: true, orderId: order.id, ticketCode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("register-event-transfer-order fatal", err);
    return new Response(JSON.stringify({ error: err.message || "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
