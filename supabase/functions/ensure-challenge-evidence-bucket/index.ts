import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const allowedMimes = [
    "image/png", "image/jpeg", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const { data: existing } = await supabase.storage.getBucket("challenge-evidence");
  let result: any;
  if (!existing) {
    const { data, error } = await supabase.storage.createBucket("challenge-evidence", {
      public: false,
      fileSizeLimit: 10485760,
      allowedMimeTypes: allowedMimes,
    });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    result = { created: true, data };
  } else {
    const { data, error } = await supabase.storage.updateBucket("challenge-evidence", {
      public: false,
      fileSizeLimit: 10485760,
      allowedMimeTypes: allowedMimes,
    });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    result = { created: false, updated: true, data };
  }

  return new Response(JSON.stringify({ ok: true, ...result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
