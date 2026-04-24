import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logoUrl = "https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png";
const eqologyLogoUrl = (Deno.env.get("PUBLIC_SITE_URL") || "https://purelife.lovable.app") + "/lovable-uploads/eqology-ibp-logo.png";

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

function buildEmail(opts: {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  ticketName: string;
  amountFormatted: string;
  transferDetails: string;
  ticketCode: string;
}): string {
  const transferHtml = `<pre style="background:#fdf8ec;border-left:4px solid #D4AF37;padding:18px 22px;border-radius:8px;margin:20px 0;font-family:'Courier New',monospace;font-size:13px;white-space:pre-wrap;color:#333;">${escapeHtml(opts.transferDetails)}</pre>`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="padding:24px;background:linear-gradient(135deg,#D4AF37,#F5E6A3,#D4AF37);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="middle" style="padding:0 12px;">
            <img src="${logoUrl}" alt="Pure Life" style="max-width:150px;height:auto;display:inline-block;vertical-align:middle;" />
          </td>
          <td align="center" valign="middle" width="1" style="border-left:1px solid rgba(0,0,0,0.18);height:40px;"></td>
          <td align="center" valign="middle" style="padding:0 12px;">
            <img src="${eqologyLogoUrl}" alt="Eqology Independent Business Partner" style="max-width:150px;height:auto;display:inline-block;vertical-align:middle;" />
          </td>
        </tr>
      </table>
    </div>
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

      <h3 style="font-size:16px;color:#D4AF37;margin:24px 0 8px;">💳 Dane do przelewu</h3>
      ${transferHtml}

      <p style="font-size:14px;line-height:1.6;color:#555;">
        Po zaksięgowaniu wpłaty wyślemy do Ciebie email z biletem i kodem QR potrzebnym do wejścia na wydarzenie.
      </p>
      <p style="font-size:13px;color:#888;margin-top:20px;">
        W razie pytań prosimy o kontakt mailowy z osobą zapraszającą lub organizatorem.
      </p>
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

    // Fetch event + ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from("paid_event_tickets")
      .select("*, paid_events(id, title, slug, event_date, transfer_payment_details, payment_method_transfer)")
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

    // Resolve partner via ref code (best-effort)
    let partnerUserId: string | null = null;
    if (refCode) {
      const { data: link } = await supabase
        .from("paid_event_partner_links")
        .select("partner_user_id")
        .eq("ref_code", refCode)
        .maybeSingle();
      partnerUserId = link?.partner_user_id ?? null;
    }

    const ticketCode = generateTicketCode();
    const totalAmount = Number(ticket.price_pln) || 0; // grosze

    // Insert order
    const { data: order, error: orderErr } = await supabase
      .from("paid_event_orders")
      .insert({
        event_id: eventId,
        ticket_id: ticketId,
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

    // Send email (best-effort — don't fail the whole order if SMTP misbehaves)
    try {
      const { data: smtp } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (smtp) {
        const html = buildEmail({
          firstName: buyer.firstName,
          eventTitle: event.title,
          eventDate: eventDateStr,
          ticketName: ticket.name,
          amountFormatted,
          transferDetails,
          ticketCode,
        });
        await sendSmtp(
          smtp as SmtpSettings,
          buyer.email,
          `Rezerwacja przyjęta – ${event.title} – dane do przelewu`,
          html
        );
      } else {
        console.warn("No active SMTP settings — skipping email");
      }
    } catch (mailErr) {
      console.error("email send failed", mailErr);
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
