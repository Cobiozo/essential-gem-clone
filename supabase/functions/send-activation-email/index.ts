import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivationEmailRequest {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  resend?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData: ActivationEmailRequest = await req.json();
    
    console.log("Send activation email request:", { 
      userId: requestData.userId, 
      email: requestData.email,
      resend: requestData.resend 
    });

    // Check for duplicate sending (within last 5 minutes)
    if (!requestData.resend) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentLogs } = await supabase
        .from("email_logs")
        .select("id")
        .eq("recipient_email", requestData.email)
        .eq("status", "sent")
        .gte("sent_at", fiveMinutesAgo)
        .limit(1);

      if (recentLogs && recentLogs.length > 0) {
        console.log("Duplicate email prevented for:", requestData.email);
        return new Response(
          JSON.stringify({ success: true, message: "Email already sent recently" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Get the activation email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("internal_name", "activation_email")
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("Template not found:", templateError);
      throw new Error("Szablon e-mail aktywacyjnego nie został znaleziony");
    }

    // Generate activation token using Supabase Auth
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: requestData.email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://xzlhssqqbajqhnsmbucf.lovableproject.com"}/auth?activated=true`,
      },
    });

    if (linkError) {
      console.error("Error generating activation link:", linkError);
      // If user already exists, generate magic link instead
      const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: requestData.email,
        options: {
          redirectTo: `${req.headers.get("origin") || "https://xzlhssqqbajqhnsmbucf.lovableproject.com"}/auth?activated=true`,
        },
      });

      if (magicLinkError) {
        throw new Error(`Nie można wygenerować linku aktywacyjnego: ${magicLinkError.message}`);
      }

      var activationLink = magicLinkData.properties?.action_link || "";
    } else {
      var activationLink = linkData.properties?.action_link || "";
    }

    // Replace template variables
    let htmlBody = template.body_html
      .replace(/\{\{imię\}\}/g, requestData.firstName || "Użytkowniku")
      .replace(/\{\{nazwisko\}\}/g, requestData.lastName || "")
      .replace(/\{\{email\}\}/g, requestData.email)
      .replace(/\{\{link_aktywacyjny\}\}/g, activationLink)
      .replace(/\{\{rola\}\}/g, requestData.role || "użytkownik");

    let textBody = (template.body_text || "")
      .replace(/\{\{imię\}\}/g, requestData.firstName || "Użytkowniku")
      .replace(/\{\{nazwisko\}\}/g, requestData.lastName || "")
      .replace(/\{\{email\}\}/g, requestData.email)
      .replace(/\{\{link_aktywacyjny\}\}/g, activationLink)
      .replace(/\{\{rola\}\}/g, requestData.role || "użytkownik");

    let subject = template.subject
      .replace(/\{\{imię\}\}/g, requestData.firstName || "Użytkowniku")
      .replace(/\{\{nazwisko\}\}/g, requestData.lastName || "");

    // Add footer if present
    if (template.footer_html) {
      htmlBody += template.footer_html;
    }

    // Get event type for logging
    const { data: eventType } = await supabase
      .from("email_event_types")
      .select("id")
      .eq("event_key", "user_registration")
      .single();

    // Create pending log entry
    const { data: logEntry, error: logError } = await supabase
      .from("email_logs")
      .insert({
        template_id: template.id,
        event_type_id: eventType?.id,
        recipient_email: requestData.email,
        recipient_user_id: requestData.userId,
        subject: subject,
        status: "pending",
        metadata: {
          firstName: requestData.firstName,
          lastName: requestData.lastName,
          role: requestData.role,
          isResend: requestData.resend || false,
        },
      })
      .select()
      .single();

    if (logError) {
      console.error("Error creating log entry:", logError);
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Pure Life <onboarding@resend.dev>",
      to: [requestData.email],
      subject: subject,
      html: htmlBody,
      text: textBody,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update log entry with success
    if (logEntry) {
      await supabase
        .from("email_logs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        message: "E-mail aktywacyjny został wysłany" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-activation-email function:", error);

    // Log error if possible
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const requestData: ActivationEmailRequest = await req.clone().json();
      
      await supabase.from("email_logs").insert({
        recipient_email: requestData.email,
        recipient_user_id: requestData.userId,
        subject: "Aktywuj swoje konto w Pure Life",
        status: "error",
        error_message: error.message,
        metadata: { error: error.message },
      });
    } catch (logError) {
      console.error("Failed to log email error:", logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
