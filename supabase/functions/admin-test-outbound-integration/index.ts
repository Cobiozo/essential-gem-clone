import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, verifyAdmin, jsonResponse } from "../_shared/admin-auth.ts";

interface Body {
  integration_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  let body: Body;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  if (!body.integration_id) return jsonResponse({ error: "integration_id is required" }, 400);

  const { data: integ, error: iErr } = await auth.supabaseAdmin
    .from("outbound_integrations")
    .select("id, slug, base_url, auth_type, auth_header_name, default_headers, health_path")
    .eq("id", body.integration_id)
    .maybeSingle();
  if (iErr || !integ) return jsonResponse({ error: "Integration not found" }, 404);

  const secretName = `OUTBOUND_${integ.slug.toUpperCase().replace(/-/g, "_")}_API_KEY`;
  const secret = Deno.env.get(secretName);
  const secretConfigured = integ.auth_type === "none" || Boolean(secret);

  const url = (integ.base_url.replace(/\/$/, "")) + (integ.health_path ?? "/");
  const headers: Record<string, string> = {
    "User-Agent": "PureLife-OutboundProxy/1.0",
    ...(typeof integ.default_headers === "object" && integ.default_headers ? integ.default_headers as Record<string, string> : {}),
  };
  if (integ.auth_type === "bearer" && secret) headers[integ.auth_header_name || "Authorization"] = `Bearer ${secret}`;
  else if (integ.auth_type === "api_key_header" && secret) headers[integ.auth_header_name || "X-API-Key"] = secret;
  else if (integ.auth_type === "basic" && secret) headers[integ.auth_header_name || "Authorization"] = `Basic ${btoa(secret)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  const start = Date.now();
  let status = 0;
  let testStatus: "ok" | "error" = "error";
  let message = "";

  try {
    const resp = await fetch(url, { method: "GET", headers, signal: controller.signal });
    status = resp.status;
    testStatus = resp.ok ? "ok" : "error";
    message = `HTTP ${status} ${resp.statusText}`;
  } catch (e: any) {
    message = e?.name === "AbortError" ? "Timeout (15s)" : (e?.message ?? "Connection failed");
  } finally {
    clearTimeout(timeoutId);
  }

  const duration = Date.now() - start;

  await auth.supabaseAdmin.from("outbound_integrations").update({
    last_test_at: new Date().toISOString(),
    last_test_status: testStatus,
    last_test_message: message,
  }).eq("id", integ.id);

  return jsonResponse({
    status: testStatus,
    http_status: status,
    message,
    duration_ms: duration,
    secret_configured: secretConfigured,
    secret_name: secretName,
  });
});
