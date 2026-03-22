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
    const { partner_user_id, first_name, last_name, email, phone_number, message, form_name, form_cta_key } = await req.json();

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
      contact_reason: (typeof form_name === "string" && form_name.trim()) ? form_name.trim().slice(0, 200) : "Formularz kontaktowy",
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

    // ===== POST-SUBMIT ACTIONS =====
    if (form_cta_key && typeof form_cta_key === "string") {
      try {
        const { data: formDef } = await supabase
          .from("partner_page_forms")
          .select("post_submit_actions")
          .eq("cta_key", form_cta_key)
          .eq("is_active", true)
          .maybeSingle();

        const actions = (formDef?.post_submit_actions as any[]) || [];

        for (const action of actions) {
          if (action?.type === "send_email_with_file" && action?.bp_file_id) {
            await handleSendEmailWithFile(supabase, action.bp_file_id, email.trim(), first_name.trim());
          }
        }
      } catch (actionErr) {
        // Log but don't fail the lead save
        console.error("Post-submit action error:", actionErr);
      }
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

async function handleSendEmailWithFile(
  supabase: any,
  bpFileId: string,
  recipientEmail: string,
  recipientFirstName: string
) {
  console.log(`[post-action] Sending email with BP file ${bpFileId} to ${recipientEmail}`);

  // 1. Fetch the BP file record
  const { data: bpFile, error: bpErr } = await supabase
    .from("bp_page_files")
    .select("file_name, original_name, file_url, mime_type")
    .eq("id", bpFileId)
    .single();

  if (bpErr || !bpFile) {
    console.error("[post-action] BP file not found:", bpErr);
    return;
  }

  // 2. Download the file and convert to base64
  console.log(`[post-action] Downloading file from: ${bpFile.file_url}`);
  const fileResp = await fetch(bpFile.file_url);
  if (!fileResp.ok) {
    console.error(`[post-action] Failed to download file: ${fileResp.status}`);
    return;
  }

  const fileBuffer = await fileResp.arrayBuffer();
  const uint8 = new Uint8Array(fileBuffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const fileBase64 = btoa(binary);

  console.log(`[post-action] File downloaded, size: ${uint8.length} bytes`);

  // 3. Build email HTML
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Cześć ${recipientFirstName || ''}!</h2>
      <p style="color: #555; line-height: 1.6;">
        Dziękujemy za wypełnienie formularza. W załączniku znajdziesz poradnik/e-book, który dla Ciebie przygotowaliśmy.
      </p>
      <p style="color: #555; line-height: 1.6;">
        Jeśli masz pytania, nie wahaj się z nami skontaktować.
      </p>
      <p style="color: #555; line-height: 1.6; margin-top: 30px;">
        Pozdrawiamy,<br/>
        <strong>Zespół Pure Life</strong>
      </p>
    </div>
  `;

  // 4. Call send-single-email with attachment
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const sendResp = await fetch(`${supabaseUrl}/functions/v1/send-single-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      skip_template: true,
      recipient_email: recipientEmail,
      subject: "Twój darmowy poradnik od Pure Life",
      html_body: htmlBody,
      attachments: [
        {
          filename: bpFile.original_name || bpFile.file_name,
          content_base64: fileBase64,
          content_type: bpFile.mime_type || "application/octet-stream",
        },
      ],
    }),
  });

  const sendResult = await sendResp.json();
  console.log(`[post-action] Email send result:`, sendResult);
}
