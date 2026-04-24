import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, verifyAdmin, jsonResponse, sha256Hex } from "../_shared/admin-auth.ts";

const ALLOWED_SCOPES = [
  "contacts:read",
  "events:read",
  "registrations:read",
  "autowebinar-stats:read",
  "contacts:write",
];

interface Body {
  name?: string;
  scopes?: string[];
  expires_at?: string | null;
}

function generateKey(): { key: string; prefix: string } {
  // 32-byte random → 64 hex chars; pełny klucz = `plk_live_<64 hex>`.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = `plk_live_${hex}`;
  // Prefix do wyświetlania w UI = pierwsze 12 znaków losowych
  const prefix = `plk_live_${hex.substring(0, 8)}`;
  return { key, prefix };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const name = (body.name ?? "").trim();
  const scopes = Array.isArray(body.scopes) ? body.scopes : [];
  const expires_at = body.expires_at ?? null;

  if (!name || name.length < 2 || name.length > 120) {
    return jsonResponse({ error: "Name must be between 2 and 120 characters" }, 400);
  }
  if (scopes.length === 0) {
    return jsonResponse({ error: "At least one scope is required" }, 400);
  }
  for (const s of scopes) {
    if (!ALLOWED_SCOPES.includes(s)) {
      return jsonResponse({ error: `Invalid scope: ${s}` }, 400);
    }
  }
  if (expires_at && Number.isNaN(Date.parse(expires_at))) {
    return jsonResponse({ error: "Invalid expires_at" }, 400);
  }

  const { key, prefix } = generateKey();
  const key_hash = await sha256Hex(key);

  const { data: inserted, error: insertErr } = await auth.supabaseAdmin
    .from("api_keys")
    .insert({
      name,
      key_prefix: prefix,
      key_hash,
      scopes,
      created_by: auth.userId,
      expires_at,
    })
    .select("id, name, key_prefix, scopes, created_at, expires_at")
    .single();

  if (insertErr) {
    console.error("[admin-create-api-key] insert error:", insertErr);
    return jsonResponse({ error: "Failed to create API key" }, 500);
  }

  // Audit log (best-effort, błąd nie blokuje sukcesu)
  await auth.supabaseAdmin.from("admin_activity_log").insert({
    admin_user_id: auth.userId,
    action_type: "api_key_created",
    action_description: `Wygenerowano klucz API: ${name}`,
    target_table: "api_keys",
    target_id: inserted.id,
    details: { scopes, expires_at, key_prefix: prefix },
  }).then(() => {}, (e) => console.warn("[admin-create-api-key] audit log failed:", e));

  // Pełny klucz zwracany TYLKO TUTAJ — nigdy więcej nie będzie dostępny.
  return jsonResponse({ ...inserted, full_key: key }, 201);
});
