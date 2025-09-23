import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GroupEmailRequest {
  subject: string;
  content: string;  // HTML content from Rich Text Editor
  recipients: {
    client: boolean;
    partner: boolean;
    specjalista: boolean;
  };
  senderEmail?: string;
  senderName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting group email sending process");
    
    const { subject, content, recipients, senderEmail, senderName }: GroupEmailRequest = await req.json();
    
    if (!subject || !content) {
      return new Response(
        JSON.stringify({ error: "Subject and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching user profiles based on role selection:", recipients);

    // Build role filter
    const roleFilters = [];
    if (recipients.client) roleFilters.push('client', 'user');
    if (recipients.partner) roleFilters.push('partner');
    if (recipients.specjalista) roleFilters.push('specjalista');

    if (roleFilters.length === 0) {
      return new Response(
        JSON.stringify({ error: "Please select at least one recipient group" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch users with selected roles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, role')
      .in('role', roleFilters)
      .eq('is_active', true);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profiles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active users found for selected groups" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${profiles.length} recipients to send emails to`);

    // Prepare email recipients
    const emailRecipients = profiles.map(profile => profile.email);

    // Send group email using BCC to protect privacy
    const emailResponse = await resend.emails.send({
      from: senderEmail || "System <onboarding@resend.dev>",
      to: [senderEmail || "admin@example.com"], // Main recipient (sender)
      bcc: emailRecipients, // BCC all other recipients for privacy
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                border-bottom: 2px solid #eee;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .content {
                margin-bottom: 30px;
              }
              .footer {
                border-top: 1px solid #eee;
                padding-top: 20px;
                font-size: 12px;
                color: #666;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${subject}</h1>
            </div>
            <div class="content">
              ${content}
            </div>
            <div class="footer">
              <p>Ta wiadomość została wysłana do grupy użytkowników systemu.</p>
              <p>Nadawca: ${senderName || 'Administrator systemu'}</p>
            </div>
          </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResponse.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Group email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent successfully to ${profiles.length} recipients`,
        emailId: emailResponse.data?.id,
        recipientCount: profiles.length,
        recipients: profiles.map(p => ({ email: p.email, role: p.role }))
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-group-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message,
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);