import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, verifyAdmin, jsonResponse } from "../_shared/admin-auth.ts";

interface Body {
  key_id?: string;
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

  const id = (body.key_id ?? "").trim();
  if (!id) return jsonResponse({ error: "key_id is required" }, 400);

  const { data: existing, error: fetchErr } = await auth.supabaseAdmin
    .from("api_keys")
    .select("id, name, revoked_at")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !existing) return jsonResponse({ error: "Key not found" }, 404);
  if (existing.revoked_at) return jsonResponse({ error: "Key already revoked" }, 409);

  const { error: updErr } = await auth.supabaseAdmin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) {
    console.error("[admin-revoke-api-key] update error:", updErr);
    return jsonResponse({ error: "Failed to revoke key" }, 500);
  }

  await auth.supabaseAdmin.from("admin_activity_log").insert({
    admin_user_id: auth.userId,
    action_type: "api_key_revoked",
    action_description: `Odwołano klucz API: ${existing.name}`,
    target_table: "api_keys",
    target_id: id,
  }).then(() => {}, (e) => console.warn("[admin-revoke-api-key] audit log failed:", e));

  return jsonResponse({ ok: true });
});
