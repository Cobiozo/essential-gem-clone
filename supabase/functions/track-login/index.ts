import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- User-Agent Parsing ---
function parseUserAgent(ua: string): { device_type: string; os_name: string; browser_name: string } {
  const uaLower = ua.toLowerCase();

  // Device type
  let device_type = "desktop";
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    device_type = "tablet";
  } else if (/iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|opera mobi/i.test(ua)) {
    device_type = "mobile";
  }

  // OS
  let os_name = "unknown";
  if (/iphone|ipad|ipod/i.test(ua)) os_name = "iOS";
  else if (/mac os x|macintosh/i.test(ua)) os_name = "macOS";
  else if (/android/i.test(ua)) os_name = "Android";
  else if (/windows/i.test(ua)) os_name = "Windows";
  else if (/linux/i.test(ua)) os_name = "Linux";
  else if (/cros/i.test(ua)) os_name = "Chrome OS";

  // Browser
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

// --- Geolocation with fallbacks ---
async function getGeolocation(ip: string): Promise<{ city: string; country: string }> {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") {
    return { city: "unknown", country: "unknown" };
  }

  // Try ip-api.com first (free, 45 req/min, works with datacenter IPs)
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,country`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.city) {
        return { city: data.city, country: data.country || "unknown" };
      }
    }
  } catch { /* fallback */ }

  // Fallback: ipwho.is
  try {
    const res = await fetch(`https://ipwho.is/${ip}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.city) {
        return { city: data.city, country: data.country || "unknown" };
      }
    }
  } catch { /* fallback */ }

  // Fallback: ipapi.co (original)
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.city) {
        return { city: data.city, country: data.country_name || "unknown" };
      }
    }
  } catch { /* all failed */ }

  return { city: "unknown", country: "unknown" };
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { device_hash, user_agent } = body;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // Parallel: geolocation + security settings
    const ua = user_agent || req.headers.get("user-agent") || "";
    const { device_type, os_name, browser_name } = parseUserAgent(ua);

    const [geo, settingRes] = await Promise.all([
      getGeolocation(ip),
      supabaseAdmin
        .from("security_settings")
        .select("setting_value")
        .eq("setting_key", "max_cities_per_hour")
        .single(),
    ]);

    const { city, country } = geo;
    const maxCities = settingRes.data?.setting_value ? Number(settingRes.data.setting_value) : 3;

    // Check for anomalies
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentLogins } = await supabaseAdmin
      .from("login_audit_log")
      .select("city")
      .eq("user_id", user.id)
      .gte("login_at", oneHourAgo);

    const cities = new Set<string>();
    if (recentLogins) {
      for (const log of recentLogins) {
        if (log.city && log.city !== "unknown") cities.add(log.city);
      }
    }
    if (city !== "unknown") cities.add(city);

    const isSuspicious = cities.size >= maxCities;
    const anomalyType = isSuspicious ? "multi_city_login" : null;

    // Insert login audit log with device info
    await supabaseAdmin.from("login_audit_log").insert({
      user_id: user.id,
      ip_address: ip,
      user_agent: ua,
      city,
      country,
      device_hash: device_hash || null,
      device_type,
      os_name,
      browser_name,
      is_suspicious: isSuspicious,
      anomaly_type: anomalyType,
    });

    if (isSuspicious) {
      await supabaseAdmin.from("security_alerts").insert({
        user_id: user.id,
        alert_type: "multi_city_login",
        severity: "critical",
        details: {
          cities: Array.from(cities),
          ip_address: ip,
          city,
          country,
          device_type,
          os_name,
          browser_name,
          detected_at: new Date().toISOString(),
        },
      });

      const { data: blockSetting } = await supabaseAdmin
        .from("security_settings")
        .select("setting_value")
        .eq("setting_key", "auto_block_on_anomaly")
        .single();

      const autoBlock = blockSetting?.setting_value === true;

      if (autoBlock) {
        try {
          await supabaseAdmin.auth.admin.signOut(user.id, "global");
        } catch (e) {
          console.error("Failed to revoke sessions:", e);
        }
      }

      const { data: adminUsers } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminUsers) {
        const notifications = adminUsers.map((admin) => ({
          user_id: admin.user_id,
          notification_type: "security_alert",
          source_module: "security",
          title: "⚠️ Anomalia bezpieczeństwa wykryta",
          message: `Konto użytkownika zalogowało się z ${cities.size} różnych miast w ciągu godziny: ${Array.from(cities).join(", ")}. ${autoBlock ? "Sesje zostały automatycznie zablokowane." : "Sprawdź aktywność w panelu bezpieczeństwa."}`,
          link: "/admin?tab=security",
          metadata: {
            alert_type: "multi_city_login",
            affected_user_id: user.id,
            cities: Array.from(cities),
          },
        }));
        await supabaseAdmin.from("user_notifications").insert(notifications);
      }
    }

    return new Response(
      JSON.stringify({ success: true, suspicious: isSuspicious, city, country }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("track-login error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
