import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatNotificationRequest {
  recipient_id: string;
  sender_name: string;
  message_content: string;
  message_type: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient_id, sender_name, message_content, message_type }: ChatNotificationRequest = await req.json();

    console.log("[send-chat-notification-email] Processing:", { recipient_id, sender_name, message_type });

    // Validate required fields
    if (!recipient_id || !sender_name) {
      throw new Error("Missing required fields: recipient_id, sender_name");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has offline email notifications enabled and is offline
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("last_seen_at, email, first_name, last_name")
      .eq("user_id", recipient_id)
      .single();

    if (profileError || !profile) {
      console.error("[send-chat-notification-email] Profile not found:", profileError);
      return new Response(
        JSON.stringify({ success: false, reason: "profile_not_found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check notification preferences
    const { data: preferences } = await supabase
      .from("user_notification_preferences")
      .select("email_on_offline")
      .eq("user_id", recipient_id)
      .single();

    // Default to true if no preferences exist
    const emailEnabled = preferences?.email_on_offline ?? true;

    if (!emailEnabled) {
      console.log("[send-chat-notification-email] Email notifications disabled for user");
      return new Response(
        JSON.stringify({ success: false, reason: "email_disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is offline (last_seen_at > 5 minutes ago)
    const lastSeen = new Date(profile.last_seen_at || 0);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    if (lastSeen >= fiveMinutesAgo) {
      console.log("[send-chat-notification-email] User is online, skipping email");
      return new Response(
        JSON.stringify({ success: false, reason: "user_online" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // User is offline - try Push first (faster channel), then email as fallback
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: recipient_id,
          title: `Wiadomość od ${sender_name}`,
          body: (message_type !== "text" 
            ? `[${message_type === "image" ? "Zdjęcie" : message_type === "video" ? "Wideo" : message_type === "audio" ? "Wiadomość głosowa" : "Plik"}]`
            : message_content.substring(0, 100)),
          url: "/messages",
          tag: `chat-${Date.now()}`
        }
      });
      console.log("[send-chat-notification-email] Push notification sent to offline user");
    } catch (pushErr) {
      console.warn("[send-chat-notification-email] Push failed, continuing with email fallback:", pushErr);
    }

    // Send email as additional fallback
    if (!profile.email) {
      console.error("[send-chat-notification-email] No email address for user");
      return new Response(
        JSON.stringify({ success: false, reason: "no_email" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!resendApiKey) {
      console.error("[send-chat-notification-email] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, reason: "resend_not_configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Format message content based on type
    let displayContent = message_content;
    if (message_type !== "text") {
      const typeNames: Record<string, string> = {
        image: "zdjęcie",
        video: "wideo",
        audio: "wiadomość głosową",
        file: "plik",
      };
      displayContent = `[Wysłano ${typeNames[message_type] || "załącznik"}]`;
    } else if (message_content.length > 200) {
      displayContent = message_content.substring(0, 200) + "...";
    }

    const recipientName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Użytkowniku";

    const emailResponse = await resend.emails.send({
      from: "Pure Life Center <powiadomienia@purelife.info.pl>",
      to: [profile.email],
      subject: `Nowa wiadomość od ${sender_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Nowa wiadomość</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Cześć <strong>${recipientName}</strong>,
            </p>
            
            <p style="font-size: 15px; margin-bottom: 20px;">
              <strong>${sender_name}</strong> wysłał(a) Ci wiadomość:
            </p>
            
            <div style="background: white; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="margin: 0; font-style: italic; color: #374151;">
                "${displayContent}"
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://purelife.info.pl/messages" 
                 style="background: #10b981; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Odpowiedz na wiadomość
              </a>
            </div>
          </div>
          
          <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px;">
            Otrzymujesz tę wiadomość, ponieważ masz włączone powiadomienia email.<br>
            Możesz zmienić ustawienia w swoim profilu.
          </p>
        </body>
        </html>
      `,
    });

    console.log("[send-chat-notification-email] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[send-chat-notification-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
