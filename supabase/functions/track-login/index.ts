import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get auth user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { device_hash, user_agent } = body;

    // Get IP from headers (Supabase edge functions)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // Geolocation via free API
    let city = "unknown";
    let country = "unknown";
    try {
      if (ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
          signal: AbortSignal.timeout(3000),
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          city = geo.city || "unknown";
          country = geo.country_name || "unknown";
        }
      }
    } catch {
      // Geolocation failed — continue with unknown
    }

    // Get max_cities_per_hour setting
    const { data: settingData } = await supabaseAdmin
      .from("security_settings")
      .select("setting_value")
      .eq("setting_key", "max_cities_per_hour")
      .single();

    const maxCities = settingData?.setting_value
      ? Number(settingData.setting_value)
      : 3;

    // Check for anomalies: distinct cities in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentLogins } = await supabaseAdmin
      .from("login_audit_log")
      .select("city")
      .eq("user_id", user.id)
      .gte("login_at", oneHourAgo);

    // Collect distinct cities including current login
    const cities = new Set<string>();
    if (recentLogins) {
      for (const log of recentLogins) {
        if (log.city && log.city !== "unknown") cities.add(log.city);
      }
    }
    if (city !== "unknown") cities.add(city);

    const isSuspicious = cities.size >= maxCities;
    const anomalyType = isSuspicious ? "multi_city_login" : null;

    // Insert login audit log
    await supabaseAdmin.from("login_audit_log").insert({
      user_id: user.id,
      ip_address: ip,
      user_agent: user_agent || req.headers.get("user-agent"),
      city,
      country,
      device_hash: device_hash || null,
      is_suspicious: isSuspicious,
      anomaly_type: anomalyType,
    });

    if (isSuspicious) {
      // Create security alert
      await supabaseAdmin.from("security_alerts").insert({
        user_id: user.id,
        alert_type: "multi_city_login",
        severity: "critical",
        details: {
          cities: Array.from(cities),
          ip_address: ip,
          city,
          country,
          detected_at: new Date().toISOString(),
        },
      });

      // Check auto_block setting
      const { data: blockSetting } = await supabaseAdmin
        .from("security_settings")
        .select("setting_value")
        .eq("setting_key", "auto_block_on_anomaly")
        .single();

      const autoBlock = blockSetting?.setting_value === true;

      if (autoBlock) {
        // Revoke all sessions for this user via admin API
        try {
          await supabaseAdmin.auth.admin.signOut(user.id, "global");
        } catch (e) {
          console.error("Failed to revoke sessions:", e);
        }
      }

      // Notify all admins
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
      JSON.stringify({
        success: true,
        suspicious: isSuspicious,
        city,
        country,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("track-login error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
