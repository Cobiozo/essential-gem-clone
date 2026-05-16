// Admin-only: fills profiles.country for users that have city but no country,
// using city_geocache.display_country (geocodes missing cities first).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const NOMINATIM_DELAY_MS = 1100;

async function nominatim(city: string) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
    { format: "json", limit: "1", addressdetails: "1", city },
  )}`;
  const r = await fetch(url, {
    headers: {
      "User-Agent": "PurelifeAdminMap/1.0 (admin@purelife.app)",
      "Accept-Language": "pl,en",
    },
  });
  if (!r.ok) return null;
  const json = await r.json();
  if (!Array.isArray(json) || json.length === 0) return null;
  return {
    lat: parseFloat(json[0].lat),
    lng: parseFloat(json[0].lon),
    country: json[0]?.address?.country ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Profile rows with city but missing country
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id,city,country")
      .not("city", "is", null)
      .or("country.is.null,country.eq.");
    if (profErr) throw profErr;

    const rows = (profiles ?? []) as Array<{
      id: string;
      city: string | null;
      country: string | null;
    }>;

    // Group unique cities
    const cityMap = new Map<string, string>(); // cityLower -> displayCity
    rows.forEach((p) => {
      const c = (p.city ?? "").trim();
      if (!c) return;
      cityMap.set(c.toLowerCase(), c);
    });

    // Load existing cache
    const { data: cacheRows } = await admin
      .from("city_geocache")
      .select("city,display_country");
    const cityCountry = new Map<string, string>(); // cityLower -> country
    (cacheRows ?? []).forEach((r: any) => {
      if (r.display_country) {
        cityCountry.set((r.city || "").toLowerCase(), r.display_country);
      }
    });

    // Geocode missing ones (sequential, 1.1s gap)
    let geocoded = 0;
    for (const [low, original] of cityMap) {
      if (cityCountry.has(low)) continue;
      if (geocoded > 0) await new Promise((r) => setTimeout(r, NOMINATIM_DELAY_MS));
      geocoded++;
      const found = await nominatim(original);
      await admin.from("city_geocache").upsert(
        {
          city: original,
          country: "",
          lat: found?.lat ?? null,
          lng: found?.lng ?? null,
          display_country: found?.country ?? null,
          not_found: !found,
          last_attempt_at: new Date().toISOString(),
          provider: "nominatim",
        },
        { onConflict: "city,country" },
      );
      if (found?.country) cityCountry.set(low, found.country);
    }

    // Update profiles
    let updated = 0;
    let missing = 0;
    for (const p of rows) {
      const c = (p.city ?? "").trim().toLowerCase();
      const country = cityCountry.get(c);
      if (country) {
        const { error } = await admin
          .from("profiles")
          .update({ country })
          .eq("id", p.id);
        if (!error) updated++;
      } else {
        missing++;
      }
    }

    return new Response(
      JSON.stringify({
        scanned: rows.length,
        geocoded,
        updated,
        missing,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[backfill-profile-countries] fatal", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
