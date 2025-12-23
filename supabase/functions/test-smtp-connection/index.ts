import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpTestRequest {
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: string;
  smtp_username: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: SmtpTestRequest = await req.json();
    
    console.log("Testing SMTP connection:", {
      host: requestData.smtp_host,
      port: requestData.smtp_port,
      encryption: requestData.smtp_encryption,
      username: requestData.smtp_username,
      passwordSet: !!requestData.smtp_password,
    });

    // Validate required fields
    if (!requestData.smtp_host || !requestData.smtp_username || !requestData.sender_email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Brakuje wymaganych pól: host, użytkownik lub email nadawcy",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Determine TLS settings based on encryption type
    const useTls = requestData.smtp_encryption === 'ssl';
    const useStartTls = requestData.smtp_encryption === 'tls';

    console.log(`TLS settings - useTls: ${useTls}, useStartTls: ${useStartTls}`);

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: requestData.smtp_host,
        port: requestData.smtp_port,
        tls: useTls,
        auth: {
          username: requestData.smtp_username,
          password: requestData.smtp_password,
        },
      },
    });

    try {
      // Send a test email
      await client.send({
        from: requestData.sender_name 
          ? `${requestData.sender_name} <${requestData.sender_email}>`
          : requestData.sender_email,
        to: requestData.sender_email, // Send to self for testing
        subject: "Test połączenia SMTP - Pure Life",
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10b981;">✅ Połączenie SMTP działa!</h2>
            <p>Ten email został wysłany automatycznie w celu przetestowania konfiguracji SMTP.</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">
              Wysłano: ${new Date().toLocaleString('pl-PL')}<br/>
              Serwer: ${requestData.smtp_host}:${requestData.smtp_port}<br/>
              Szyfrowanie: ${requestData.smtp_encryption.toUpperCase()}
            </p>
          </div>
        `,
        html: true,
      });

      await client.close();

      console.log("SMTP test successful - email sent to:", requestData.sender_email);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Połączenie działa! Email testowy wysłany na ${requestData.sender_email}`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (smtpError: any) {
      console.error("SMTP send error:", smtpError);
      
      await client.close().catch(() => {});

      let errorMessage = "Błąd połączenia SMTP";
      
      if (smtpError.message?.includes("authentication")) {
        errorMessage = "Błąd autoryzacji - sprawdź nazwę użytkownika i hasło";
      } else if (smtpError.message?.includes("connect")) {
        errorMessage = "Nie można połączyć się z serwerem - sprawdź host i port";
      } else if (smtpError.message?.includes("certificate")) {
        errorMessage = "Błąd certyfikatu SSL/TLS - sprawdź ustawienia szyfrowania";
      } else if (smtpError.message) {
        errorMessage = smtpError.message;
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage,
        }),
        {
          status: 200, // Return 200 so the frontend can process the error
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in test-smtp-connection:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Nieoczekiwany błąd podczas testu połączenia",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
