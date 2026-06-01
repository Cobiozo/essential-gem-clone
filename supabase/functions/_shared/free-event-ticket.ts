// Shared helper: generate PDF + send free-event ticket email for a paid_event_orders row.
// Used by confirm-free-event-reservation and confirm-event-form-email.

export interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  encryption_type: string;
  sender_email: string;
  sender_name: string;
}

export function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 12; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function base64Encode(str: string): string {
  const data = new TextEncoder().encode(str);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < data.length; i += CHUNK) {
    binary += String.fromCharCode(...data.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function escapeHtml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
  ]);
}

export async function sendSmtp(
  s: SmtpSettings,
  to: string,
  subject: string,
  html: string,
  attachment?: { filename: string; bytes: Uint8Array; contentType: string },
  plainTextOverride?: string,
) {
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
    const plain = plainTextOverride || "Twoj bilet znajduje sie w zalaczniku tej wiadomosci (PDF z kodem QR).";

    const parts: string[] = [
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `From: "${s.sender_name}" <${s.sender_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
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
    ];

    if (attachment) {
      let b64 = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < attachment.bytes.length; i += CHUNK) {
        b64 += String.fromCharCode(...attachment.bytes.subarray(i, i + CHUNK));
      }
      const encoded = btoa(b64);
      const lines = encoded.match(/.{1,76}/g)?.join("\r\n") || encoded;
      parts.push(
        `--${boundary}`,
        `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        ``,
        lines,
        ``,
      );
    }

    parts.push(`--${boundary}--`, `.`);
    // Send DATA payload; use a long timeout for read since server processes large attachment
    await conn.write(enc.encode(parts.join("\r\n") + "\r\n"));
    const r = await withTimeout(read(), 180000, "DATA read timeout");
    if (!r.includes("250")) throw new Error(`Send failed: ${r}`);
    await send("QUIT");
  } finally {
    try { conn.close(); } catch (_) { /* ignore */ }
  }
}

