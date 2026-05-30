// Shared PayU configuration helper.
// Reads PayU credentials from the public.payu_settings table (singleton),
// so admins can manage them from the in-app settings panel — no env vars needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PayUConfig {
  posId: string;
  clientId: string;
  clientSecret: string;
  md5Key: string;
  secondMd5Key: string | null;
  environment: "sandbox" | "production";
  isEnabled: boolean;
  baseUrl: string;
  oauthUrl: string;
}

export async function getPayUConfig(): Promise<PayUConfig> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey);

  const { data, error } = await supabase
    .from("payu_settings")
    .select("pos_id, client_id, client_secret, md5_key, second_md5_key, environment, is_enabled")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`PayU settings read error: ${error.message}`);
  if (!data) throw new Error("PayU is not configured. Admin must set it up in /admin/payments.");

  const required = ["pos_id", "client_id", "client_secret", "md5_key"];
  const missing = required.filter((k) => !(data as any)[k]);
  if (missing.length > 0) {
    throw new Error(
      `PayU is not fully configured. Missing: ${missing.join(", ")}. Configure in /admin/payments.`,
    );
  }

  const env = data.environment === "production" ? "production" : "sandbox";
  const baseUrl = env === "production"
    ? "https://secure.payu.com"
    : "https://secure.snd.payu.com";

  return {
    posId: data.pos_id!,
    clientId: data.client_id!,
    clientSecret: data.client_secret!,
    md5Key: data.md5_key!,
    secondMd5Key: data.second_md5_key,
    environment: env,
    isEnabled: !!data.is_enabled,
    baseUrl,
    oauthUrl: `${baseUrl}/pl/standard/user/oauth/authorize`,
  };
}

export async function getPayUAccessToken(cfg: PayUConfig): Promise<string> {
  const response = await fetch(cfg.oauthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(cfg.clientId)}&client_secret=${encodeURIComponent(cfg.clientSecret)}`,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PayU OAuth failed (${response.status}): ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  if (!data.access_token) throw new Error("PayU OAuth: no access_token in response");
  return data.access_token;
}
