import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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
    console.log("[generate-vapid-keys] Starting VAPID key generation");

    // Authorization - verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("[generate-vapid-keys] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      console.warn("[generate-vapid-keys] Non-admin user attempted to generate keys:", user.id);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body for optional subject
    let subject = "mailto:support@purelife.info.pl";
    try {
      const body = await req.json();
      if (body.subject && body.subject.startsWith("mailto:")) {
        subject = body.subject;
      }
    } catch {
      // Use default subject
    }

    // Generate VAPID keys
    console.log("[generate-vapid-keys] Generating new VAPID keys...");
    const vapidKeys = webpush.generateVAPIDKeys();

    // Save to database
    const { error: updateError } = await supabase
      .from("push_notification_config")
      .update({
        vapid_public_key: vapidKeys.publicKey,
        vapid_private_key: vapidKeys.privateKey,
        vapid_subject: subject,
        keys_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", "00000000-0000-0000-0000-000000000001");

    if (updateError) {
      console.error("[generate-vapid-keys] Database update error:", updateError);
      throw updateError;
    }

    console.log("[generate-vapid-keys] New VAPID keys generated and saved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        publicKey: vapidKeys.publicKey,
        generatedAt: new Date().toISOString(),
        // Note: Private key is NOT returned to the client for security
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[generate-vapid-keys] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
