import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[auto-publish-events] Checking for events to publish...");

    // Find events where publish_at <= NOW() and is_published = false
    const now = new Date().toISOString();
    
    const { data: eventsToPublish, error: selectError } = await supabase
      .from("events")
      .select("id, title, publish_at")
      .eq("is_published", false)
      .eq("is_active", true)
      .not("publish_at", "is", null)
      .lte("publish_at", now);

    if (selectError) {
      console.error("[auto-publish-events] Error fetching events:", selectError);
      throw selectError;
    }

    if (!eventsToPublish || eventsToPublish.length === 0) {
      console.log("[auto-publish-events] No events to publish");
      return new Response(
        JSON.stringify({ success: true, message: "No events to publish", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[auto-publish-events] Found ${eventsToPublish.length} events to publish`);

    // Update each event to is_published = true
    const eventIds = eventsToPublish.map(e => e.id);
    
    const { error: updateError } = await supabase
      .from("events")
      .update({ is_published: true })
      .in("id", eventIds);

    if (updateError) {
      console.error("[auto-publish-events] Error updating events:", updateError);
      throw updateError;
    }

    const publishedTitles = eventsToPublish.map(e => e.title).join(", ");
    console.log(`[auto-publish-events] Published ${eventsToPublish.length} events: ${publishedTitles}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Published ${eventsToPublish.length} events`,
        count: eventsToPublish.length,
        events: eventsToPublish.map(e => ({ id: e.id, title: e.title }))
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[auto-publish-events] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
