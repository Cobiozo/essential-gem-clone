// Geocode cities via Nominatim with database cache. Admin-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Item = { city: string; country: string };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const RETRY_FAIL_DAYS = 7;

function norm(s: string | null | undefined): string {
  return (s ?? "").trim();
}

async function nominatim(city: string, country: string) {
  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    city,
  });
  if (country) params.set("country", country);
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const r = await fetch(url, {
    headers: {
      "User-Agent": "PurelifeAdminMap/1.0 (admin@purelife.app)",
      "Accept-Language": "pl,en",
    },
  });
  if (!r.ok) return null;
  const json = await r.json();
  if (!Array.isArray(json) || json.length === 0) return null;
  const lat = parseFloat(json[0].lat);
  const lng = parseFloat(json[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
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

    const body = await req.json().catch(() => ({}));
    const items: Item[] = Array.isArray(body?.items) ? body.items : [];
    const forceRetry = !!body?.forceRetry;

    // Dedup
    const seen = new Set<string>();
    const unique: Item[] = [];
    for (const it of items) {
      const city = norm(it.city);
      const country = norm(it.country);
      if (!city) continue;
      const k = `${city.toLowerCase()}|${country.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push({ city, country });
    }
    if (unique.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing cache rows
    const { data: cacheRows } = await admin
      .from("city_geocache")
      .select("city,country,lat,lng,not_found,last_attempt_at");

    const cache = new Map<string, any>();
    (cacheRows ?? []).forEach((r: any) => {
      cache.set(`${r.city.toLowerCase()}|${(r.country ?? "").toLowerCase()}`, r);
    });

    const results: Array<{ city: string; country: string; lat: number | null; lng: number | null }> = [];
    const retryThreshold = Date.now() - RETRY_FAIL_DAYS * 86400000;

    let geocoded = 0;
    const MAX_LOOKUPS = 40; // limit per invocation to respect Nominatim policy

    for (const it of unique) {
      const k = `${it.city.toLowerCase()}|${it.country.toLowerCase()}`;
      const cached = cache.get(k);

      if (cached && cached.lat != null && cached.lng != null && !forceRetry) {
        results.push({ city: it.city, country: it.country, lat: cached.lat, lng: cached.lng });
        continue;
      }
      if (
        cached?.not_found &&
        !forceRetry &&
        new Date(cached.last_attempt_at).getTime() > retryThreshold
      ) {
        results.push({ city: it.city, country: it.country, lat: null, lng: null });
        continue;
      }

      if (geocoded >= MAX_LOOKUPS) {
        results.push({ city: it.city, country: it.country, lat: null, lng: null });
        continue;
      }

      // Respectful delay between Nominatim calls (1.1s)
      if (geocoded > 0) await new Promise((r) => setTimeout(r, 1100));
      geocoded++;
      const found = await nominatim(it.city, it.country);

      await admin.from("city_geocache").upsert(
        {
          city: it.city,
          country: it.country,
          lat: found?.lat ?? null,
          lng: found?.lng ?? null,
          not_found: !found,
          last_attempt_at: new Date().toISOString(),
          provider: "nominatim",
        },
        { onConflict: "city,country" },
      );

      results.push({
        city: it.city,
        country: it.country,
        lat: found?.lat ?? null,
        lng: found?.lng ?? null,
      });
    }

    return new Response(
      JSON.stringify({ results, lookedUp: geocoded, total: unique.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
