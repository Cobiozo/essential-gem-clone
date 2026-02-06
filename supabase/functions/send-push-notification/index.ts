import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[send-push-notification] Starting push notification send");

    const payload: PushPayload = await req.json();
    const { userId, title, body, url, tag, icon, badge, requireInteraction, data } = payload;

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get VAPID configuration
    const { data: config, error: configError } = await supabase
      .from("push_notification_config")
      .select("vapid_public_key, vapid_private_key, vapid_subject, is_enabled, icon_192_url, badge_icon_url")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    if (configError || !config?.is_enabled || !config?.vapid_public_key || !config?.vapid_private_key) {
      console.log("[send-push-notification] Push notifications not configured or disabled");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure web-push with VAPID details
    webpush.setVapidDetails(
      config.vapid_subject || "mailto:support@purelife.info.pl",
      config.vapid_public_key,
      config.vapid_private_key
    );

    // Get all subscriptions for the user
    const { data: subscriptions, error: subsError } = await supabase
      .from("user_push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subsError) {
      console.error("[send-push-notification] Error fetching subscriptions:", subsError);
      throw subsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[send-push-notification] No subscriptions found for user:", userId);
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-push-notification] Sending to ${subscriptions.length} device(s) for user ${userId}`);

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || config.icon_192_url || "/pwa-192.png",
      badge: badge || config.badge_icon_url || "/favicon.ico",
      tag: tag || `notification-${Date.now()}`,
      url: url || "/messages",
      requireInteraction: requireInteraction || false,
      data: data || {},
    });

    let sent = 0;
    let failed = 0;
    const expiredSubscriptions: string[] = [];

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        sent++;

        // Update last success timestamp
        await supabase
          .from("user_push_subscriptions")
          .update({
            last_used_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            failure_count: 0,
          })
          .eq("id", sub.id);

        // Log successful send
        await supabase.from("push_notification_logs").insert({
          subscription_id: sub.id,
          user_id: userId,
          title,
          body,
          url,
          tag,
          status: "sent",
          browser: sub.browser,
          device_type: sub.device_type,
        });

        console.log(`[send-push-notification] Sent to ${sub.browser || 'unknown'} (${sub.device_type})`);

      } catch (sendError: any) {
        failed++;
        console.error(`[send-push-notification] Failed to send to subscription ${sub.id}:`, sendError);

        // Check for expired subscription (410 Gone or 404 Not Found)
        const statusCode = sendError.statusCode || sendError.status;
        if (statusCode === 410 || statusCode === 404) {
          expiredSubscriptions.push(sub.id);
          
          // Log as expired
          await supabase.from("push_notification_logs").insert({
            subscription_id: sub.id,
            user_id: userId,
            title,
            body,
            url,
            tag,
            status: "expired",
            error_message: "Subscription expired",
            http_status: statusCode,
            browser: sub.browser,
            device_type: sub.device_type,
          });
        } else {
          // Increment failure count
          await supabase
            .from("user_push_subscriptions")
            .update({
              failure_count: (sub.failure_count || 0) + 1,
              last_used_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          // Log failed send
          await supabase.from("push_notification_logs").insert({
            subscription_id: sub.id,
            user_id: userId,
            title,
            body,
            url,
            tag,
            status: "failed",
            error_message: sendError.message || "Unknown error",
            http_status: statusCode,
            browser: sub.browser,
            device_type: sub.device_type,
          });
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      console.log(`[send-push-notification] Removing ${expiredSubscriptions.length} expired subscription(s)`);
      await supabase
        .from("user_push_subscriptions")
        .delete()
        .in("id", expiredSubscriptions);
    }

    console.log(`[send-push-notification] Complete: ${sent} sent, ${failed} failed, ${expiredSubscriptions.length} expired`);

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        expired: expiredSubscriptions.length,
        total: subscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-push-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
