import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN_TTL_DAYS = 7;

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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
  ]);
}

async function sendSmtp(s: SmtpSettings, to: string, subject: string, html: string, attachment?: { filename: string; bytes: Uint8Array; contentType: string }) {
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
      // Encode binary to base64 in chunks
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
    // Stream the DATA payload in chunks (large PDF attachments cause SMTP
    // "incoming data timeout" on some hosts when sent as a single write).
    const payload = enc.encode(parts.join("\r\n") + "\r\n");
    let written = 0;
    const CHUNK_W = 16384;
    while (written < payload.length) {
      const slice = payload.subarray(written, Math.min(written + CHUNK_W, payload.length));
      const n = await conn.write(slice);
      written += n;
    }
    const r = await withTimeout(read(), 120000, "DATA read timeout");
    if (!r.includes("250")) throw new Error(`Send failed: ${r}`);
    await send("QUIT");
  } finally {
    try { conn.close(); } catch (_) { /* ignore */ }
  }
}

function buildTicketEmail(opts: {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  ticketName: string;
  ticketCode: string;
  bannerUrl?: string | null;
  ticketViewUrl: string;
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
        Bilet (PDF z kodem QR) znajduje się w załączniku tej wiadomości. Możesz też pobrać go online:
      </p>
      <div style="margin:20px 0;text-align:center;">
        <a href="${escapeHtml(opts.ticketViewUrl)}" style="display:inline-block;background:#D4AF37;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">Otwórz bilet online</a>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#555;">
        Podczas wydarzenia okaż kod QR z biletu (na telefonie lub wydrukowany).
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "missing_token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderErr } = await supabase
      .from("paid_event_orders")
      .select("*, paid_events(id, title, slug, event_date, location, banner_url, is_free), paid_event_tickets(name)")
      .eq("email_confirmation_token", token)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = (order as any).paid_events;
    if (!event?.is_free) {
      return new Response(JSON.stringify({ error: "event_not_free" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already confirmed?
    if (order.email_confirmed_at) {
      return new Response(JSON.stringify({
        success: true,
        alreadyConfirmed: true,
        email: order.email,
        eventTitle: event.title,
        ticketCode: order.ticket_code,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Expired?
    if (order.email_confirmation_sent_at) {
      const sent = new Date(order.email_confirmation_sent_at).getTime();
      const ageDays = (Date.now() - sent) / (1000 * 60 * 60 * 24);
      if (ageDays > TOKEN_TTL_DAYS) {
        return new Response(JSON.stringify({ error: "token_expired" }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const ticketCode = order.ticket_code || generateTicketCode();
    const nowIso = new Date().toISOString();

    const { error: updErr } = await supabase
      .from("paid_event_orders")
      .update({
        status: "paid",
        email_confirmed_at: nowIso,
        ticket_code: ticketCode,
        ticket_generated_at: nowIso,
      })
      .eq("id", order.id);

    if (updErr) {
      console.error("[confirm-free-event-reservation] update failed", updErr);
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert attendee row (for QR scanning system)
    const { data: existingAttendee } = await supabase
      .from("paid_event_order_attendees")
      .select("id")
      .eq("order_id", order.id)
      .limit(1)
      .maybeSingle();

    if (!existingAttendee) {
      await supabase.from("paid_event_order_attendees").insert({
        order_id: order.id,
        event_id: order.event_id,
        seat_index: 1,
        first_name: order.first_name,
        last_name: order.last_name,
        email: order.email,
        ticket_code: ticketCode,
      });
    }

    // Generate PDF + send ticket email (background)
    const sideEffects = (async () => {
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
            try {
              const r = await fetch(url);
              if (r.ok) pdfBytes = new Uint8Array(await r.arrayBuffer());
            } catch (e) { console.warn("[confirm-free] pdf fetch failed", e); }
          }
        } else {
          console.warn("[confirm-free] pdf gen non-ok", pdfRes.status);
        }
      } catch (e) {
        console.error("[confirm-free] pdf gen failed", e);
      }

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

          const eventDateStr = event.event_date
            ? new Date(event.event_date).toLocaleDateString("pl-PL", {
                day: "2-digit", month: "long", year: "numeric",
              })
            : "";

          const publicBaseUrl = Deno.env.get("PUBLIC_EMAIL_LINK_BASE_URL")
            || Deno.env.get("PUBLIC_SITE_URL")
            || "https://purelife.info.pl";

          const html = buildTicketEmail({
            firstName: order.first_name,
            eventTitle: event.title,
            eventDate: eventDateStr,
            eventLocation: event.location || '',
            ticketName: (order as any).paid_event_tickets?.name || "Bilet",
            ticketCode,
            bannerUrl: event.banner_url,
            ticketViewUrl: `${publicBaseUrl}/ticket/${ticketCode}`,
          });

          const subject = `🎟️ Twój bilet – ${event.title}`;
          let sent = false;
          try {
            await sendSmtp(
              smtpSettings,
              order.email,
              subject,
              html,
              pdfBytes ? { filename: `bilet-${ticketCode}.pdf`, bytes: pdfBytes, contentType: "application/pdf" } : undefined,
            );
            sent = true;
          } catch (primaryErr) {
            console.error("[confirm-free-event-reservation] primary send failed, retrying without attachment", primaryErr);
            // Fallback: resend without the PDF attachment so the user still receives the
            // ticket info and a download link (SMTP host may time out on large attachments).
            try {
              const htmlNoAttach = html.replace(
                'Bilet (PDF z kodem QR) znajduje się w załączniku tej wiadomości. Możesz też pobrać go online:',
                'Bilet (PDF z kodem QR) jest dostępny online — kliknij przycisk poniżej, aby go otworzyć i pobrać:'
              );
              await sendSmtp(smtpSettings, order.email, subject, htmlNoAttach);
              sent = true;
              console.log(`[confirm-free-event-reservation] ticket email sent WITHOUT attachment to ${order.email}`);
            } catch (fallbackErr) {
              console.error("[confirm-free-event-reservation] fallback send also failed", fallbackErr);
              // Notify admins that the ticket email could not be delivered.
              try {
                const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
                const failNotifs = (admins || []).map((a: any) => ({
                  user_id: a.user_id,
                  notification_type: "ticket_email_failed",
                  source_module: "paid_events",
                  title: "⚠️ Nie udało się wysłać maila z biletem",
                  message: `Bilet ${ticketCode} dla ${order.email} (${event.title}) nie został wysłany. Sprawdź ustawienia SMTP lub użyj „Wyślij ponownie".`,
                  link: `/admin?tab=paid-events`,
                  metadata: { order_id: order.id, event_id: order.event_id, ticket_code: ticketCode, error: String(fallbackErr) },
                }));
                if (failNotifs.length > 0) await supabase.from("user_notifications").insert(failNotifs);
              } catch (_) { /* ignore */ }
            }
          }

          if (sent) {
            await supabase.from("paid_event_orders")
              .update({ ticket_sent_at: new Date().toISOString() })
              .eq("id", order.id);
            console.log(`[confirm-free-event-reservation] ticket email sent to ${order.email}`);
          }
        }
      } catch (mailErr) {
        console.error("[confirm-free-event-reservation] email send failed", mailErr);
      }

      // Notify admins
      try {
        const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
        const notifications = (admins || []).map((a: any) => ({
          user_id: a.user_id,
          notification_type: "event_free_confirmed",
          source_module: "paid_events",
          title: "✅ Potwierdzono rejestrację bezpłatną",
          message: `${order.first_name} ${order.last_name} potwierdził email i otrzymał bilet na „${event.title}".`,
          link: `/admin/paid-events`,
          metadata: { order_id: order.id, event_id: order.event_id, ticket_code: ticketCode },
        }));
        if (notifications.length > 0) {
          await supabase.from("user_notifications").insert(notifications);
        }
      } catch (e) { console.error("notify failed", e); }
    })();

    try {
      // @ts-ignore EdgeRuntime is provided by Supabase
      EdgeRuntime.waitUntil(sideEffects);
    } catch {
      sideEffects.catch((e) => console.error("side-effects error", e));
    }

    return new Response(JSON.stringify({
      success: true,
      alreadyConfirmed: false,
      email: order.email,
      eventTitle: event.title,
      eventDate: event.event_date,
      eventLocation: event.location,
      ticketCode,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[confirm-free-event-reservation] fatal", err);
    return new Response(JSON.stringify({ error: err.message || "internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
