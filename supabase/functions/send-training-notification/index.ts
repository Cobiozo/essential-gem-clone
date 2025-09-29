import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  moduleId: string;
  assignedBy: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, moduleId, assignedBy }: NotificationRequest = await req.json();

    console.log("Sending training notification:", { userId, moduleId, assignedBy });

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User not found");
    }

    // Get training module
    const { data: module, error: moduleError } = await supabase
      .from("training_modules")
      .select("title, description")
      .eq("id", moduleId)
      .single();

    if (moduleError || !module) {
      throw new Error("Training module not found");
    }

    // Get assigner profile
    const { data: assignerProfile, error: assignerError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", assignedBy)
      .single();

    const assignerName = assignerProfile 
      ? `${assignerProfile.first_name || ''} ${assignerProfile.last_name || ''}`.trim() || 'Administrator'
      : 'Administrator';

    // Training URL
    const trainingUrl = `https://your-app.com/training/${moduleId}`;

    // Send email using Resend API directly
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Pure Life Training <onboarding@resend.dev>",
        to: [profile.email],
        subject: `Nowe szkolenie: ${module.title}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 30px;
                  border-radius: 10px 10px 0 0;
                  text-align: center;
                }
                .content {
                  background: #f9fafb;
                  padding: 30px;
                  border-radius: 0 0 10px 10px;
                }
                .button {
                  display: inline-block;
                  background: #667eea;
                  color: white;
                  padding: 14px 28px;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: 600;
                  margin: 20px 0;
                }
                .footer {
                  text-align: center;
                  color: #6b7280;
                  font-size: 14px;
                  margin-top: 30px;
                }
                .module-info {
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                  border-left: 4px solid #667eea;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🎓 Nowe szkolenie dla Ciebie!</h1>
              </div>
              <div class="content">
                <p>Witaj ${profile.first_name || ''}!</p>
                
                <p>${assignerName} przypisał(a) Ci nowe szkolenie:</p>
                
                <div class="module-info">
                  <h2 style="margin-top: 0; color: #667eea;">${module.title}</h2>
                  <p style="margin-bottom: 0;">${module.description || ''}</p>
                </div>
                
                <p>Kliknij poniższy przycisk, aby rozpocząć szkolenie:</p>
                
                <div style="text-align: center;">
                  <a href="${trainingUrl}" class="button">
                    Rozpocznij szkolenie →
                  </a>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                  Możesz również przejść do szkolenia logując się do swojego konta i wybierając zakładkę "Szkolenia".
                </p>
              </div>
              
              <div class="footer">
                <p>Pure Life Training System</p>
                <p>To wiadomość została wysłana automatycznie. Nie odpowiadaj na nią.</p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    // Update notification_sent flag
    const { error: updateError } = await supabase
      .from("training_assignments")
      .update({ notification_sent: true })
      .eq("user_id", userId)
      .eq("module_id", moduleId);

    if (updateError) {
      console.error("Failed to update notification flag:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-training-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});