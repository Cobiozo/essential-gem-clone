import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partner_user_id, first_name, last_name, email, phone_number, message } = await req.json();

    // Validation
    if (!partner_user_id || typeof partner_user_id !== "string") {
      return new Response(JSON.stringify({ error: "partner_user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!first_name || typeof first_name !== "string" || first_name.trim().length === 0 || first_name.length > 100) {
      return new Response(JSON.stringify({ error: "Valid first_name is required (max 100 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitize = (val: unknown, maxLen = 200): string | null => {
      if (!val || typeof val !== "string") return null;
      return val.trim().slice(0, maxLen) || null;
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify partner_user_id exists
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", partner_user_id)
      .single();

    if (!partnerProfile) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notesArr: string[] = [];
    if (message && typeof message === "string" && message.trim()) {
      notesArr.push(message.trim().slice(0, 1000));
    }

    const { error } = await supabase.from("team_contacts").insert({
      user_id: partner_user_id,
      first_name: first_name.trim().slice(0, 100),
      last_name: sanitize(last_name, 100) || "",
      email: email.trim().slice(0, 255),
      phone_number: sanitize(phone_number, 30),
      role: "client",
      contact_type: "private",
      contact_source: "Strona partnerska",
      contact_reason: "Formularz kontaktowy",
      notes: notesArr.length > 0 ? notesArr.join("\n") : null,
      added_at: new Date().toISOString().split("T")[0],
      is_active: true,
    });

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to save lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
