import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_BASE = "https://purelife.info.pl";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const token = url.searchParams.get("token");

    console.log("[activate-email] activation request", { userId, hasToken: !!token });

    if (!userId) {
      console.error("[activate-email] Missing user_id");
      return Response.redirect(`${APP_BASE}/auth?error=invalid_link`, 302);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Load profile + token
    const { data: profile, error: profileFetchErr } = await supabase
      .from("profiles")
      .select("user_id, email_activated, activation_token, activation_token_expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileFetchErr) {
      console.error("[activate-email] Profile fetch error:", profileFetchErr);
      return Response.redirect(`${APP_BASE}/auth?error=invalid_link`, 302);
    }
    if (!profile) {
      console.warn("[activate-email] Profile not found for user_id:", userId);
      return Response.redirect(`${APP_BASE}/auth?error=invalid_link`, 302);
    }

    // 2. Token verification — REQUIRED unless account is already activated
    // (idempotency: clicking the link a second time after success still shows the success page).
    if (!profile.email_activated) {
      if (!token) {
        console.warn("[activate-email] Missing token for un-activated account");
        return Response.redirect(`${APP_BASE}/auth?error=invalid_link`, 302);
      }
      if (!profile.activation_token || profile.activation_token !== token) {
        console.warn("[activate-email] Token mismatch");
        return Response.redirect(`${APP_BASE}/auth?error=invalid_link`, 302);
      }
      if (
        profile.activation_token_expires_at &&
        new Date(profile.activation_token_expires_at).getTime() < Date.now()
      ) {
        console.warn("[activate-email] Token expired");
        return Response.redirect(`${APP_BASE}/auth?error=link_expired`, 302);
      }
    }

    // 3. Confirm email on auth.users (idempotent — safe to call repeatedly)
    const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (authUpdateErr) {
      console.error("[activate-email] auth.admin.updateUserById failed:", authUpdateErr);
      return Response.redirect(`${APP_BASE}/auth?error=activation_failed`, 302);
    }

    // 4. Mark profile activated + clear single-use token
    const { error: profileUpdateErr } = await supabase
      .from("profiles")
      .update({
        email_activated: true,
        email_activated_at: new Date().toISOString(),
        activation_token: null,
        activation_token_expires_at: null,
      })
      .eq("user_id", userId);

    if (profileUpdateErr) {
      console.error("[activate-email] Profile update error:", profileUpdateErr);
      // auth user already confirmed — continue to success
    }

    console.log("[activate-email] Account activated successfully:", userId);
    return Response.redirect(`${APP_BASE}/auth?activated=true`, 302);
  } catch (error: any) {
    console.error("[activate-email] Unexpected error:", error);
    return Response.redirect(`${APP_BASE}/auth?error=activation_failed`, 302);
  }
};

serve(handler);
