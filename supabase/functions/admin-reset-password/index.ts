import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  user_email: string;
  new_password: string;
  admin_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_email, new_password, admin_name }: ResetPasswordRequest = await req.json();

    // Get user by email
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      console.error("Error getting users:", getUserError);
      throw new Error("Nie udało się pobrać danych użytkowników");
    }

    const user = users.users.find(u => u.email === user_email);
    
    if (!user) {
      throw new Error(`Nie znaleziono użytkownika z adresem email: ${user_email}`);
    }

    // Update user password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: new_password,
        email_confirm: true // Automatically confirm email if needed
      }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Nie udało się zaktualizować hasła");
    }

    // Send email with new password
    const emailResponse = await resend.emails.send({
      from: "Pure Life Admin <admin@resend.dev>",
      to: [user_email],
      subject: "Nowe hasło do konta Pure Life",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Pure Life</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0;">Nowe hasło do Twojego konta</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Witaj!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Administrator <strong>${admin_name}</strong> wygenerował dla Ciebie nowe hasło do systemu Pure Life.
            </p>
            
            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; color: #333;"><strong>Email:</strong> ${user_email}</p>
              <p style="margin: 10px 0 0 0; color: #333;"><strong>Nowe hasło:</strong></p>
              <div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #667eea; background: white; padding: 15px; border-radius: 5px; margin-top: 10px; word-break: break-all;">
                ${new_password}
              </div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ Ważne przypomnienie bezpieczeństwa:</p>
              <ul style="margin: 10px 0 0 0; color: #856404; padding-left: 20px;">
                <li>Zaloguj się jak najszybciej i zmień hasło na własne</li>
                <li>Nie udostępniaj tego hasła nikomu</li>
                <li>Usuń tego emaila po zalogowaniu</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '') || 'https://pure-life.lovable.app'}/auth" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                Zaloguj się do systemu
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              Ten email został wysłany automatycznie przez system Pure Life.<br>
              Jeśli nie oczekiwałeś tego emaila, skontaktuj się z administratorem.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Hasło zostało zmienione i wysłane na email użytkownika" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in admin-reset-password function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Wystąpił błąd podczas resetowania hasła" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);