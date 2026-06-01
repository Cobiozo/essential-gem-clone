import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verifyAdmin, corsHeaders, jsonResponse } from "../_shared/admin-auth.ts";

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

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
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
      <h1 style="margin:0 0 10px;font-size:22px;color:#222;">Potwierdzenie adresu e-mail i rezerwacji miejsca na wydarzenie</h1>
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
    </div>
    <div style="text-align:center;padding:18px;background:#fafafa;color:#999;font-size:12px;border-top:1px solid #eee;">
      © ${new Date().getFullYear()} Pure Life Center.
    </div>
  </div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return auth.response;

    const { orderId } = await req.json();
    if (!orderId) return jsonResponse({ error: "orderId required" }, 400);

    const supabase = auth.supabaseAdmin;

    const { data: order, error: orderErr } = await supabase
      .from("paid_event_orders")
      .select("id, email, first_name, email_confirmation_token, event_id, paid_events(title, event_date, location, banner_url)")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) return jsonResponse({ error: "order_not_found" }, 404);

    let token = (order as any).email_confirmation_token as string | null;
    if (!token) {
      token = generateToken();
      await supabase
        .from("paid_event_orders")
        .update({
          email_confirmation_token: token,
          email_confirmation_sent_at: new Date().toISOString(),
          status: "awaiting_email_confirmation",
        })
        .eq("id", orderId);
    } else {
      await supabase
        .from("paid_event_orders")
        .update({ email_confirmation_sent_at: new Date().toISOString() })
        .eq("id", orderId);
    }

    const event: any = (order as any).paid_events;
    const publicBaseUrl = Deno.env.get("PUBLIC_EMAIL_LINK_BASE_URL")
      || Deno.env.get("PUBLIC_SITE_URL")
      || "https://purelife.info.pl";
    const confirmUrl = `${publicBaseUrl}/free-event/confirm/${token}`;
    const eventDateStr = event?.event_date
      ? new Date(event.event_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" })
      : "";

    const { data: smtp } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (!smtp) return jsonResponse({ error: "no_smtp_settings" }, 500);

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
      firstName: (order as any).first_name || "",
      eventTitle: event?.title || "",
      eventDate: eventDateStr,
      eventLocation: event?.location || "",
      confirmUrl,
      bannerUrl: event?.banner_url,
    });

    await sendSmtp(smtpSettings, (order as any).email, `Potwierdzenie adresu e-mail i rezerwacji – ${event?.title || ""}`, html);

    return jsonResponse({ success: true });
  } catch (e: any) {
    console.error("[admin-resend-event-order-confirmation]", e);
    return jsonResponse({ error: e.message }, 500);
  }
});
