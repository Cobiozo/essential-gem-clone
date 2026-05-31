import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BuyerData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface ReqBody {
  eventId: string;
  ticketId: string;
  buyer: BuyerData;
  consent: boolean;
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

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64Encode(str: string): string {
  const data = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...data));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

function buildConfirmEmail(opts: {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  ticketName: string;
  confirmUrl: string;
  bannerUrl?: string | null;
}): string {
  const bannerHtml = opts.bannerUrl
    ? `<div style="background:#000;"><img src="${escapeHtml(opts.bannerUrl)}" alt="${escapeHtml(opts.eventTitle)}" style="display:block;width:100%;max-width:620px;height:auto;margin:0 auto;" /></div>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    ${bannerHtml}
    <div style="padding:30px;">
      <h1 style="margin:0 0 10px;font-size:22px;color:#222;">Potwierdź swój adres email</h1>
      <p style="font-size:15px;">Cześć <strong>${escapeHtml(opts.firstName)}</strong>!</p>
      <p style="font-size:15px;line-height:1.6;">
        Dziękujemy za rezerwację bezpłatnego miejsca na wydarzenie <strong>${escapeHtml(opts.eventTitle)}</strong>${opts.eventDate ? ` (${escapeHtml(opts.eventDate)})` : ""}${opts.eventLocation ? `, ${escapeHtml(opts.eventLocation)}` : ""}.
      </p>
      <p style="font-size:15px;line-height:1.6;">
        Aby otrzymać <strong>bilet z kodem QR</strong>, prosimy o potwierdzenie adresu email klikając w poniższy przycisk:
      </p>
      <div style="margin:28px 0;text-align:center;">
        <a href="${escapeHtml(opts.confirmUrl)}" style="display:inline-block;background:#D4AF37;color:#fff;padding:16px 32px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">✅ Potwierdzam mój adres email</a>
      </div>
      <p style="font-size:13px;color:#666;line-height:1.6;">
        Po kliknięciu w link otrzymasz wiadomość zwrotną z biletem (PDF + kod QR), który będzie podstawą wejścia na wydarzenie.
      </p>
      <p style="font-size:12px;color:#999;line-height:1.6;margin-top:24px;">
        Jeśli przycisk nie działa, skopiuj ten link do przeglądarki:<br/>
        <span style="word-break:break-all;color:#555;">${escapeHtml(opts.confirmUrl)}</span>
      </p>
      <p style="font-size:12px;color:#999;line-height:1.6;margin-top:18px;">
        Link wygasa po 7 dniach. Jeśli nie rezerwowałeś/aś miejsca, zignoruj tę wiadomość.
      </p>
    </div>
    <div style="text-align:center;padding:18px;background:#fafafa;color:#999;font-size:12px;border-top:1px solid #eee;">
      © ${new Date().getFullYear()} Pure Life Center.
    </div>
  </div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: ReqBody = await req.json();
    const { eventId, ticketId, buyer, consent, refCode } = body;

    if (!eventId || !ticketId || !buyer?.email || !buyer?.firstName || !buyer?.lastName) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!consent) {
      return new Response(JSON.stringify({ error: "consent_required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Best-effort: identify logged-in user
    let currentUserId: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
      if (authHeader?.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.slice(7).trim();
        const supabaseAuth = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!
        );
        const { data: userData } = await supabaseAuth.auth.getUser(token);
        currentUserId = userData?.user?.id || null;
      }
    } catch { /* ignore */ }

    // Fetch ticket + event
    const { data: ticket, error: tErr } = await supabase
      .from("paid_event_tickets")
      .select("*, paid_events(id, title, slug, event_date, location, banner_url, is_free, max_tickets, tickets_sold)")
      .eq("id", ticketId)
      .eq("event_id", eventId)
      .eq("is_active", true)
      .single();

    if (tErr || !ticket) {
      return new Response(JSON.stringify({ error: "ticket_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = (ticket as any).paid_events;
    if (!event?.is_free) {
      return new Response(JSON.stringify({ error: "event_not_free" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lowerEmail = buyer.email.trim().toLowerCase();

    // Check duplicate (same email/event, not cancelled)
    const { data: existingOrder } = await supabase
      .from("paid_event_orders")
      .select("id, status, email_confirmed_at")
      .eq("event_id", eventId)
      .eq("email", lowerEmail)
      .in("status", ["awaiting_email_confirmation", "confirmed", "paid"])
      .limit(1)
      .maybeSingle();

    if (existingOrder) {
      return new Response(JSON.stringify({
        error: "already_registered",
        message: existingOrder.email_confirmed_at
          ? "Ten adres email ma już bilet na to wydarzenie. Sprawdź skrzynkę."
          : "Wysłaliśmy już email z potwierdzeniem na ten adres. Sprawdź skrzynkę (także folder Spam).",
      }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = generateToken();

    const { data: order, error: orderErr } = await supabase
      .from("paid_event_orders")
      .insert({
        event_id: eventId,
        ticket_id: ticketId,
        user_id: currentUserId,
        email: lowerEmail,
        first_name: buyer.firstName.trim(),
        last_name: buyer.lastName.trim(),
        phone: buyer.phone?.trim() || null,
        quantity: 1,
        total_amount: 0,
        status: "awaiting_email_confirmation",
        payment_provider: "free",
        email_confirmation_token: token,
        email_confirmation_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr) {
      console.error("[register-free-event-order] order insert failed", orderErr);
      return new Response(JSON.stringify({ error: orderErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve partner via refCode (best-effort, for CRM)
    let partnerUserId: string | null = null;
    if (refCode) {
      const { data: link } = await supabase
        .from("paid_event_partner_links")
        .select("partner_user_id")
        .eq("ref_code", refCode)
        .maybeSingle();
      partnerUserId = link?.partner_user_id ?? null;
    }

    const publicBaseUrl = Deno.env.get("PUBLIC_EMAIL_LINK_BASE_URL")
      || Deno.env.get("PUBLIC_SITE_URL")
      || "https://purelife.info.pl";
    const confirmUrl = `${publicBaseUrl}/free-event/confirm/${token}`;

    const eventDateStr = event.event_date
      ? new Date(event.event_date).toLocaleDateString("pl-PL", {
          day: "2-digit", month: "long", year: "numeric",
        })
      : "";

    // Send confirmation email (best-effort, in background)
    const sideEffects = (async () => {
      try {
        const { data: smtp } = await supabase
          .from("smtp_settings")
          .select("*")
          .eq("is_active", true)
          .maybeSingle();

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

          const html = buildConfirmEmail({
            firstName: buyer.firstName,
            eventTitle: event.title,
            eventDate: eventDateStr,
            eventLocation: event.location || '',
            ticketName: ticket.name,
            confirmUrl,
            bannerUrl: event.banner_url,
          });
          await sendSmtp(smtpSettings, lowerEmail, `Potwierdź swój adres email – ${event.title}`, html);
          console.log(`[register-free-event-order] confirm email sent to ${lowerEmail}`);
        } else {
          console.warn("[register-free-event-order] no active SMTP settings");
        }
      } catch (mailErr) {
        console.error("[register-free-event-order] email send failed", mailErr);
      }

      // CRM mirror (best-effort)
      if (partnerUserId) {
        try {
          const noteLine = `🎟️ ${new Date().toLocaleString("pl-PL")} – Rezerwacja bezpłatna „${event.title}" (oczekuje na potwierdzenie email)`;
          const { data: existing } = await supabase
            .from("team_contacts")
            .select("id, notes")
            .eq("user_id", partnerUserId)
            .eq("email", lowerEmail)
            .maybeSingle();
          if (existing) {
            const newNotes = existing.notes ? `${existing.notes}\n${noteLine}` : noteLine;
            await supabase.from("team_contacts")
              .update({ notes: newNotes, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
          } else {
            await supabase.from("team_contacts").insert({
              user_id: partnerUserId,
              first_name: buyer.firstName.trim(),
              last_name: buyer.lastName.trim(),
              email: lowerEmail,
              phone_number: buyer.phone?.trim() || null,
              role: "client",
              contact_source: "paid_event_free",
              notes: noteLine,
            });
          }
        } catch (crmErr) {
          console.error("[register-free-event-order] CRM upsert failed", crmErr);
        }
      }
    })();

    try {
      // @ts-ignore EdgeRuntime is provided by Supabase
      EdgeRuntime.waitUntil(sideEffects);
    } catch {
      sideEffects.catch((e) => console.error("side-effects error", e));
    }

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      email: lowerEmail,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[register-free-event-order] fatal", err);
    return new Response(JSON.stringify({ error: err.message || "internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
