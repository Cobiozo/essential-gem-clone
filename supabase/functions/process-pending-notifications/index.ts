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
    trainingReminders: { processed: 0, success: 0, failed: 0 },
    retries: { processed: 0, success: 0, failed: 0 },
    webinarReminders24h: { processed: 0, success: 0, failed: 0 },
    webinarReminders12h: { processed: 0, success: 0, failed: 0 },
    webinarReminders2h: { processed: 0, success: 0, failed: 0 },
    webinarReminders1h: { processed: 0, success: 0, failed: 0 },
    webinarReminders15min: { processed: 0, success: 0, failed: 0 },
    pushReminders: { processed: 0, success: 0, failed: 0 },
    contactReminders: { processed: 0, success: 0, failed: 0 },
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
            
            // Send Push notification (best effort)
            try {
              await supabase.functions.invoke("send-push-notification", {
                body: {
                  userId: assignment.user_id,
                  title: "Nowe szkolenie",
                  body: `Przypisano Ci moduł: ${assignment.module_title}`,
                  url: "/training",
                  tag: `training-new-${assignment.module_id}`
                }
              });
              console.log(`[CRON] Push sent for training assignment to ${assignment.user_email}`);
            } catch (pushErr) {
              console.warn(`[CRON] Push failed for training assignment (non-blocking):`, pushErr);
            }
            
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

    // 5. Process webinar guest reminders via bulk function — all windows
    // Delegate to send-bulk-webinar-reminders for each event in each reminder window
    if (!results.stoppedEarly) {
      console.log("[CRON] Step 5: Processing webinar guest reminders (bulk) for all windows...");

      const now = new Date();

      // Define time windows for each reminder type
      const reminderWindows: Array<{
        type: string;
        minMinutes: number;
        maxMinutes: number;
        resultKey: 'webinarReminders24h' | 'webinarReminders1h' | 'webinarReminders15min';
      }> = [
        { type: "24h", minMinutes: 23.5 * 60, maxMinutes: 25 * 60, resultKey: "webinarReminders24h" },
        { type: "12h", minMinutes: 11.5 * 60, maxMinutes: 12.5 * 60, resultKey: "webinarReminders24h" },
        { type: "2h", minMinutes: 110, maxMinutes: 130, resultKey: "webinarReminders24h" },
        { type: "1h", minMinutes: 50, maxMinutes: 70, resultKey: "webinarReminders1h" },
        { type: "15min", minMinutes: 10, maxMinutes: 20, resultKey: "webinarReminders15min" },
      ];

      for (const window of reminderWindows) {
        if (isTimeoutApproaching()) {
          results.stoppedEarly = true;
          break;
        }

        const fromTime = new Date(now.getTime() + window.minMinutes * 60 * 1000).toISOString();
        const toTime = new Date(now.getTime() + window.maxMinutes * 60 * 1000).toISOString();

        const { data: webinars, error: wErr } = await supabase
          .from("events")
          .select("id, title")
          .gte("start_time", fromTime)
          .lte("start_time", toTime)
          .eq("is_active", true)
          .eq("event_type", "webinar");

        if (wErr) {
          console.error(`[CRON] Error fetching webinars for ${window.type}:`, wErr);
          continue;
        }

        if (!webinars || webinars.length === 0) {
          console.log(`[CRON] No webinars in ${window.type} window`);
          continue;
        }

        for (const webinar of webinars) {
          if (isTimeoutApproaching()) {
            results.stoppedEarly = true;
            break;
          }

          console.log(`[CRON] Invoking bulk reminders (${window.type}) for: ${webinar.title}`);
          try {
            const { data: bulkResult, error: bulkError } = await supabase.functions.invoke(
              "send-bulk-webinar-reminders",
              { body: { event_id: webinar.id, reminder_type: window.type } }
            );

            if (bulkError) {
              console.error(`[CRON] Bulk ${window.type} failed for ${webinar.title}:`, bulkError);
              results[window.resultKey].failed++;
            } else {
              const res = bulkResult as any;
              results[window.resultKey].processed += res?.total || 0;
              results[window.resultKey].success += res?.sent || 0;
              results[window.resultKey].failed += res?.failed || 0;
              console.log(`[CRON] Bulk ${window.type} for "${webinar.title}": sent=${res?.sent}, failed=${res?.failed}`);
            }
          } catch (err) {
            console.error(`[CRON] Exception invoking bulk ${window.type}:`, err);
            results[window.resultKey].failed++;
          }
        }
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

    // 7. Process training reminders (for inactive users) - skip if stopped early
    if (!results.stoppedEarly) {
      console.log("[CRON] Finding training reminders due...");
      
      const { data: remindersDue, error: reminderError } = await supabase
        .rpc("get_training_reminders_due");

      if (reminderError) {
        console.error("[CRON] Error fetching training reminders:", reminderError);
      } else if (remindersDue && remindersDue.length > 0) {
        console.log(`[CRON] Found ${remindersDue.length} training reminders to send`);
        
        for (const reminder of remindersDue) {
          // Check timeout before processing
          if (isTimeoutApproaching()) {
            console.log("[CRON] Approaching timeout limit, stopping training reminders");
            results.stoppedEarly = true;
            break;
          }
          
          // Add 1 second delay between emails (except first one)
          if (results.trainingReminders.processed > 0) {
            console.log("[CRON] Waiting 1 second before next training reminder...");
            await delay(1000);
          }
          
          results.trainingReminders.processed++;
          try {
            // Call send-training-reminder function
            const { error: sendError } = await supabase.functions.invoke("send-training-reminder", {
              body: {
                userId: reminder.user_id,
                moduleId: reminder.module_id,
                daysInactive: reminder.days_inactive,
                progressPercent: reminder.progress_percent,
                assignmentId: reminder.assignment_id
              }
            });
            
            if (sendError) {
              console.error(`[CRON] Failed to send training reminder to ${reminder.user_email}:`, sendError);
              results.trainingReminders.failed++;
            } else {
              console.log(`[CRON] Sent training reminder to ${reminder.user_email} for module: ${reminder.module_title} (${reminder.days_inactive} days inactive, ${reminder.progress_percent}% complete)`);
              results.trainingReminders.success++;
              
              // Send Push notification (best effort)
              try {
                await supabase.functions.invoke("send-push-notification", {
                  body: {
                    userId: reminder.user_id,
                    title: "Przypomnienie o szkoleniu",
                    body: `Moduł "${reminder.module_title}" czeka — ukończyłeś ${reminder.progress_percent}%`,
                    url: "/training",
                    tag: `training-reminder-${reminder.module_id}`
                  }
                });
                console.log(`[CRON] Push sent for training reminder to ${reminder.user_email}`);
              } catch (pushErr) {
                console.warn(`[CRON] Push failed for training reminder (non-blocking):`, pushErr);
              }
            }
          } catch (err) {
            console.error(`[CRON] Exception sending training reminder:`, err);
            results.trainingReminders.failed++;
          }
        }
      } else {
        console.log("[CRON] No training reminders due");
      }
    }

    // ===== 8. WEB PUSH REMINDERS (configurable per-event) =====
    if (!isTimeoutApproaching()) {
      console.log("[CRON] Step 8: Processing web push reminders...");
      
      const now = new Date();
      // Fetch events with push reminders enabled, starting within 32 minutes
      const windowEnd = new Date(now.getTime() + 32 * 60 * 1000);
      
      const { data: pushEvents, error: pushEventsError } = await supabase
        .from("events")
        .select("id, title, start_time, push_reminder_minutes")
        .eq("push_reminder_enabled", true)
        .eq("is_active", true)
        .not("push_reminder_minutes", "is", null)
        .gte("start_time", now.toISOString())
        .lte("start_time", windowEnd.toISOString());

      if (pushEventsError) {
        console.error("[CRON] Error fetching push events:", pushEventsError);
      } else if (pushEvents && pushEvents.length > 0) {
        console.log(`[CRON] Found ${pushEvents.length} events with push reminders to check`);
        
        for (const event of pushEvents) {
          if (isTimeoutApproaching()) {
            results.stoppedEarly = true;
            break;
          }
          
          const eventStart = new Date(event.start_time);
          const minutesUntilStart = Math.round((eventStart.getTime() - now.getTime()) / 60000);
          
          // Parse configured reminder minutes
          let reminderMinutes: number[] = [];
          try {
            const raw = event.push_reminder_minutes;
            reminderMinutes = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
          } catch {
            continue;
          }
          
          for (const configuredMinutes of reminderMinutes) {
            // Check if current time falls within tolerance window: [configured - 2, configured + 2]
            if (minutesUntilStart < configuredMinutes - 2 || minutesUntilStart > configuredMinutes + 2) {
              continue;
            }
            
            console.log(`[CRON] Push reminder ${configuredMinutes}min for event "${event.title}" (actual: ${minutesUntilStart}min left)`);
            
            // Get registered users
            const { data: registrations } = await supabase
              .from("event_registrations")
              .select("user_id")
              .eq("event_id", event.id)
              .eq("status", "registered");
            
            if (!registrations || registrations.length === 0) continue;
            
            // Format time for notification body
            const warsawTime = eventStart.toLocaleString("pl-PL", { 
              timeZone: "Europe/Warsaw", 
              hour: "2-digit", 
              minute: "2-digit" 
            });
            
            for (const reg of registrations) {
              if (isTimeoutApproaching()) { results.stoppedEarly = true; break; }
              
              // Check if already sent
              const { data: alreadySent } = await supabase
                .from("event_push_reminders_sent")
                .select("id")
                .eq("event_id", event.id)
                .eq("user_id", reg.user_id)
                .eq("reminder_minutes", configuredMinutes)
                .maybeSingle();
              
              if (alreadySent) continue;
              
              results.pushReminders.processed++;
              
              try {
                await supabase.functions.invoke("send-push-notification", {
                  body: {
                    userId: reg.user_id,
                    title: `Webinar za ${minutesUntilStart} min: ${event.title}`,
                    body: `Rozpoczęcie o ${warsawTime} (Warsaw)`,
                    url: `/events`,
                    tag: `webinar-push-${event.id}-${configuredMinutes}`,
                  },
                });
                
                // Log sent reminder
                await supabase.from("event_push_reminders_sent").insert({
                  event_id: event.id,
                  user_id: reg.user_id,
                  reminder_minutes: configuredMinutes,
                });
                
                results.pushReminders.success++;
                console.log(`[CRON] Push reminder sent to user ${reg.user_id} for "${event.title}" (${minutesUntilStart}min)`);
              } catch (err) {
                console.error(`[CRON] Push reminder failed:`, err);
                results.pushReminders.failed++;
              }
            }
          }
        }
      } else {
        console.log("[CRON] No push reminders due");
      }
    }

    // ===== 8b. CONTACT REMINDERS (team_contacts reminder_date) =====
    // Reminders fire when reminder_date <= NOW() — the user picks the exact date+time in the form
    if (!isTimeoutApproaching()) {
      console.log("[CRON] Step 8b: Processing contact reminders...");

      const { data: dueReminders, error: remindersFetchError } = await supabase
        .from("team_contacts")
        .select("id, user_id, first_name, last_name, reminder_note, reminder_date")
        .lte("reminder_date", new Date().toISOString())
        .eq("is_active", true)
        .not("reminder_date", "is", null)
        .or("reminder_sent.eq.false,reminder_sent.is.null");

      if (remindersFetchError) {
        console.error("[CRON] Error fetching contact reminders:", remindersFetchError);
      } else if (dueReminders && dueReminders.length > 0) {
        console.log(`[CRON] Found ${dueReminders.length} contact reminders due`);

        // Fetch contact_reminder event type id for email
        const { data: contactReminderEventType } = await supabase
          .from("notification_event_types")
          .select("id")
          .eq("event_key", "contact_reminder")
          .maybeSingle();

        for (const contact of dueReminders) {
          if (isTimeoutApproaching()) {
            results.stoppedEarly = true;
            break;
          }

          if (results.contactReminders.processed > 0) {
            await delay(1000);
          }

          results.contactReminders.processed++;

          const contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Kontakt';
          const message = contact.reminder_note
            ? `${contactName}: ${contact.reminder_note}`
            : `Zaplanowane przypomnienie o kontakcie ${contactName}`;

          const reminderDateFormatted = contact.reminder_date
            ? new Date(contact.reminder_date).toLocaleString('pl-PL', {
                timeZone: 'Europe/Warsaw',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) + ' (Warsaw)'
            : '';

          try {
            // 1. In-app notification
            await supabase.from("user_notifications").insert({
              user_id: contact.user_id,
              notification_type: "reminder",
              source_module: "team_contacts",
              title: "Przypomnienie o kontakcie",
              message,
              link: "/my-account?tab=team-contacts",
              metadata: {
                contact_id: contact.id,
                contact_name: contactName,
                reminder_date: contact.reminder_date,
              },
            });

            // 2. Web Push (best effort)
            try {
              await supabase.functions.invoke("send-push-notification", {
                body: {
                  userId: contact.user_id,
                  title: "Przypomnienie o kontakcie",
                  body: message,
                  url: "/my-account?tab=team-contacts",
                  tag: `contact-reminder-${contact.id}`,
                },
              });
              console.log(`[CRON] Push sent for contact reminder: ${contactName}`);
            } catch (pushErr) {
              console.warn("[CRON] Push failed for contact reminder (non-blocking):", pushErr);
            }

            // 3. Email via send-notification-email (if event type exists)
            if (contactReminderEventType?.id) {
              try {
                await supabase.functions.invoke("send-notification-email", {
                  body: {
                    event_type_id: contactReminderEventType.id,
                    recipient_user_id: contact.user_id,
                    payload: {
                      kontakt: contactName,
                      notatka: contact.reminder_note || '',
                      data_przypomnienia: reminderDateFormatted,
                      message,
                      link: "/my-account?tab=team-contacts",
                    },
                  },
                });
                console.log(`[CRON] Email sent for contact reminder: ${contactName}`);
              } catch (emailErr) {
                console.warn("[CRON] Email failed for contact reminder (non-blocking):", emailErr);
              }
            }

            // 4. Mark as sent
            await supabase
              .from("team_contacts")
              .update({ reminder_sent: true })
              .eq("id", contact.id);

            results.contactReminders.success++;
            console.log(`[CRON] Contact reminder processed for: ${contactName}`);
          } catch (err) {
            console.error(`[CRON] Exception processing contact reminder for ${contactName}:`, err);
            results.contactReminders.failed++;
          }
        }
      } else {
        console.log("[CRON] No contact reminders due");
      }
    }

    // 9. Update job log with results
    const totalProcessed = results.welcomeEmails.processed + results.trainingNotifications.processed + results.trainingReminders.processed + results.retries.processed + results.webinarReminders24h.processed + results.webinarReminders1h.processed + results.pushReminders.processed + results.contactReminders.processed;
    const totalSuccess = results.welcomeEmails.success + results.trainingNotifications.success + results.trainingReminders.success + results.retries.success + results.webinarReminders24h.success + results.webinarReminders1h.success + results.pushReminders.success + results.contactReminders.success;
    
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
