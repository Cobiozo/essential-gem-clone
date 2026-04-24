import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, verifyAdmin, jsonResponse } from "../_shared/admin-auth.ts";

interface Body {
  integration_id?: string;
  method?: string;
  path?: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const TIMEOUT_MS = 30_000;
const MAX_BODY_BYTES = 1_048_576; // 1 MB

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

  const { integration_id, method = "GET", path = "/", query, body: payload, headers: extraHeaders } = body;
  if (!integration_id) return jsonResponse({ error: "integration_id is required" }, 400);
  const upperMethod = method.toUpperCase();
  if (!ALLOWED_METHODS.includes(upperMethod)) {
    return jsonResponse({ error: `Method not allowed. Use: ${ALLOWED_METHODS.join(", ")}` }, 400);
  }

  // 1) Wczytaj integrację
  const { data: integ, error: iErr } = await auth.supabaseAdmin
    .from("outbound_integrations")
    .select("id, slug, base_url, auth_type, auth_header_name, default_headers, enabled")
    .eq("id", integration_id)
    .maybeSingle();
  if (iErr || !integ) return jsonResponse({ error: "Integration not found" }, 404);
  if (!integ.enabled) return jsonResponse({ error: "Integration disabled" }, 400);

  // 2) Sekret
  const secretName = `OUTBOUND_${integ.slug.toUpperCase().replace(/-/g, "_")}_API_KEY`;
  const secret = Deno.env.get(secretName);
  if (integ.auth_type !== "none" && !secret) {
    return jsonResponse({
      error: `Missing secret: ${secretName}. Add it in Lovable Cloud secrets.`,
      secret_name: secretName,
    }, 500);
  }

  // 3) Buduj URL
  const baseUrl = integ.base_url.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(baseUrl + cleanPath);
  if (query && typeof query === "object") {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  }

  // 4) Headers
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "PureLife-OutboundProxy/1.0",
    ...(typeof integ.default_headers === "object" && integ.default_headers ? integ.default_headers as Record<string, string> : {}),
    ...(extraHeaders ?? {}),
  };
  if (integ.auth_type === "bearer" && secret) {
    reqHeaders[integ.auth_header_name || "Authorization"] = `Bearer ${secret}`;
  } else if (integ.auth_type === "api_key_header" && secret) {
    reqHeaders[integ.auth_header_name || "X-API-Key"] = secret;
  } else if (integ.auth_type === "basic" && secret) {
    reqHeaders[integ.auth_header_name || "Authorization"] = `Basic ${btoa(secret)}`;
  }

  // 5) Body limit
  let bodyString: string | undefined;
  if (payload !== undefined && upperMethod !== "GET" && upperMethod !== "DELETE") {
    bodyString = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (new TextEncoder().encode(bodyString).length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Request body exceeds 1MB limit" }, 413);
    }
  }

  // 6) Wywołanie z timeout-em
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let status = 0;
  let responseBody: unknown = null;
  let errorMessage: string | null = null;

  try {
    const resp = await fetch(url.toString(), {
      method: upperMethod,
      headers: reqHeaders,
      body: bodyString,
      signal: controller.signal,
    });
    status = resp.status;
    const text = await resp.text();
    try { responseBody = JSON.parse(text); } catch { responseBody = text; }
  } catch (e: any) {
    errorMessage = e?.name === "AbortError" ? "timeout" : (e?.message ?? "fetch failed");
    status = 0;
  } finally {
    clearTimeout(timeoutId);
  }

  const duration = Date.now() - start;

  // 7) Log
  await auth.supabaseAdmin.from("outbound_call_log").insert({
    integration_id,
    method: upperMethod,
    path: cleanPath,
    status_code: status || null,
    duration_ms: duration,
    error_message: errorMessage,
    caller_user_id: auth.userId,
  }).then(() => {}, (e) => console.warn("[outbound-proxy] log failed:", e));

  if (errorMessage) {
    return jsonResponse({ error: errorMessage, duration_ms: duration }, 502);
  }

  return jsonResponse({
    status,
    body: responseBody,
    duration_ms: duration,
  }, 200);
});
