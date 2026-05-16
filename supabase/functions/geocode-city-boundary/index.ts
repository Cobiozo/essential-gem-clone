// Fetch city administrative boundary GeoJSON from Nominatim with DB cache.
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

const RETRY_FAIL_DAYS = 14;
const NOMINATIM_DELAY_MS = 1100;

function norm(s: string | null | undefined): string {
  return (s ?? "").trim();
}
function isUnknownCountry(c: string): boolean {
  const low = c.trim().toLowerCase();
  return !low || low === "nieznane" || low === "unknown" || low === "n/a";
}

async function nominatimBoundary(city: string, country: string) {
  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    polygon_geojson: "1",
    addressdetails: "0",
    city,
  });
  if (!isUnknownCountry(country)) params.set("country", country);
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
  const g = json[0]?.geojson;
  if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) return null;
  return g;
}

async function processQueue(
  admin: ReturnType<typeof createClient>,
  items: Item[],
) {
  let processed = 0;
  for (const it of items) {
    try {
      if (processed > 0) await new Promise((r) => setTimeout(r, NOMINATIM_DELAY_MS));
      processed++;
      const geojson = await nominatimBoundary(it.city, it.country);
      await admin.from("city_boundaries").upsert(
        {
          city: it.city,
          country: it.country,
          geojson: geojson ?? null,
          not_found: !geojson,
          last_attempt_at: new Date().toISOString(),
        },
        { onConflict: "city,country" },
      );
    } catch (e) {
      console.error("[geocode-city-boundary] item error", it, e);
    }
  }
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
    const rawItems: Item[] = Array.isArray(body?.items) ? body.items : [];

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

    const { data: cacheRows } = await admin
      .from("city_boundaries")
      .select("city,country,geojson,not_found,last_attempt_at");

    const cache = new Map<string, any>();
    (cacheRows ?? []).forEach((r: any) =>
      cache.set(
        `${(r.city || "").toLowerCase()}|${(r.country || "").toLowerCase()}`,
        r,
      ),
    );

    const retryThreshold = Date.now() - RETRY_FAIL_DAYS * 86400000;
    const results: Array<{ city: string; country: string; geojson: any | null }> = [];
    const pending: Item[] = [];

    for (const it of unique) {
      const k = `${it.city.toLowerCase()}|${it.country.toLowerCase()}`;
      const cached = cache.get(k);
      if (cached?.geojson) {
        results.push({ city: it.city, country: it.country, geojson: cached.geojson });
        continue;
      }
      if (
        cached?.not_found &&
        new Date(cached.last_attempt_at).getTime() > retryThreshold
      ) {
        results.push({ city: it.city, country: it.country, geojson: null });
        continue;
      }
      results.push({ city: it.city, country: it.country, geojson: null });
      pending.push(it);
    }

    if (pending.length > 0) {
      // @ts-expect-error EdgeRuntime is provided by Supabase
      EdgeRuntime.waitUntil(processQueue(admin, pending.slice(0, 25)));
    }

    return new Response(
      JSON.stringify({ results, pending: pending.length, total: unique.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[geocode-city-boundary] fatal", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
