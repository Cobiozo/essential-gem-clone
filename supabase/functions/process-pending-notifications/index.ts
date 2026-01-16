import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CronJobLog {
  id: string;
  job_name: string;
  started_at: string;
  status: string;
}

interface UserWithoutWelcome {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface RetryableEmail {
  id: string;
  recipient_user_id: string;
  recipient_email: string;
  subject: string;
  template_id: string | null;
  email_type: string;
  metadata: Record<string, unknown>;
  retry_count: number;
}

interface TrainingAssignment {
  assignment_id: string;
  user_id: string;
  module_id: string;
  user_email: string;
  user_first_name: string;
  module_title: string;
  assigned_at: string;
}

// Helper function for delay between emails
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Maximum execution time (55s to stay under Edge Function 60s limit)
const MAX_EXECUTION_TIME_MS = 55000;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  // Check for force parameter (bypasses interval check for manual runs)
  let forceRun = false;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      forceRun = body.force === true;
    } catch {
      // No body or invalid JSON, continue with forceRun = false
    }
  }
  
  // Check if we're approaching timeout
  const isTimeoutApproaching = () => Date.now() - startTime > MAX_EXECUTION_TIME_MS;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const results = {
    welcomeEmails: { processed: 0, success: 0, failed: 0 },
    trainingNotifications: { processed: 0, success: 0, failed: 0 },
    retries: { processed: 0, success: 0, failed: 0 },
    webinarReminders: { processed: 0, success: 0, failed: 0 },
    stoppedEarly: false,
  };
  
  let jobLogId: string | null = null;

  try {
    console.log("[CRON] Starting process-pending-notifications job...");
    
    // 0. Check cron_settings for interval and enabled status
    const { data: cronSettings } = await supabase
      .from("cron_settings")
      .select("*")
      .eq("job_name", "process-pending-notifications")
      .maybeSingle();

    if (cronSettings) {
      // Check if cron is disabled
      if (!cronSettings.is_enabled) {
        console.log("[CRON] Job is disabled, skipping");
        return new Response(
          JSON.stringify({ skipped: true, reason: "Job is disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if interval has passed since last run (skip for force run)
      if (cronSettings.last_run_at && !forceRun) {
        const lastRun = new Date(cronSettings.last_run_at).getTime();
        const intervalMs = cronSettings.interval_minutes * 60 * 1000;
        const now = Date.now();
        
        if (now - lastRun < intervalMs) {
          const nextRunInMinutes = Math.ceil((intervalMs - (now - lastRun)) / 60000);
          console.log(`[CRON] Interval not reached, skipping. Next run in ${nextRunInMinutes} minutes`);
          return new Response(
            JSON.stringify({ 
              skipped: true, 
              reason: "Interval not reached",
              next_run_in_minutes: nextRunInMinutes
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (forceRun) {
        console.log("[CRON] Force run requested, skipping interval check");
      }
    }
    
    // 1. Check for running job (prevent overlapping executions)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: runningJob } = await supabase
      .from("cron_job_logs")
      .select("id, started_at")
      .eq("job_name", "process-pending-notifications")
      .eq("status", "running")
      .gte("started_at", twoHoursAgo)
      .maybeSingle();

    if (runningJob) {
      console.log("[CRON] Job already running, skipping. Started at:", runningJob.started_at);
      
      // Log skipped execution
      await supabase.from("cron_job_logs").insert({
        job_name: "process-pending-notifications",
        status: "skipped",
        completed_at: new Date().toISOString(),
        details: { reason: "Job already running", running_job_id: runningJob.id }
      });
      
      return new Response(
        JSON.stringify({ skipped: true, reason: "Job already running" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create job log entry
    const { data: jobLog, error: logError } = await supabase
      .from("cron_job_logs")
      .insert({ job_name: "process-pending-notifications" })
      .select()
      .single();

    if (logError || !jobLog) {
      console.error("[CRON] Failed to create job log:", logError);
      throw new Error("Failed to create job log");
    }
    
    jobLogId = jobLog.id;
    console.log("[CRON] Created job log:", jobLogId);

    // Update cron_settings with current run info
    const intervalMinutes = cronSettings?.interval_minutes || 180;
    await supabase
      .from("cron_settings")
      .update({ 
        last_run_at: new Date().toISOString(),
        next_run_at: new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString()
      })
      .eq("job_name", "process-pending-notifications");

    // 3. Process users without welcome email
    console.log("[CRON] Finding users without welcome email...");
    const { data: usersWithoutWelcome, error: welcomeError } = await supabase
      .rpc("get_users_without_welcome_email");

    if (welcomeError) {
      console.error("[CRON] Error fetching users without welcome:", welcomeError);
    } else if (usersWithoutWelcome && usersWithoutWelcome.length > 0) {
      console.log(`[CRON] Found ${usersWithoutWelcome.length} users without welcome email`);
      
      for (const user of usersWithoutWelcome as UserWithoutWelcome[]) {
        // Check timeout before processing
        if (isTimeoutApproaching()) {
          console.log("[CRON] Approaching timeout limit, stopping welcome emails");
          results.stoppedEarly = true;
          break;
        }
        
        // Add 1 second delay between emails (except first one)
        if (results.welcomeEmails.processed > 0) {
          console.log("[CRON] Waiting 1 second before next welcome email...");
          await delay(1000);
        }
        
        results.welcomeEmails.processed++;
        try {
          // Call send-welcome-email function
          const { error: sendError } = await supabase.functions.invoke("send-welcome-email", {
            body: {
              userId: user.user_id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              role: user.role
            }
          });
          
          if (sendError) {
            console.error(`[CRON] Failed to send welcome email to ${user.email}:`, sendError);
            results.welcomeEmails.failed++;
          } else {
            console.log(`[CRON] Sent welcome email to ${user.email}`);
            results.welcomeEmails.success++;
          }
        } catch (err) {
          console.error(`[CRON] Exception sending welcome email to ${user.email}:`, err);
          results.welcomeEmails.failed++;
        }
      }
    } else {
      console.log("[CRON] No users without welcome email found");
    }

    // 4. Process training assignments without notification
    console.log("[CRON] Finding training assignments without notification...");
    const { data: trainingsWithoutNotification, error: trainingError } = await supabase
      .rpc("get_training_assignments_without_notification");

    if (trainingError) {
      console.error("[CRON] Error fetching training assignments:", trainingError);
    } else if (trainingsWithoutNotification && trainingsWithoutNotification.length > 0) {
      console.log(`[CRON] Found ${trainingsWithoutNotification.length} training assignments without notification`);
      
      for (const assignment of trainingsWithoutNotification as TrainingAssignment[]) {
        // Check timeout before processing
        if (isTimeoutApproaching()) {
          console.log("[CRON] Approaching timeout limit, stopping training notifications");
          results.stoppedEarly = true;
          break;
        }
        
        // Add 1 second delay between emails (except first one)
        if (results.trainingNotifications.processed > 0) {
          console.log("[CRON] Waiting 1 second before next training notification...");
          await delay(1000);
        }
        
        results.trainingNotifications.processed++;
        try {
          // Call send-training-notification function
          const { error: sendError } = await supabase.functions.invoke("send-training-notification", {
            body: {
              userId: assignment.user_id,
              moduleId: assignment.module_id,
              email: assignment.user_email,
              firstName: assignment.user_first_name,
              moduleTitle: assignment.module_title
            }
          });
          
          if (sendError) {
            console.error(`[CRON] Failed to send training notification to ${assignment.user_email}:`, sendError);
            results.trainingNotifications.failed++;
          } else {
            console.log(`[CRON] Sent training notification to ${assignment.user_email} for module: ${assignment.module_title}`);
            results.trainingNotifications.success++;
            
            // Mark as notified
            await supabase
              .from("training_assignments")
              .update({ notification_sent: true })
              .eq("id", assignment.assignment_id);
          }
        } catch (err) {
          console.error(`[CRON] Exception sending training notification:`, err);
          results.trainingNotifications.failed++;
        }
      }
    } else {
      console.log("[CRON] No training assignments without notification found");
    }

    // 5. Process webinar reminders (24h before event) - skip if stopped early
    if (!results.stoppedEarly) {
      console.log("[CRON] Finding webinars starting in next 24-30 hours...");
      
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const thirtyHoursFromNow = new Date(now.getTime() + 30 * 60 * 60 * 1000).toISOString();
      
      const { data: upcomingWebinars, error: webinarError } = await supabase
        .from("events")
        .select("id, title, start_time, zoom_link, host_name, location")
        .gte("start_time", twentyFourHoursFromNow)
        .lte("start_time", thirtyHoursFromNow)
        .eq("is_active", true)
        .eq("event_type", "webinar");

      if (webinarError) {
        console.error("[CRON] Error fetching upcoming webinars:", webinarError);
      } else if (upcomingWebinars && upcomingWebinars.length > 0) {
        console.log(`[CRON] Found ${upcomingWebinars.length} webinars starting in 24-30 hours`);
        
        for (const webinar of upcomingWebinars) {
          if (isTimeoutApproaching()) {
            console.log("[CRON] Approaching timeout limit, stopping webinar reminders");
            results.stoppedEarly = true;
            break;
          }
          
          // Get guests who haven't received a reminder
          const { data: guests, error: guestError } = await supabase
            .from("guest_event_registrations")
            .select("id, email, first_name, last_name")
            .eq("event_id", webinar.id)
            .eq("reminder_sent", false)
            .eq("status", "registered");

          if (guestError) {
            console.error(`[CRON] Error fetching guests for webinar ${webinar.id}:`, guestError);
            continue;
          }

          if (!guests || guests.length === 0) {
            console.log(`[CRON] No guests to remind for webinar: ${webinar.title}`);
            continue;
          }

          console.log(`[CRON] Found ${guests.length} guests to remind for webinar: ${webinar.title}`);

          for (const guest of guests) {
            if (isTimeoutApproaching()) {
              results.stoppedEarly = true;
              break;
            }

            if (results.webinarReminders.processed > 0) {
              console.log("[CRON] Waiting 1 second before next webinar reminder...");
              await delay(1000);
            }

            results.webinarReminders.processed++;
            try {
              // Format date for display
              const eventDate = new Date(webinar.start_time);
              const formattedDate = eventDate.toLocaleDateString('pl-PL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              const formattedTime = eventDate.toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit'
              });

              // Send reminder email using send-webinar-confirmation with isReminder flag
              const { error: sendError } = await supabase.functions.invoke("send-webinar-confirmation", {
                body: {
                  email: guest.email,
                  firstName: guest.first_name,
                  lastName: guest.last_name,
                  eventTitle: webinar.title,
                  eventDate: formattedDate,
                  eventTime: formattedTime,
                  zoomLink: webinar.zoom_link || webinar.location || '',
                  hostName: webinar.host_name || 'Zespół Pure Life',
                  isReminder: true
                }
              });

              if (sendError) {
                console.error(`[CRON] Failed to send webinar reminder to ${guest.email}:`, sendError);
                results.webinarReminders.failed++;
              } else {
                console.log(`[CRON] Sent webinar reminder to ${guest.email} for: ${webinar.title}`);
                results.webinarReminders.success++;

                // Mark reminder as sent
                await supabase
                  .from("guest_event_registrations")
                  .update({ 
                    reminder_sent: true, 
                    reminder_sent_at: new Date().toISOString() 
                  })
                  .eq("id", guest.id);
              }
            } catch (err) {
              console.error(`[CRON] Exception sending webinar reminder to ${guest.email}:`, err);
              results.webinarReminders.failed++;
            }
          }
        }
      } else {
        console.log("[CRON] No webinars starting in next 24-30 hours");
      }
    }

    // 6. Retry failed emails (max 3 attempts) - skip if stopped early
    if (!results.stoppedEarly) {
      console.log("[CRON] Finding failed emails to retry...");
      const { data: failedEmails, error: retryError } = await supabase
        .rpc("get_retryable_failed_emails");

      if (retryError) {
        console.error("[CRON] Error fetching failed emails:", retryError);
      } else if (failedEmails && failedEmails.length > 0) {
        console.log(`[CRON] Found ${failedEmails.length} failed emails to retry`);
        
        for (const email of failedEmails as RetryableEmail[]) {
          // Check timeout before processing
          if (isTimeoutApproaching()) {
            console.log("[CRON] Approaching timeout limit, stopping retries");
            results.stoppedEarly = true;
            break;
          }
          
          // Add 1 second delay between emails (except first one)
          if (results.retries.processed > 0) {
            console.log("[CRON] Waiting 1 second before next retry...");
            await delay(1000);
          }
          
          results.retries.processed++;
          try {
            const newRetryCount = (email.retry_count || 0) + 1;
            
            // Call retry-failed-email function (no auth required)
            const { error: sendError } = await supabase.functions.invoke("retry-failed-email", {
              body: {
                email_log_id: email.id,
                recipient_email: email.recipient_email,
                subject: email.subject,
                template_id: email.template_id,
                retry_count: newRetryCount
              }
            });
            
            if (sendError) {
              console.error(`[CRON] Retry failed for email ${email.id}:`, sendError);
              results.retries.failed++;
              
              // Update retry count in original email log
              await supabase
                .from("email_logs")
                .update({ 
                  metadata: { ...email.metadata, retry_count: newRetryCount, last_retry_at: new Date().toISOString() }
                })
                .eq("id", email.id);
            } else {
              console.log(`[CRON] Retry successful for email ${email.id}`);
              results.retries.success++;
            }
          } catch (err) {
            console.error(`[CRON] Exception retrying email ${email.id}:`, err);
            results.retries.failed++;
          }
        }
      } else {
        console.log("[CRON] No failed emails to retry");
      }
    }

    // 7. Update job log with results
    const totalProcessed = results.welcomeEmails.processed + results.trainingNotifications.processed + results.retries.processed + results.webinarReminders.processed;
    const totalSuccess = results.welcomeEmails.success + results.trainingNotifications.success + results.retries.success + results.webinarReminders.success;
    
    await supabase
      .from("cron_job_logs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        processed_count: totalProcessed,
        details: results
      })
      .eq("id", jobLogId);

    console.log(`[CRON] Job completed. Processed: ${totalProcessed}, Success: ${totalSuccess}`);
    console.log("[CRON] Results:", JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: totalProcessed,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[CRON] Job failed with error:", error);
    
    // Update job log with failure
    if (jobLogId) {
      await supabase
        .from("cron_job_logs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error),
          details: results
        })
        .eq("id", jobLogId);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        results 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