export function buildTicketEmail(opts: {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  ticketName: string;
  ticketCode: string;
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
      <h1 style="margin:0 0 10px;font-size:22px;color:#222;">🎟️ Twój bilet jest gotowy!</h1>
      <p style="font-size:15px;">Cześć <strong>${escapeHtml(opts.firstName)}</strong>!</p>
      <p style="font-size:15px;line-height:1.6;">
        Dziękujemy za potwierdzenie adresu email. Twój bezpłatny bilet na wydarzenie <strong>${escapeHtml(opts.eventTitle)}</strong>${opts.eventDate ? ` (${escapeHtml(opts.eventDate)})` : ""}${opts.eventLocation ? `, ${escapeHtml(opts.eventLocation)}` : ""} jest gotowy.
      </p>
      <div style="background:#fdf8ec;border:1px solid #f0e2b6;border-radius:8px;padding:18px;margin:20px 0;text-align:center;">
        <div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Numer biletu</div>
        <div style="font-family:monospace;font-size:22px;font-weight:bold;color:#8a6d1c;letter-spacing:2px;margin-top:6px;">${escapeHtml(opts.ticketCode)}</div>
        <div style="font-size:13px;color:#666;margin-top:8px;">${escapeHtml(opts.ticketName)}</div>
      </div>
      <p style="font-size:14px;color:#555;line-height:1.6;">
        Twój bilet (PDF z kodem QR) znajduje się w <strong>załączniku</strong> tej wiadomości. Wystarczy, że okażesz go (na telefonie lub wydrukowany) podczas wydarzenia.
      </p>
      <p style="font-size:13px;color:#888;line-height:1.6;margin-top:24px;">
        <strong>Pamiętaj:</strong> rezerwując bilet zadeklarowałeś/aś świadomą obecność na wydarzeniu. Liczymy na Twoje przybycie!
      </p>
    </div>
    <div style="text-align:center;padding:18px;background:#fafafa;color:#999;font-size:12px;border-top:1px solid #eee;">
      © ${new Date().getFullYear()} Pure Life Center.
    </div>
  </div>
</body></html>`;
}

/**
 * Generates PDF (via generate-event-ticket-pdf) and sends ticket email with PDF attachment.
 * Idempotent: skips send if order already has ticket_sent_at.
 * If PDF generation fails, aborts (does NOT mark sent), so a future retry can succeed.
 */
export async function issueFreeTicketForOrder(supabase: any, orderId: string): Promise<{ sent: boolean; reason?: string }> {
  const { data: order, error: orderErr } = await supabase
    .from("paid_event_orders")
    .select("*, paid_events(id, title, event_date, location, banner_url, is_free), paid_event_tickets(name)")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr || !order) return { sent: false, reason: "order_not_found" };
  if (order.ticket_sent_at) return { sent: false, reason: "already_sent" };
  if (!order.ticket_code) return { sent: false, reason: "no_ticket_code" };

  const event = (order as any).paid_events;
  const ticketCode: string = order.ticket_code;

  // 1) Generate PDF — REQUIRED. If it fails, abort so retry can succeed later.
  let pdfBytes: Uint8Array | null = null;
  try {
    const pdfRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-event-ticket-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ orderId: order.id }),
    });
    if (pdfRes.ok) {
      const pdfJson = await pdfRes.json().catch(() => null);
      const url = pdfJson?.tickets?.[0]?.url;
      if (url) {
        const r = await fetch(url);
        if (r.ok) pdfBytes = new Uint8Array(await r.arrayBuffer());
      }
    } else {
      console.warn("[issueFreeTicket] pdf gen non-ok", pdfRes.status, await pdfRes.text().catch(() => ""));
    }
  } catch (e) {
    console.error("[issueFreeTicket] pdf gen failed", e);
  }

  if (!pdfBytes) {
    console.error(`[issueFreeTicket] PDF generation failed for order ${order.id} — aborting send (will retry).`);
    return { sent: false, reason: "pdf_failed" };
  }

  // 2) SMTP settings
  const { data: smtp } = await supabase.from("smtp_settings").select("*").eq("is_active", true).maybeSingle();
  if (!smtp) return { sent: false, reason: "no_smtp" };

  const smtpSettings: SmtpSettings = {
    smtp_host: (smtp as any).smtp_host,
    smtp_port: (smtp as any).smtp_port,
    smtp_username: (smtp as any).smtp_username,
    smtp_password: (smtp as any).smtp_password,
    encryption_type: (smtp as any).smtp_encryption,
    sender_email: (smtp as any).sender_email,
    sender_name: (smtp as any).sender_name,
  };

  const eventDateStr = event?.event_date
    ? new Date(event.event_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  const html = buildTicketEmail({
    firstName: order.first_name,
    eventTitle: event?.title || "Wydarzenie",
    eventDate: eventDateStr,
    eventLocation: event?.location || "",
    ticketName: (order as any).paid_event_tickets?.name || "Bilet",
    ticketCode,
    bannerUrl: event?.banner_url,
  });

  const plainText = `Cześć ${order.first_name}!\n\nTwój bilet (PDF z kodem QR) na wydarzenie "${event?.title || "wydarzenie"}" znajduje się w załączniku tej wiadomości.\n\nNumer biletu: ${ticketCode}\n\nOkaż kod QR z biletu podczas wydarzenia.\n\nDo zobaczenia!`;

  const subject = `🎟️ Twój bilet – ${event?.title || "wydarzenie"}`;
  const attachment = { filename: `bilet-${ticketCode}.pdf`, bytes: pdfBytes, contentType: "application/pdf" };

  // Send with attachment — one retry on transient failure
  try {
    await sendSmtp(smtpSettings, order.email, subject, html, attachment, plainText);
  } catch (e) {
    console.warn("[issueFreeTicket] first send failed, retrying once in 3s", e);
    await new Promise((r) => setTimeout(r, 3000));
    await sendSmtp(smtpSettings, order.email, subject, html, attachment, plainText);
  }

  await supabase.from("paid_event_orders")
    .update({ ticket_sent_at: new Date().toISOString() })
    .eq("id", order.id);

  console.log(`[issueFreeTicket] ticket email sent to ${order.email} (order ${order.id})`);
  return { sent: true };
}
