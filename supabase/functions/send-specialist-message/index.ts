import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  specialist_id: string;
  subject: string;
  message: string;
  attachments?: Array<{ name: string; url: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { specialist_id, subject, message, attachments }: SendMessageRequest = await req.json();

    console.log("Sending message to specialist:", specialist_id, "from user:", user.id);

    // Check if specialist exists and is searchable
    const { data: specialist, error: specialistError } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name, specialization, is_searchable")
      .eq("user_id", specialist_id)
      .maybeSingle();

    if (specialistError || !specialist) {
      console.error("Specialist not found:", specialistError);
      return new Response(JSON.stringify({ error: "Specialist not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if specialist messaging is blocked
    const { data: block } = await supabase
      .from("specialist_messaging_blocks")
      .select("id")
      .eq("specialist_id", specialist_id)
      .maybeSingle();

    if (block) {
      return new Response(JSON.stringify({ error: "Messaging to this specialist is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get messaging settings
    const { data: settings } = await supabase
      .from("specialist_search_settings")
      .select("allow_messaging, max_messages_per_day, max_messages_per_specialist_per_day")
      .limit(1)
      .maybeSingle();

    if (!settings?.allow_messaging) {
      return new Response(JSON.stringify({ error: "Messaging is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check rate limits
    const today = new Date().toISOString().split("T")[0];
    
    // Check total messages sent today
    const { data: totalToday } = await supabase
      .from("specialist_message_limits")
      .select("message_count")
      .eq("user_id", user.id)
      .eq("window_date", today);

    const totalCount = totalToday?.reduce((sum, r) => sum + (r.message_count || 0), 0) || 0;
    
    if (totalCount >= (settings.max_messages_per_day || 5)) {
      return new Response(JSON.stringify({ 
        error: `Daily message limit reached (${settings.max_messages_per_day} per day)` 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check messages to this specific specialist today
    const { data: limitRecord } = await supabase
      .from("specialist_message_limits")
      .select("id, message_count")
      .eq("user_id", user.id)
      .eq("specialist_id", specialist_id)
      .eq("window_date", today)
      .maybeSingle();

    if (limitRecord && limitRecord.message_count >= (settings.max_messages_per_specialist_per_day || 2)) {
      return new Response(JSON.stringify({ 
        error: `Limit per specialist reached (${settings.max_messages_per_specialist_per_day} per day)` 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender profile
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    const senderName = senderProfile 
      ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() || senderProfile.email
      : user.email;

    // Send email via Resend
    let emailSent = false;
    let emailError = null;

    try {
      const emailResponse = await resend.emails.send({
        from: "Pure Life <noreply@resend.dev>",
        to: [specialist.email],
        replyTo: senderProfile?.email || user.email,
        subject: `[Wiadomość od użytkownika] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Nowa wiadomość od użytkownika</h2>
            <p><strong>Od:</strong> ${senderName} (${senderProfile?.email || user.email})</p>
            <p><strong>Temat:</strong> ${subject}</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <div style="white-space: pre-wrap;">${message}</div>
            ${attachments && attachments.length > 0 ? `
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
              <p><strong>Załączniki:</strong></p>
              <ul>
                ${attachments.map(a => `<li><a href="${a.url}">${a.name}</a></li>`).join('')}
              </ul>
            ` : ''}
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">
              Ta wiadomość została wysłana przez system Pure Life. 
              Możesz odpowiedzieć bezpośrednio na ten e-mail.
            </p>
          </div>
        `,
      });

      console.log("Email sent:", emailResponse);
      emailSent = true;
    } catch (error) {
      console.error("Email sending error:", error);
      emailError = error.message;
    }

    // Save correspondence record
    const { data: correspondence, error: saveError } = await supabase
      .from("specialist_correspondence")
      .insert({
        sender_id: user.id,
        specialist_id: specialist_id,
        subject: subject,
        message: message,
        attachments: attachments || [],
        status: "sent",
        email_sent: emailSent,
        email_sent_at: emailSent ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving correspondence:", saveError);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update rate limit
    if (limitRecord) {
      await supabase
        .from("specialist_message_limits")
        .update({ message_count: limitRecord.message_count + 1 })
        .eq("id", limitRecord.id);
    } else {
      await supabase
        .from("specialist_message_limits")
        .insert({
          user_id: user.id,
          specialist_id: specialist_id,
          message_count: 1,
          window_date: today,
        });
    }

    console.log("Message saved successfully:", correspondence.id);

    return new Response(JSON.stringify({ 
      success: true, 
      correspondence_id: correspondence.id,
      email_sent: emailSent,
      email_error: emailError
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in send-specialist-message:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
