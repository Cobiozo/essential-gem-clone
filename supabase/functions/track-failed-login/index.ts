import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseUserAgent(ua: string): { device_type: string; os_name: string; browser_name: string } {
  let device_type = "desktop";
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    device_type = "tablet";
  } else if (/iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|opera mobi/i.test(ua)) {
    device_type = "mobile";
  }

  let os_name = "unknown";
  if (/iphone|ipad|ipod/i.test(ua)) os_name = "iOS";
  else if (/mac os x|macintosh/i.test(ua)) os_name = "macOS";
  else if (/android/i.test(ua)) os_name = "Android";
  else if (/windows/i.test(ua)) os_name = "Windows";
  else if (/linux/i.test(ua)) os_name = "Linux";
  else if (/cros/i.test(ua)) os_name = "Chrome OS";

  let browser_name = "unknown";
  if (/edg\//i.test(ua)) browser_name = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser_name = "Opera";
  else if (/samsungbrowser/i.test(ua)) browser_name = "Samsung Browser";
  else if (/ucbrowser/i.test(ua)) browser_name = "UC Browser";
  else if (/firefox|fxios/i.test(ua)) browser_name = "Firefox";
  else if (/crios/i.test(ua)) browser_name = "Chrome";
  else if (/chrome|chromium/i.test(ua)) browser_name = "Chrome";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser_name = "Safari";

  return { device_type, os_name, browser_name };
}

async function getGeolocation(ip: string): Promise<{ city: string; country: string }> {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") {
    return { city: "unknown", country: "unknown" };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,country`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.city) return { city: data.city, country: data.country || "unknown" };
    }
  } catch { /* fallback */ }
  try {
    const res = await fetch(`https://ipwho.is/${ip}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.city) return { city: data.city, country: data.country || "unknown" };
    }
  } catch { /* fallback */ }
  return { city: "unknown", country: "unknown" };
}

function mapFailureReason(errorCode: string): string {
  const code = errorCode.toLowerCase();
  if (code.includes("invalid login") || code.includes("invalid_credentials")) return "invalid_password";
  if (code.includes("email not confirmed")) return "email_not_confirmed";
  if (code.includes("user not found")) return "user_not_found";
  if (code.includes("too many requests") || code.includes("rate limit")) return "too_many_requests";
  if (code.includes("disabled") || code.includes("banned")) return "account_disabled";
  return "unknown_error";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { email, error_code, user_agent } = body;

    if (!email || !error_code) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // Rate limit: max 10 failed inserts per IP per 15 min
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("login_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .eq("login_status", "failed")
      .gte("login_at", fifteenMinAgo);

    if ((count || 0) >= 10) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ua = user_agent || req.headers.get("user-agent") || "";
    const { device_type, os_name, browser_name } = parseUserAgent(ua);

    // Find user_id by email (optional)
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    const geo = await getGeolocation(ip);
    const failureReason = mapFailureReason(error_code);

    await supabaseAdmin.from("login_audit_log").insert({
      user_id: profileData?.user_id || "00000000-0000-0000-0000-000000000000",
      ip_address: ip,
      user_agent: ua,
      city: geo.city,
      country: geo.country,
      device_type,
      os_name,
      browser_name,
      is_suspicious: false,
      login_status: "failed",
      failure_reason: failureReason,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("track-failed-login error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
