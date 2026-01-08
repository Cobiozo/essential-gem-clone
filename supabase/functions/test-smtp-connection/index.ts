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
  console.log("[SMTP-TEST] ===== Function invoked =====");
  console.log("[SMTP-TEST] Method:", req.method);
  
  if (req.method === "OPTIONS") {
    console.log("[SMTP-TEST] Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  let conn: Deno.Conn | Deno.TlsConn | null = null;

  try {
    const rawBody = await req.text();
    console.log("[SMTP-TEST] Raw request body:", rawBody);
    
    let requestData: SmtpTestRequest;
    try {
      requestData = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("[SMTP-TEST] JSON parse error:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nieprawidłowy format danych JSON",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("[SMTP-TEST] Parsed request data:", {
      host: requestData.smtp_host,
      port: requestData.smtp_port,
      encryption: requestData.smtp_encryption,
      username: requestData.smtp_username,
      passwordSet: !!requestData.smtp_password,
      sender_email: requestData.sender_email,
    });

    const port = requestData.smtp_port || 465;
    const hostname = requestData.smtp_host;
    const encryption = requestData.smtp_encryption || 'ssl';

    if (!hostname || !requestData.smtp_username || !requestData.sender_email) {
      console.log("[SMTP-TEST] Missing required fields");
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
      console.log(`[SMTP-TEST] Attempting ${encryption} connection to ${hostname}:${port}...`);

      // Use TLS connection for SSL (port 465)
      if (encryption === 'ssl') {
        console.log("[SMTP-TEST] Using Deno.connectTls for SSL connection...");
        conn = await withTimeout(
          Deno.connectTls({
            hostname: hostname,
            port: port,
          }),
          15000,
          `Przekroczono limit czasu połączenia SSL (15s) - sprawdź czy serwer ${hostname} nasłuchuje na porcie ${port}`
        );
      } else {
        // For STARTTLS or None - use regular TCP connection
        console.log("[SMTP-TEST] Using Deno.connect for TCP connection...");
        conn = await withTimeout(
          Deno.connect({
            hostname: hostname,
            port: port,
          }),
          15000,
          `Przekroczono limit czasu połączenia TCP (15s) - sprawdź czy serwer ${hostname} nasłuchuje na porcie ${port}`
        );
      }

      console.log("[SMTP-TEST] Connection established successfully!");
      console.log("[SMTP-TEST] Waiting for server greeting...");

      // Read the initial greeting from the server
      const buffer = new Uint8Array(1024);
      const bytesRead = await withTimeout(
        conn.read(buffer),
        10000,
        "Serwer nie odpowiedział na połączenie (timeout 10s)"
      );
      
      if (bytesRead && bytesRead > 0) {
        const greeting = new TextDecoder().decode(buffer.subarray(0, bytesRead));
        console.log("[SMTP-TEST] SMTP server greeting:", greeting.trim());
        
        // Check if we got a valid SMTP response (starts with 220)
        if (greeting.startsWith("220")) {
          // Send EHLO command
          const ehloCommand = `EHLO test.local\r\n`;
          console.log("[SMTP-TEST] Sending EHLO command...");
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
            console.log("[SMTP-TEST] EHLO response:", ehloResponse.trim());
            
            // Send QUIT command
            console.log("[SMTP-TEST] Sending QUIT command...");
            await conn.write(new TextEncoder().encode("QUIT\r\n"));
          }
          
          conn.close();
          conn = null;
          
          console.log("[SMTP-TEST] ===== Test completed successfully =====");
          
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
          console.log("[SMTP-TEST] Invalid SMTP response:", greeting.substring(0, 100));
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
        console.log("[SMTP-TEST] No response from server");
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
      console.error("[SMTP-TEST] Connection error:", connectError);
      console.error("[SMTP-TEST] Error type:", typeof connectError);
      console.error("[SMTP-TEST] Error name:", connectError instanceof Error ? connectError.name : 'unknown');
      console.error("[SMTP-TEST] Error stack:", connectError instanceof Error ? connectError.stack : 'no stack');
      
      if (conn) {
        try {
          conn.close();
        } catch (e) {
          console.error("[SMTP-TEST] Error closing connection:", e);
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
      } else if (errorMessage.includes("certificate") || errorMessage.includes("ssl") || errorMessage.includes("tls") || errorMessage.includes("InvalidData")) {
        userMessage = `Błąd certyfikatu SSL/TLS: ${errorMessage}`;
      } else {
        userMessage = `Błąd połączenia: ${errorMessage}`;
      }
      
      console.log("[SMTP-TEST] Returning error:", userMessage);
      
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
    console.error("[SMTP-TEST] Outer error:", error);
    console.error("[SMTP-TEST] Error type:", typeof error);
    console.error("[SMTP-TEST] Error stack:", error instanceof Error ? error.stack : 'no stack');
    
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        console.error("[SMTP-TEST] Error closing connection in outer catch:", e);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : "Nieoczekiwany błąd podczas testu połączenia";
    
    console.log("[SMTP-TEST] ===== Test failed with error =====");
    
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