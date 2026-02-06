import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[get-vapid-public-key] Fetching public VAPID config");

    // Use service role to read config (this is a public endpoint)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("push_notification_config")
      .select("vapid_public_key, is_enabled, icon_192_url, icon_512_url, badge_icon_url, default_title, default_body, translations")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    if (error) {
      console.error("[get-vapid-public-key] Database error:", error);
      return new Response(
        JSON.stringify({ enabled: false, error: "Configuration not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if push notifications are enabled and configured
    if (!data?.is_enabled || !data?.vapid_public_key) {
      console.log("[get-vapid-public-key] Push notifications disabled or not configured");
      return new Response(
        JSON.stringify({ enabled: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-vapid-public-key] Returning public config");

    return new Response(
      JSON.stringify({
        enabled: true,
        publicKey: data.vapid_public_key,
        icon: data.icon_192_url || "/pwa-192.png",
        icon512: data.icon_512_url,
        badge: data.badge_icon_url || "/favicon.ico",
        defaultTitle: data.default_title || "Pure Life Center",
        defaultBody: data.default_body || "Masz nową wiadomość",
        translations: data.translations,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[get-vapid-public-key] Error:", error);
    return new Response(
      JSON.stringify({ enabled: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
