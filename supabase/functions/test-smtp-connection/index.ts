import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Try to establish a TCP connection to the SMTP server to test connectivity
    const port = requestData.smtp_port || 465;
    const hostname = requestData.smtp_host;

    try {
      // Test basic connectivity by trying to connect
      const conn = await Deno.connect({
        hostname: hostname,
        port: port,
      });
      
      // Read the initial greeting from the server
      const buffer = new Uint8Array(1024);
      const bytesRead = await conn.read(buffer);
      
      if (bytesRead && bytesRead > 0) {
        const greeting = new TextDecoder().decode(buffer.subarray(0, bytesRead));
        console.log("SMTP server greeting:", greeting);
        
        // Check if we got a valid SMTP response (starts with 220)
        if (greeting.startsWith("220")) {
          // Send EHLO command
          const ehloCommand = `EHLO test.local\r\n`;
          await conn.write(new TextEncoder().encode(ehloCommand));
          
          // Read EHLO response
          const ehloBuffer = new Uint8Array(2048);
          const ehloBytesRead = await conn.read(ehloBuffer);
          
          if (ehloBytesRead && ehloBytesRead > 0) {
            const ehloResponse = new TextDecoder().decode(ehloBuffer.subarray(0, ehloBytesRead));
            console.log("EHLO response:", ehloResponse);
            
            // Send QUIT command
            await conn.write(new TextEncoder().encode("QUIT\r\n"));
          }
          
          conn.close();
          
          return new Response(
            JSON.stringify({
              success: true,
              message: `Połączenie z serwerem ${hostname}:${port} udane! Serwer odpowiada poprawnie.`,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        } else {
          conn.close();
          return new Response(
            JSON.stringify({
              success: false,
              message: `Serwer odpowiedział niepoprawnie: ${greeting.substring(0, 100)}`,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      } else {
        conn.close();
        return new Response(
          JSON.stringify({
            success: false,
            message: "Serwer nie odpowiedział na połączenie",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    } catch (connectError: any) {
      console.error("Connection error:", connectError);
      
      let errorMessage = "Nie można połączyć się z serwerem SMTP";
      
      if (connectError.message?.includes("connection refused")) {
        errorMessage = `Połączenie odrzucone - sprawdź czy serwer ${hostname} nasłuchuje na porcie ${port}`;
      } else if (connectError.message?.includes("timeout")) {
        errorMessage = "Przekroczono limit czasu połączenia - sprawdź adres serwera i port";
      } else if (connectError.message?.includes("dns") || connectError.message?.includes("resolve")) {
        errorMessage = `Nie można rozwiązać adresu serwera: ${hostname}`;
      } else if (connectError.message) {
        errorMessage = `Błąd połączenia: ${connectError.message}`;
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage,
        }),
        {
          status: 200,
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
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
