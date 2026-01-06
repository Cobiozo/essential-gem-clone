import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const supabaseLink = url.searchParams.get("supabase_link");
    
    console.log("[activate-email] Processing activation for user:", userId);

    if (!userId) {
      console.error("[activate-email] Missing user_id parameter");
      const origin = "https://xzlhssqqbajqhnsmbucf.lovableproject.com";
      return Response.redirect(`${origin}/auth?error=invalid_link`, 302);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the user's email_activated status
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        email_activated: true,
        email_activated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[activate-email] Error updating profile:", updateError);
      // Even if there's an error updating, still redirect to Supabase link
      // The user might already be activated
    } else {
      console.log("[activate-email] Email activated successfully for user:", userId);
    }

    // Redirect to the original Supabase activation link
    // This will complete the Supabase auth flow
    if (supabaseLink) {
      const decodedLink = decodeURIComponent(supabaseLink);
      console.log("[activate-email] Redirecting to Supabase link");
      return Response.redirect(decodedLink, 302);
    }

    // Fallback: redirect to auth page with success
    const origin = "https://xzlhssqqbajqhnsmbucf.lovableproject.com";
    return Response.redirect(`${origin}/auth?activated=true`, 302);

  } catch (error: any) {
    console.error("[activate-email] Error:", error);
    const origin = "https://xzlhssqqbajqhnsmbucf.lovableproject.com";
    return Response.redirect(`${origin}/auth?error=activation_failed`, 302);
  }
};

serve(handler);
