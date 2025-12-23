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

// Timeout wrapper for promises
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let conn: Deno.Conn | Deno.TlsConn | null = null;

  try {
    const requestData: SmtpTestRequest = await req.json();
    
    const port = requestData.smtp_port || 465;
    const hostname = requestData.smtp_host;
    const encryption = requestData.smtp_encryption || 'ssl';

    console.log("Testing SMTP connection:", {
      host: hostname,
      port: port,
      encryption: encryption,
      username: requestData.smtp_username,
      passwordSet: !!requestData.smtp_password,
    });

    if (!hostname || !requestData.smtp_username || !requestData.sender_email) {
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

    try {
      console.log(`Attempting ${encryption} connection to ${hostname}:${port}...`);

      // Use TLS connection for SSL (port 465)
      if (encryption === 'ssl') {
        console.log("Using Deno.connectTls for SSL connection...");
        conn = await withTimeout(
          Deno.connectTls({
            hostname: hostname,
            port: port,
          }),
          10000,
          `Przekroczono limit czasu połączenia SSL (10s) - sprawdź czy serwer ${hostname} nasłuchuje na porcie ${port}`
        );
      } else {
        // For STARTTLS or None - use regular TCP connection
        console.log("Using Deno.connect for TCP connection...");
        conn = await withTimeout(
          Deno.connect({
            hostname: hostname,
            port: port,
          }),
          10000,
          `Przekroczono limit czasu połączenia TCP (10s) - sprawdź czy serwer ${hostname} nasłuchuje na porcie ${port}`
        );
      }

      console.log("Connection established, waiting for server greeting...");

      // Read the initial greeting from the server
      const buffer = new Uint8Array(1024);
      const bytesRead = await withTimeout(
        conn.read(buffer),
        10000,
        "Serwer nie odpowiedział na połączenie (timeout 10s)"
      );
      
      if (bytesRead && bytesRead > 0) {
        const greeting = new TextDecoder().decode(buffer.subarray(0, bytesRead));
        console.log("SMTP server greeting:", greeting.trim());
        
        // Check if we got a valid SMTP response (starts with 220)
        if (greeting.startsWith("220")) {
          // Send EHLO command
          const ehloCommand = `EHLO test.local\r\n`;
          console.log("Sending EHLO command...");
          await conn.write(new TextEncoder().encode(ehloCommand));
          
          // Read EHLO response
          const ehloBuffer = new Uint8Array(2048);
          const ehloBytesRead = await withTimeout(
            conn.read(ehloBuffer),
            5000,
            "Serwer nie odpowiedział na komendę EHLO"
          );
          
          if (ehloBytesRead && ehloBytesRead > 0) {
            const ehloResponse = new TextDecoder().decode(ehloBuffer.subarray(0, ehloBytesRead));
            console.log("EHLO response:", ehloResponse.trim());
            
            // Send QUIT command
            console.log("Sending QUIT command...");
            await conn.write(new TextEncoder().encode("QUIT\r\n"));
          }
          
          conn.close();
          conn = null;
          
          return new Response(
            JSON.stringify({
              success: true,
              message: `Połączenie z serwerem ${hostname}:${port} (${encryption.toUpperCase()}) udane! Serwer odpowiada poprawnie.`,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        } else {
          conn.close();
          conn = null;
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
        if (conn) {
          conn.close();
          conn = null;
        }
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
    } catch (connectError: unknown) {
      console.error("Connection error:", connectError);
      
      if (conn) {
        try {
          conn.close();
        } catch (e) {
          console.error("Error closing connection:", e);
        }
        conn = null;
      }
      
      const errorMessage = connectError instanceof Error ? connectError.message : String(connectError);
      let userMessage = "Nie można połączyć się z serwerem SMTP";
      
      if (errorMessage.includes("Przekroczono limit czasu") || errorMessage.includes("timeout")) {
        userMessage = errorMessage;
      } else if (errorMessage.includes("connection refused")) {
        userMessage = `Połączenie odrzucone - sprawdź czy serwer ${hostname} nasłuchuje na porcie ${port}`;
      } else if (errorMessage.includes("dns") || errorMessage.includes("resolve") || errorMessage.includes("getaddrinfo")) {
        userMessage = `Nie można rozwiązać adresu serwera: ${hostname}`;
      } else if (errorMessage.includes("certificate") || errorMessage.includes("ssl") || errorMessage.includes("tls")) {
        userMessage = `Błąd certyfikatu SSL/TLS: ${errorMessage}`;
      } else {
        userMessage = `Błąd połączenia: ${errorMessage}`;
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: userMessage,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: unknown) {
    console.error("Error in test-smtp-connection:", error);
    
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        console.error("Error closing connection in outer catch:", e);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : "Nieoczekiwany błąd podczas testu połączenia";
    
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
};

serve(handler);
