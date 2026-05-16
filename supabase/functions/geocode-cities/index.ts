// Geocode cities via Nominatim with DB cache + background processing.
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
const NOMINATIM_DELAY_MS = 1100;

function norm(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function isUnknownCountry(c: string): boolean {
  const low = c.trim().toLowerCase();
  return !low || low === "nieznane" || low === "unknown" || low === "n/a";
}

async function nominatimSearch(city: string, country: string) {
  const tryFetch = async (params: URLSearchParams) => {
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "PurelifeAdminMap/1.0 (admin@purelife.app)",
        "Accept-Language": "pl,en",
      },
    });
    if (!r.ok) {
      console.warn(`[nominatim] HTTP ${r.status} for ${url}`);
      return null;
    }
    const json = await r.json();
    if (!Array.isArray(json) || json.length === 0) return null;
    const lat = parseFloat(json[0].lat);
    const lng = parseFloat(json[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    const display_country: string | null =
      json[0]?.address?.country ?? null;
    return { lat, lng, display_country };
  };

  // 1) structured search with city + country (if real country)
  if (!isUnknownCountry(country)) {
    const p = new URLSearchParams({
      format: "json",
      limit: "1",
      addressdetails: "1",
      city,
      country,
    });
    const r = await tryFetch(p);
    if (r) return r;
  }

  // 2) structured city-only
  const p2 = new URLSearchParams({
    format: "json",
    limit: "1",
    addressdetails: "1",
    city,
  });
  const r2 = await tryFetch(p2);
  if (r2) return r2;

  // 3) free-text q=
  const q = isUnknownCountry(country) ? city : `${city}, ${country}`;
  const p3 = new URLSearchParams({
    format: "json",
    limit: "1",
    addressdetails: "1",
    q,
  });
  return await tryFetch(p3);
}

async function processQueue(
  admin: ReturnType<typeof createClient>,
  items: Item[],
  forceRetry: boolean,
) {
  console.log(`[geocode-cities] background: processing ${items.length} items`);
  const retryThreshold = Date.now() - RETRY_FAIL_DAYS * 86400000;
  let processed = 0;

  for (const it of items) {
    try {
      // re-check cache (another invocation may have written it)
      const { data: existing } = await admin
        .from("city_geocache")
        .select("lat,lng,not_found,last_attempt_at")
        .eq("city", it.city)
        .eq("country", it.country)
        .maybeSingle();

      if (
        existing &&
        ((existing.lat != null && existing.lng != null) ||
          (existing.not_found &&
            !forceRetry &&
            new Date(existing.last_attempt_at).getTime() > retryThreshold))
      ) {
        continue;
      }

      if (processed > 0) {
        await new Promise((r) => setTimeout(r, NOMINATIM_DELAY_MS));
      }
      processed++;

      const found = await nominatimSearch(it.city, it.country);
      const { error: upErr } = await admin.from("city_geocache").upsert(
        {
          city: it.city,
          country: it.country,
          lat: found?.lat ?? null,
          lng: found?.lng ?? null,
          display_country: found?.display_country ?? null,
          not_found: !found,
          last_attempt_at: new Date().toISOString(),
          provider: "nominatim",
        },
        { onConflict: "city,country" },
      );
      if (upErr) console.error("[geocode-cities] upsert error", upErr);
      else {
        console.log(
          `[geocode-cities] ${found ? "FOUND" : "MISS"} ${it.city} / ${it.country || "(no country)"}`,
        );
      }
    } catch (e) {
      console.error("[geocode-cities] item error", it, e);
    }
  }
  console.log(`[geocode-cities] background: done, processed ${processed}`);
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

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      console.warn("[geocode-cities] auth fail", userErr);
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
      console.warn("[geocode-cities] not admin", userRes.user.id);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawItems: Item[] = Array.isArray(body?.items) ? body.items : [];
    const forceRetry = !!body?.forceRetry;

    // Dedup + sanitize
    const seen = new Set<string>();
    const unique: Item[] = [];
    for (const it of rawItems) {
      const city = norm(it.city);
      let country = norm(it.country);
      if (!city) continue;
      if (isUnknownCountry(country)) country = "";
      const k = `${city.toLowerCase()}|${country.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push({ city, country });
    }

    if (unique.length === 0) {
      return new Response(JSON.stringify({ results: [], pending: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load cache for these items in one query
    const { data: cacheRows } = await admin
      .from("city_geocache")
      .select("city,country,lat,lng,display_country,not_found,last_attempt_at");

    const cache = new Map<string, any>();
    (cacheRows ?? []).forEach((r: any) => {
      cache.set(
        `${(r.city || "").toLowerCase()}|${(r.country || "").toLowerCase()}`,
        r,
      );
    });

    const retryThreshold = Date.now() - RETRY_FAIL_DAYS * 86400000;
    const results: Array<{
      city: string;
      country: string;
      lat: number | null;
      lng: number | null;
      display_country: string | null;
    }> = [];
    const pending: Item[] = [];

    for (const it of unique) {
      const k = `${it.city.toLowerCase()}|${it.country.toLowerCase()}`;
      const cached = cache.get(k);

      if (cached?.lat != null && cached?.lng != null && !forceRetry) {
        results.push({
          city: it.city,
          country: it.country,
          lat: cached.lat,
          lng: cached.lng,
          display_country: cached.display_country ?? null,
        });
        continue;
      }
      if (
        cached?.not_found &&
        !forceRetry &&
        new Date(cached.last_attempt_at).getTime() > retryThreshold
      ) {
        results.push({
          city: it.city,
          country: it.country,
          lat: null,
          lng: null,
          display_country: cached.display_country ?? null,
        });
        continue;
      }

      results.push({
        city: it.city,
        country: it.country,
        lat: null,
        lng: null,
        display_country: cached?.display_country ?? null,
      });
      pending.push(it);
    }

    // Kick off background processing for missing items.
    if (pending.length > 0) {
      // @ts-expect-error EdgeRuntime is provided by Supabase
      EdgeRuntime.waitUntil(processQueue(admin, pending, forceRetry));
    }

    return new Response(
      JSON.stringify({
        results,
        pending: pending.length,
        total: unique.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[geocode-cities] fatal", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
