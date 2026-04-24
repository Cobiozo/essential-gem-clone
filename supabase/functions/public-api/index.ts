import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// CORS: szeroko otwarte (zewn. aplikacje wołają z dowolnej domeny)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, apikey, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Resource → wymagany scope
const RESOURCE_SCOPE_READ: Record<string, string> = {
  contacts: "contacts:read",
  events: "events:read",
  "event-registrations": "registrations:read",
  "auto-webinar-stats": "autowebinar-stats:read",
};

// In-memory rate limit (60 req/min per klucz). Resetowany przy cold start.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(keyId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyId);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(keyId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const url = new URL(req.url);
  const resource = url.searchParams.get("resource") ?? "";
  const endpoint = `${req.method} /public-api?resource=${resource}`;

  const logUsage = async (keyId: string | null, status: number, errorMessage?: string) => {
    if (!keyId) return;
    await supabase.from("api_key_usage_log").insert({
      api_key_id: keyId,
      endpoint,
      method: req.method,
      status_code: status,
      ip,
      user_agent: userAgent,
      error_message: errorMessage ?? null,
    }).then(() => {}, (e) => console.warn("[public-api] usage log failed:", e));
  };

  // 1) Auth header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing Authorization: Bearer <api_key>" }, 401);
  }
  const apiKey = authHeader.replace("Bearer ", "").trim();
  if (!apiKey.startsWith("plk_live_")) {
    return jsonResponse({ error: "Invalid API key format" }, 401);
  }

  // 2) Lookup po hash
  const keyHash = await sha256Hex(apiKey);
  const { data: keyRow, error: keyErr } = await supabase
    .from("api_keys")
    .select("id, scopes, revoked_at, expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyErr || !keyRow) {
    await logUsage(null, 401, "key_not_found");
    return jsonResponse({ error: "Invalid API key" }, 401);
  }
  if (keyRow.revoked_at) {
    await logUsage(keyRow.id, 401, "revoked");
    return jsonResponse({ error: "API key revoked" }, 401);
  }
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    await logUsage(keyRow.id, 401, "expired");
    return jsonResponse({ error: "API key expired" }, 401);
  }

  // 3) Rate limit
  if (!checkRateLimit(keyRow.id)) {
    await logUsage(keyRow.id, 429, "rate_limit");
    return jsonResponse({ error: "Rate limit exceeded (60 req/min)" }, 429);
  }

  // 4) Routing
  try {
    // ===== WRITE: contacts (POST) =====
    if (req.method === "POST" && resource === "contacts") {
      if (!keyRow.scopes.includes("contacts:write")) {
        await logUsage(keyRow.id, 403, "scope_missing");
        return jsonResponse({ error: "Missing scope: contacts:write" }, 403);
      }
      let body: Record<string, unknown>;
      try { body = await req.json(); } catch {
        await logUsage(keyRow.id, 400, "invalid_json");
        return jsonResponse({ error: "Invalid JSON" }, 400);
      }
      // Walidacja minimalna
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const leader_id = typeof body.leader_id === "string" ? body.leader_id : null;
      if (!name || name.length > 200) {
        await logUsage(keyRow.id, 400, "invalid_name");
        return jsonResponse({ error: "Field 'name' required (max 200 chars)" }, 400);
      }
      if (!leader_id) {
        await logUsage(keyRow.id, 400, "missing_leader_id");
        return jsonResponse({ error: "Field 'leader_id' required" }, 400);
      }
      const insertPayload: Record<string, unknown> = {
        name,
        leader_id,
        contact_type: typeof body.contact_type === "string" ? body.contact_type : "private",
        email: typeof body.email === "string" ? body.email.trim().toLowerCase().substring(0, 255) : null,
        phone: typeof body.phone === "string" ? body.phone.trim().substring(0, 50) : null,
        notes: typeof body.notes === "string" ? body.notes.substring(0, 2000) : null,
        relationship_status: typeof body.relationship_status === "string" ? body.relationship_status : "to_contact",
        source: "public-api",
      };
      const { data: created, error: insErr } = await supabase
        .from("team_contacts")
        .insert(insertPayload)
        .select("id, name, email, phone, relationship_status, created_at")
        .single();
      if (insErr) {
        await logUsage(keyRow.id, 500, insErr.message);
        return jsonResponse({ error: "Insert failed", details: insErr.message }, 500);
      }
      await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
      await logUsage(keyRow.id, 201);
      return jsonResponse({ data: created }, 201);
    }

    // ===== READ =====
    if (req.method !== "GET") {
      await logUsage(keyRow.id, 405, "method_not_allowed");
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const requiredScope = RESOURCE_SCOPE_READ[resource];
    if (!requiredScope) {
      await logUsage(keyRow.id, 400, "unknown_resource");
      return jsonResponse({
        error: "Unknown resource",
        allowed: Object.keys(RESOURCE_SCOPE_READ),
      }, 400);
    }
    if (!keyRow.scopes.includes(requiredScope)) {
      await logUsage(keyRow.id, 403, "scope_missing");
      return jsonResponse({ error: `Missing scope: ${requiredScope}` }, 403);
    }

    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50") || 50, 100);
    const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0") || 0, 0);

    let query;
    if (resource === "contacts") {
      query = supabase.from("team_contacts").select(
        "id, name, email, phone, contact_type, relationship_status, leader_id, created_at",
        { count: "exact" }
      );
      const leaderId = url.searchParams.get("leader_id");
      if (leaderId) query = query.eq("leader_id", leaderId);
    } else if (resource === "events") {
      query = supabase.from("events").select(
        "id, title, description, start_time, end_time, status, category, created_at",
        { count: "exact" }
      ).eq("is_active", true);
    } else if (resource === "event-registrations") {
      query = supabase.from("event_registrations").select(
        "id, event_id, user_id, status, registered_at",
        { count: "exact" }
      );
      const eventId = url.searchParams.get("event_id");
      if (eventId) query = query.eq("event_id", eventId);
    } else if (resource === "auto-webinar-stats") {
      // Agregat: liczba rejestracji + liczba widzów per event
      const eventId = url.searchParams.get("event_id");
      const regsQ = supabase.from("guest_event_registrations").select("id, event_id, created_at, slot_time", { count: "exact" });
      const viewsQ = supabase.from("auto_webinar_views").select("id, video_id, joined_at, watch_duration_seconds", { count: "exact" });
      const [regs, views] = await Promise.all([
        eventId ? regsQ.eq("event_id", eventId).range(offset, offset + limit - 1) : regsQ.range(offset, offset + limit - 1),
        viewsQ.range(offset, offset + limit - 1),
      ]);
      await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
      await logUsage(keyRow.id, 200);
      return jsonResponse({
        data: {
          registrations: { items: regs.data ?? [], total: regs.count ?? 0 },
          views: { items: views.data ?? [], total: views.count ?? 0 },
        },
        pagination: { limit, offset },
      });
    } else {
      await logUsage(keyRow.id, 400, "unknown_resource");
      return jsonResponse({ error: "Unknown resource" }, 400);
    }

    const { data, error: qErr, count } = await query.range(offset, offset + limit - 1).order("created_at", { ascending: false });
    if (qErr) {
      await logUsage(keyRow.id, 500, qErr.message);
      return jsonResponse({ error: "Query failed", details: qErr.message }, 500);
    }

    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
    await logUsage(keyRow.id, 200);
    return jsonResponse({
      data: data ?? [],
      pagination: { limit, offset, total: count ?? 0 },
    });
  } catch (e) {
    console.error("[public-api] unexpected error:", e);
    await logUsage(keyRow.id, 500, String(e));
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
