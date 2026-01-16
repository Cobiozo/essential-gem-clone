import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebinarConfirmationRequest {
  eventId?: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  invitedByUserId?: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventHost?: string;
  zoomLink?: string;
  hostName?: string;
  isReminder?: boolean;
}

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption_type: string;
  sender_email: string;
  sender_name: string;
}

function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return btoa(String.fromCharCode(...data));
}

function base64EncodeAscii(str: string): string {
  return btoa(str);
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; message: string }> {
  console.log(`[SMTP] Connecting to ${settings.host}:${settings.port}`);
  
  let conn: Deno.TcpConn | Deno.TlsConn;
  
  try {
    if (settings.encryption_type === "ssl") {
      conn = await withTimeout(
        Deno.connectTls({ hostname: settings.host, port: settings.port }),
        15000,
        "SSL/TLS connection timeout"
      );
    } else {
      conn = await withTimeout(
        Deno.connect({ hostname: settings.host, port: settings.port }),
        15000,
        "TCP connection timeout"
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(): Promise<string> {
      const buffer = new Uint8Array(4096);
      const n = await conn.read(buffer);
      if (n === null) return "";
      return decoder.decode(buffer.subarray(0, n));
    }

    async function sendCommand(command: string, hideLog = false): Promise<string> {
      await conn.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    }

    await readResponse();
    await sendCommand(`EHLO ${settings.host}`);

    if (settings.encryption_type === "starttls") {
      const starttlsResponse = await sendCommand("STARTTLS");
      if (!starttlsResponse.startsWith("220")) {
        throw new Error("STARTTLS not supported or failed");
      }
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await sendCommand(`EHLO ${settings.host}`);
    }

    await sendCommand("AUTH LOGIN");
    await sendCommand(base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(base64EncodeAscii(settings.password), true);
    
    if (!authResponse.includes("235") && !authResponse.includes("Authentication successful")) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }

    await sendCommand(`MAIL FROM:<${settings.sender_email}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const emailContent = [
      `From: "${settings.sender_name}" <${settings.sender_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Date: ${new Date().toUTCString()}`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(htmlBody.replace(/<[^>]*>/g, "")),
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(htmlBody),
      ``,
      `--${boundary}--`,
      `.`,
    ].join("\r\n");

    const dataResponse = await sendCommand(emailContent);
    
    if (!dataResponse.includes("250") && !dataResponse.includes("OK")) {
      throw new Error(`Failed to send email: ${dataResponse}`);
    }

    await sendCommand("QUIT");
    conn.close();

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("[SMTP] Error:", error);
    throw error;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: WebinarConfirmationRequest = await req.json();
    const { eventId, email, firstName, lastName, phone, invitedByUserId, eventTitle, eventDate, eventTime, eventHost, zoomLink, hostName, isReminder } = requestData;
    
    const emailType = isReminder ? 'reminder' : 'confirmation';
    console.log(`[send-webinar-confirmation] Processing ${emailType} for: ${email}, event: ${eventTitle}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Add guest to team_contacts if invited by a user (only for confirmations, not reminders)
    if (invitedByUserId && eventId && !isReminder) {
      console.log(`[send-webinar-confirmation] Adding to team_contacts for user: ${invitedByUserId}`);
      
      const formattedDate = eventDate 
        ? new Date(eventDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      
      const sourceNote = `Dane pozyskane z formularza webinar: "${eventTitle}" (${formattedDate})`;
      
      // Check if contact already exists for this user
      const { data: existingContact } = await supabase
        .from('team_contacts')
        .select('id')
        .eq('user_id', invitedByUserId)
        .eq('email', email)
        .eq('contact_type', 'private')
        .maybeSingle();

      if (!existingContact) {
        const { data: newContact, error: contactError } = await supabase
          .from('team_contacts')
          .insert({
            user_id: invitedByUserId,
            first_name: firstName,
            last_name: lastName || '',
            email: email,
            phone_number: phone || null,
            contact_type: 'private',
            role: 'client',
            relationship_status: 'observation',
            notes: sourceNote,
            is_active: true,
          })
          .select('id')
          .single();

        if (contactError) {
          console.error('[send-webinar-confirmation] Error creating contact:', contactError);
        } else if (newContact) {
          // Update guest registration with contact ID
          await supabase
            .from('guest_event_registrations')
            .update({ team_contact_id: newContact.id })
            .eq('event_id', eventId)
            .eq('email', email);
          
          console.log(`[send-webinar-confirmation] Created team contact: ${newContact.id}`);
        }
      } else {
        console.log(`[send-webinar-confirmation] Contact already exists: ${existingContact.id}`);
        // Update guest registration with existing contact ID
        await supabase
          .from('guest_event_registrations')
          .update({ team_contact_id: existingContact.id })
          .eq('event_id', eventId)
          .eq('email', email);
      }
    }

    // Try to get template from database
    const templateInternalName = isReminder ? 'webinar_reminder_24h' : 'webinar_confirmation';
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("internal_name", templateInternalName)
      .eq("is_active", true)
      .maybeSingle();

    // Get event type for logging
    const eventTypeKey = isReminder ? 'webinar_reminder_24h' : 'webinar_confirmation';
    const { data: eventType } = await supabase
      .from("email_event_types")
      .select("id")
      .eq("event_key", eventTypeKey)
      .maybeSingle();

    // Get SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      console.warn("[send-webinar-confirmation] SMTP settings not found, skipping email");
      // Still mark as processed (only for confirmations with eventId)
      if (eventId && !isReminder) {
        await supabase
          .from('guest_event_registrations')
          .update({ confirmation_sent: true, confirmation_sent_at: new Date().toISOString() })
          .eq('event_id', eventId)
          .eq('email', email);
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Registration processed, email skipped (no SMTP)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpSettings: SmtpSettings = {
      host: smtpData.smtp_host,
      port: smtpData.smtp_port,
      username: smtpData.smtp_username,
      password: smtpData.smtp_password,
      encryption_type: smtpData.smtp_encryption,
      sender_email: smtpData.sender_email,
      sender_name: smtpData.sender_name,
    };

    // Format date for email
    const displayDate = eventTime 
      ? `${eventDate}, godz. ${eventTime}` 
      : (eventDate 
        ? new Date(eventDate).toLocaleDateString('pl-PL', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : '');

    const displayHost = hostName || eventHost || 'Zespół Pure Life';
    const displayZoomLink = zoomLink || '';
    const displayTime = eventTime || '';

    let subject: string;
    let htmlBody: string;

    // Use template from database if available, otherwise use fallback
    if (template) {
      console.log(`[send-webinar-confirmation] Using template: ${template.internal_name}`);
      
      // Replace template variables
      const replaceVariables = (text: string): string => {
        return text
          .replace(/\{\{imię\}\}/gi, firstName)
          .replace(/\{\{event_title\}\}/gi, eventTitle)
          .replace(/\{\{event_date\}\}/gi, displayDate)
          .replace(/\{\{event_time\}\}/gi, displayTime)
          .replace(/\{\{host_name\}\}/gi, displayHost)
          .replace(/\{\{zoom_link\}\}/gi, displayZoomLink);
      };

      subject = replaceVariables(template.subject);
      htmlBody = replaceVariables(template.body_html);
    } else {
      // Fallback to hardcoded templates
      console.log(`[send-webinar-confirmation] Template not found, using fallback for ${emailType}`);
      
      if (isReminder) {
        subject = `⏰ Przypomnienie: ${eventTitle} - już jutro!`;
        htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f59e0b; }
              .content { padding: 30px 0; }
              .event-box { background: #fffbeb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
              .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; border-top: 1px solid #eee; }
              h1 { color: #d97706; margin: 0; }
              .highlight { color: #d97706; font-weight: bold; }
              .join-button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ Przypomnienie o webinarze!</h1>
              </div>
              <div class="content">
                <p>Cześć <strong>${firstName}</strong>!</p>
                <p>Przypominamy, że <span class="highlight">już jutro</span> odbędzie się webinar, na który się zapisałeś/aś:</p>
                
                <div class="event-box">
                  <h2 style="margin-top: 0;">📅 ${eventTitle}</h2>
                  <p><strong>Data i godzina:</strong> ${displayDate}</p>
                  <p><strong>Prowadzący:</strong> ${displayHost}</p>
                  ${displayZoomLink ? `
                    <p style="margin-top: 20px;"><strong>🔗 Link do dołączenia:</strong></p>
                    <a href="${displayZoomLink}" class="join-button">Dołącz do webinaru</a>
                    <p style="font-size: 12px; color: #666;">Lub skopiuj link: ${displayZoomLink}</p>
                  ` : ''}
                </div>
                
                <p><strong>Wskazówki:</strong></p>
                <ul>
                  <li>Dołącz kilka minut przed rozpoczęciem</li>
                  <li>Sprawdź swoje połączenie internetowe</li>
                  <li>Przygotuj notatnik na ważne informacje</li>
                </ul>
                
                <p>Do zobaczenia! 🎉</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Pure Life. Wszelkie prawa zastrzeżone.</p>
              </div>
            </div>
          </body>
          </html>
        `;
      } else {
        subject = `Potwierdzenie rejestracji: ${eventTitle}`;
        htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #22c55e; }
              .content { padding: 30px 0; }
              .event-box { background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; border-top: 1px solid #eee; }
              h1 { color: #16a34a; margin: 0; }
              .highlight { color: #16a34a; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Rejestracja potwierdzona!</h1>
              </div>
              <div class="content">
                <p>Cześć <strong>${firstName}</strong>!</p>
                <p>Dziękujemy za zapisanie się na webinar. Poniżej znajdziesz szczegóły wydarzenia:</p>
                
                <div class="event-box">
                  <h2 style="margin-top: 0;">${eventTitle}</h2>
                  <p>📅 <strong>Data:</strong> ${displayDate}</p>
                  <p>👤 <strong>Prowadzący:</strong> ${displayHost}</p>
                </div>
                
                <p><strong>Co dalej?</strong></p>
                <ul>
                  <li>Otrzymasz przypomnienie <span class="highlight">24 godziny przed webinarem</span></li>
                  <li>Link do dołączenia otrzymasz w wiadomości przypominającej</li>
                  <li>Przygotuj miejsce do spokojnego uczestnictwa</li>
                </ul>
                
                <p>Do zobaczenia na webinarze! 🎉</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Pure Life. Wszelkie prawa zastrzeżone.</p>
                <p>Ta wiadomość została wygenerowana automatycznie.</p>
              </div>
            </div>
          </body>
          </html>
        `;
      }
    }

    try {
      await sendSmtpEmail(smtpSettings, email, subject, htmlBody);
      
      // Update confirmation status (only for confirmations with eventId)
      if (eventId && !isReminder) {
        await supabase
          .from('guest_event_registrations')
          .update({ confirmation_sent: true, confirmation_sent_at: new Date().toISOString() })
          .eq('event_id', eventId)
          .eq('email', email);
      }

      // Log email
      await supabase.from("email_logs").insert({
        recipient_email: email,
        subject: subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        template_id: template?.id || null,
        event_type_id: eventType?.id || null,
        metadata: { 
          type: isReminder ? "webinar_reminder" : "webinar_confirmation", 
          event_id: eventId, 
          event_title: eventTitle 
        },
      });

      console.log(`[send-webinar-confirmation] ${isReminder ? 'Reminder' : 'Confirmation'} email sent to ${email}`);
      
      return new Response(
        JSON.stringify({ success: true, message: `${isReminder ? 'Reminder' : 'Confirmation'} email sent` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (sendError: any) {
      console.error("[send-webinar-confirmation] SMTP error:", sendError);
      
      // Log failed email
      await supabase.from("email_logs").insert({
        recipient_email: email,
        subject: subject,
        status: "failed",
        error_message: sendError.message,
        template_id: template?.id || null,
        event_type_id: eventType?.id || null,
        metadata: { 
          type: isReminder ? "webinar_reminder" : "webinar_confirmation", 
          event_id: eventId 
        },
      });

      return new Response(
        JSON.stringify({ success: false, error: sendError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("[send-webinar-confirmation] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
