// Shared helper: weryfikuje JWT i sprawdza rolę admina w tabeli user_roles.
// Zwraca { ok: true, userId, supabaseAdmin } albo { ok: false, response } gdzie
// response to gotowy 401/403 do zwrócenia z funkcji.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
};

export interface AdminAuthOk {
  ok: true;
  userId: string;
  supabaseAdmin: SupabaseClient;
}
export interface AdminAuthFail {
  ok: false;
  response: Response;
}

type JwtHeader = { alg?: string; kid?: string; typ?: string };
type JwtClaims = Record<string, unknown> & { sub?: string; exp?: number; iss?: string };

type JwtVerificationResult =
  | { ok: true; claims: JwtClaims; method: string }
  | { ok: false; reason: string; detail?: string };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJwtPart<T>(part: string): T {
  return JSON.parse(textDecoder.decode(base64UrlToBytes(part))) as T;
}

function validateClaims(claims: JwtClaims, supabaseUrl: string): JwtVerificationResult {
  if (!claims.sub || typeof claims.sub !== "string") {
    return { ok: false, reason: "missing_sub" };
  }
  if (typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1000) - 30) {
    return { ok: false, reason: "expired" };
  }
  if (typeof claims.iss === "string") {
    const expectedIssuer = `${supabaseUrl}/auth/v1`;
    if (claims.iss !== expectedIssuer) return { ok: false, reason: "invalid_issuer" };
  }
  return { ok: true, claims, method: "validated" };
}

async function verifyHs256(token: string, secret: string): Promise<boolean> {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signaturePart),
    textEncoder.encode(`${headerPart}.${payloadPart}`),
  );
}

async function verifyWithJwks(token: string, header: JwtHeader, supabaseUrl: string): Promise<boolean> {
  if (!header.kid) return false;
  const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) return false;
  const jwks = await res.json();
  const jwk = (jwks?.keys || []).find((k: JsonWebKey) => k.kid === header.kid);
  if (!jwk) return false;

  const alg = header.alg || jwk.alg;
  const importAlgorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams =
    alg === "ES256"
      ? { name: "ECDSA", namedCurve: "P-256" }
      : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
  const verifyAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams =
    alg === "ES256"
      ? { name: "ECDSA", hash: "SHA-256" }
      : { name: "RSASSA-PKCS1-v1_5" };
  const key = await crypto.subtle.importKey("jwk", jwk, importAlgorithm, false, ["verify"]);
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  return crypto.subtle.verify(
    verifyAlgorithm,
    key,
    base64UrlToBytes(signaturePart),
    textEncoder.encode(`${headerPart}.${payloadPart}`),
  );
}

async function verifyJwtClaims(token: string, supabaseUrl: string): Promise<JwtVerificationResult> {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) return { ok: false, reason: "malformed" };

  let header: JwtHeader;
  let payload: JwtClaims;
  try {
    header = decodeJwtPart<JwtHeader>(headerPart);
    payload = decodeJwtPart<JwtClaims>(payloadPart);
  } catch (e: any) {
    return { ok: false, reason: "decode_failed", detail: e?.message };
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (anonKey) {
    try {
      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: claimsData, error: claimsErr } = await (authClient.auth as any).getClaims(token);
      if (!claimsErr && claimsData?.claims?.sub) {
        const validation = validateClaims(claimsData.claims as JwtClaims, supabaseUrl);
        return validation.ok ? { ok: true, claims: validation.claims, method: "getClaims" } : validation;
      }
      console.warn("[admin-auth] getClaims failed, trying local JWT verification", {
        reason: claimsErr?.message || "missing_claims",
      });
    } catch (e: any) {
      console.warn("[admin-auth] getClaims threw, trying local JWT verification", { reason: e?.message });
    }
  }

  try {
    let signatureOk = false;
    let method = "local";
    if (header.alg === "HS256") {
      const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET");
      if (!jwtSecret) return { ok: false, reason: "jwt_secret_missing" };
      signatureOk = await verifyHs256(token, jwtSecret);
      method = "hs256";
    } else if (header.alg === "RS256" || header.alg === "ES256") {
      signatureOk = await verifyWithJwks(token, header, supabaseUrl);
      method = "jwks";
    } else {
      return { ok: false, reason: "unsupported_alg", detail: header.alg };
    }
    if (!signatureOk) return { ok: false, reason: "bad_signature" };

    const validation = validateClaims(payload, supabaseUrl);
    return validation.ok ? { ok: true, claims: validation.claims, method } : validation;
  } catch (e: any) {
    return { ok: false, reason: "local_verify_failed", detail: e?.message };
  }
}

function invalidTokenResponse(reason: string): Response {
  const expired = reason === "expired";
  return new Response(
    JSON.stringify({
      error: expired ? "Sesja wygasła. Zaloguj się ponownie." : "Invalid token",
      code: reason,
    }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export async function verifyAdmin(req: Request): Promise<any> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // 1) Zweryfikuj token lokalnie (asymetryczne signing keys) — nie wymaga aktywnej sesji po stronie GoTrue
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await (supabaseAdmin.auth as any).getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  const userId = claimsData.claims.sub as string;

  const { data: roleRow, error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleErr || !roleRow) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { ok: true, userId, supabaseAdmin };
}

// Like verifyAdmin but also allows users with an explicit row in
// ticket_verifier_access (is_enabled = true). Used by ticket verification
// endpoints that must be reachable for non-admin staff granted by admin.
export async function verifyTicketVerifier(req: Request): Promise<any> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await (supabaseAdmin.auth as any).getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  const userId = claimsData.claims.sub as string;


  // 1) Try RPC
  let hasAccess = false;
  const { data: canRow, error: rpcErr } = await supabaseAdmin
    .rpc("has_ticket_verifier_access", { _user_id: userId });
  if (!rpcErr && canRow === true) hasAccess = true;

  // 2) Fallback: direct table checks (service role bypasses RLS)
  if (!hasAccess) {
    const { data: adminRow } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (adminRow) hasAccess = true;
  }
  if (!hasAccess) {
    const { data: tvaRow } = await supabaseAdmin
      .from("ticket_verifier_access").select("is_enabled").eq("user_id", userId).maybeSingle();
    if (tvaRow?.is_enabled) hasAccess = true;
  }

  console.log("[verifyTicketVerifier]", { userId, rpcErr: rpcErr?.message, canRow, hasAccess });

  if (!hasAccess) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Forbidden: ticket verifier access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  return { ok: true, userId, supabaseAdmin };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
