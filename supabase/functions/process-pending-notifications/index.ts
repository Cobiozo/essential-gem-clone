import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { warsawLocalToUtc } from "../_shared/timezone-utils.ts";

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
    webinarReminders24h: { processed: 0, success: 0, failed: 0, guests: 0, users: 0 },
    webinarReminders12h: { processed: 0, success: 0, failed: 0, guests: 0, users: 0 },
    webinarReminders2h: { processed: 0, success: 0, failed: 0, guests: 0, users: 0 },
    webinarReminders1h: { processed: 0, success: 0, failed: 0, guests: 0, users: 0 },
    webinarReminders15min: { processed: 0, success: 0, failed: 0, guests: 0, users: 0 },
    pushReminders: { processed: 0, success: 0, failed: 0 },
    contactReminders: { processed: 0, success: 0, failed: 0 },
    postEventThankYou: { processed: 0, success: 0, failed: 0 },
    inactivityWarnings: { processed: 0, success: 0, failed: 0 },
    inactivityBlocks: { processed: 0, success: 0, failed: 0 },
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
      // CRITICAL: Never skip if there are events in 1h or 15min windows — these carry join links
      if (cronSettings.last_run_at && !forceRun) {
        const lastRun = new Date(cronSettings.last_run_at).getTime();
        const intervalMs = cronSettings.interval_minutes * 60 * 1000;
        const now = Date.now();
        
        if (now - lastRun < intervalMs) {
          // Before skipping, check if critical reminder windows (1h, 15min) have events
          const supabaseCheck = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          const from15 = new Date(now + 10 * 60 * 1000).toISOString();
          const to15 = new Date(now + 20 * 60 * 1000).toISOString();
          const from1h = new Date(now + 50 * 60 * 1000).toISOString();
          const to1h = new Date(now + 70 * 60 * 1000).toISOString();

          const { data: criticalEvents } = await supabaseCheck
            .from("events")
            .select("id")
            .eq("is_active", true)
            .or(`and(start_time.gte.${from15},start_time.lte.${to15}),and(start_time.gte.${from1h},start_time.lte.${to1h})`)
            .limit(1);

          if (!criticalEvents || criticalEvents.length === 0) {
            const nextRunInMinutes = Math.ceil((intervalMs - (now - lastRun)) / 60000);
            console.log(`[CRON] Interval not reached, no critical events, skipping. Next run in ${nextRunInMinutes} minutes`);
            return new Response(
              JSON.stringify({ 
                skipped: true, 
                reason: "Interval not reached",
                next_run_in_minutes: nextRunInMinutes
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            console.log(`[CRON] Interval not reached BUT critical events found in 1h/15min window — forcing run for link delivery`);
          }
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
    const intervalMinutes = cronSettings?.interval_minutes || 5;
    await supabase
      .from("cron_settings")
      .update({ 
        last_run_at: new Date().toISOString(),
        next_run_at: new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString()
      })
      .eq("job_name", "process-pending-notifications");

    // 2b. Auto-close stale guest registrations for single-occurrence events whose end_time has passed
    try {
      const now = new Date();
      const { data: pastSingleEvents } = await supabase
        .from("events")
        .select("id, title, end_time")
        .lt("end_time", now.toISOString())
        .eq("is_active", true)
        .is("occurrences", null);

      for (const evt of (pastSingleEvents || [])) {
        // Close guest registrations
        const { data: staleGuests } = await supabase
          .from("guest_event_registrations")
          .update({ status: "completed" })
          .eq("event_id", evt.id)
          .eq("status", "registered")
          .select("id");

        if (staleGuests && staleGuests.length > 0) {
          console.log(`[CRON] Closed ${staleGuests.length} stale guest registrations for ended event: ${evt.title}`);
        }

        // Close user registrations
        const { data: staleUserRegs } = await supabase
          .from("event_registrations")
          .update({ status: "completed" })
          .eq("event_id", evt.id)
          .eq("status", "registered")
          .select("id");

        if (staleUserRegs && staleUserRegs.length > 0) {
          console.log(`[CRON] Closed ${staleUserRegs.length} stale user registrations for ended event: ${evt.title}`);
        }
      }
    } catch (autoCloseError) {
      console.error("[CRON] Error auto-closing stale registrations:", autoCloseError);
    }

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
        
        // Short delay between emails to avoid SMTP overload
        if (results.welcomeEmails.processed > 0) {
          await delay(200);
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
        
        // Short delay between emails to avoid SMTP overload
        if (results.trainingNotifications.processed > 0) {
          await delay(200);
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

    // 5. Process webinar/training reminders via bulk function — all windows
    // NOW: expand occurrences for cyclic events so each term gets its own reminders
    if (!results.stoppedEarly) {
      console.log("[CRON] Step 5: Processing webinar reminders (per-occurrence) for all windows...");

      const now = new Date();

      // Define time windows for each reminder type
      const reminderWindows: Array<{
        type: string;
        minMinutes: number;
        maxMinutes: number;
        resultKey: 'webinarReminders24h' | 'webinarReminders12h' | 'webinarReminders2h' | 'webinarReminders1h' | 'webinarReminders15min';
      }> = [
        { type: "24h", minMinutes: 1420, maxMinutes: 1460, resultKey: "webinarReminders24h" },
        { type: "12h", minMinutes: 700, maxMinutes: 740, resultKey: "webinarReminders12h" },
        { type: "2h", minMinutes: 110, maxMinutes: 130, resultKey: "webinarReminders2h" },
        { type: "1h", minMinutes: 50, maxMinutes: 70, resultKey: "webinarReminders1h" },
        { type: "15min", minMinutes: 10, maxMinutes: 20, resultKey: "webinarReminders15min" },
      ];

      // Fetch ALL active webinar/team_training events (we'll check times per-term)
      const maxWindowMinutes = 1460; // 24h20m = max window
      const fetchFrom = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // at least 10min in future
      const fetchTo = new Date(now.getTime() + maxWindowMinutes * 60 * 1000).toISOString();

      const { data: allEvents, error: eventsErr } = await supabase
        .from("events")
        .select("id, title, start_time, end_time, occurrences")
        .eq("is_active", true)
        .in("event_type", ["webinar", "team_training"]);

      if (eventsErr) {
        console.error("[CRON] Error fetching events for reminders:", eventsErr);
      } else if (allEvents && allEvents.length > 0) {
        // For each event, expand to a list of {event_id, title, occurrence_index, occurrence_datetime}
        interface TermInstance {
          event_id: string;
          title: string;
          occurrence_index: number | null;
          occurrence_datetime: Date;
        }

        const allTerms: TermInstance[] = [];

        for (const evt of allEvents) {
          let occs: any[] | null = null;
          if (evt.occurrences) {
            if (Array.isArray(evt.occurrences)) occs = evt.occurrences;
            else if (typeof evt.occurrences === 'string') {
              try { occs = JSON.parse(evt.occurrences); } catch { occs = null; }
            }
          }

          if (occs && occs.length > 0) {
            // Cyclic event: expand each occurrence
            for (let i = 0; i < occs.length; i++) {
              const occ = occs[i];
              if (!occ.date || !occ.time) continue;
              // DST-aware: parse Warsaw local time to correct UTC
              const dt = warsawLocalToUtc(occ.date, occ.time);
              allTerms.push({ event_id: evt.id, title: evt.title, occurrence_index: i, occurrence_datetime: dt });
            }
          } else {
            // Single-occurrence event
            allTerms.push({
              event_id: evt.id,
              title: evt.title,
              occurrence_index: null,
              occurrence_datetime: new Date(evt.start_time),
            });
          }
        }

        console.log(`[CRON] Expanded ${allEvents.length} events into ${allTerms.length} term instances`);

        // For each reminder window, find matching terms
        for (const window of reminderWindows) {
          if (isTimeoutApproaching()) {
            results.stoppedEarly = true;
            break;
          }

          const fromMs = now.getTime() + window.minMinutes * 60 * 1000;
          const toMs = now.getTime() + window.maxMinutes * 60 * 1000;

          const matchingTerms = allTerms.filter(t => {
            const ms = t.occurrence_datetime.getTime();
            return ms >= fromMs && ms <= toMs;
          });

          if (matchingTerms.length === 0) {
            console.log(`[CRON] No terms in ${window.type} window`);
            continue;
          }

          // Process matching terms in parallel chunks of 3
          const TERM_CHUNK_SIZE = 3;
          for (let ti = 0; ti < matchingTerms.length; ti += TERM_CHUNK_SIZE) {
            if (isTimeoutApproaching()) {
              results.stoppedEarly = true;
              break;
            }

            const termChunk = matchingTerms.slice(ti, ti + TERM_CHUNK_SIZE);
            console.log(`[CRON] Invoking bulk reminders (${window.type}) for ${termChunk.length} terms in parallel`);

            const chunkResults = await Promise.allSettled(
              termChunk.map(async (term) => {
                console.log(`[CRON]   → ${term.title} [occ=${term.occurrence_index}, dt=${term.occurrence_datetime.toISOString()}]`);
                const { data: bulkResult, error: bulkError } = await supabase.functions.invoke(
                  "send-bulk-webinar-reminders",
                  {
                    body: {
                      event_id: term.event_id,
                      reminder_type: window.type,
                      occurrence_index: term.occurrence_index,
                      occurrence_datetime: term.occurrence_datetime.toISOString(),
                    }
                  }
                );
                if (bulkError) throw bulkError;
                return bulkResult;
              })
            );

            for (const cr of chunkResults) {
              if (cr.status === 'fulfilled') {
                const res = cr.value as any;
                results[window.resultKey].processed += res?.total || 0;
                results[window.resultKey].success += res?.sent || 0;
                results[window.resultKey].failed += res?.failed || 0;
                results[window.resultKey].guests += res?.guests || 0;
                results[window.resultKey].users += res?.users || 0;
              } else {
                console.error(`[CRON] Bulk ${window.type} failed:`, cr.reason);
                results[window.resultKey].failed++;
              }
            }
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
          
          // Short delay between emails to avoid SMTP overload
          if (results.retries.processed > 0) {
            await delay(200);
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

    // 7. Process training reminders (GROUPED per user) - skip if stopped early
    if (!results.stoppedEarly) {
      console.log("[CRON] Finding training reminders due (grouped by user)...");
      
      const { data: remindersDue, error: reminderError } = await supabase
        .rpc("get_training_reminders_due");

      if (reminderError) {
        console.error("[CRON] Error fetching training reminders:", reminderError);
      } else if (remindersDue && remindersDue.length > 0) {
        console.log(`[CRON] Found ${remindersDue.length} training reminders to send`);
        
        // Group reminders by user_id
        const groupedByUser = new Map<string, typeof remindersDue>();
        for (const reminder of remindersDue) {
          const existing = groupedByUser.get(reminder.user_id) || [];
          existing.push(reminder);
          groupedByUser.set(reminder.user_id, existing);
        }
        
        console.log(`[CRON] Grouped into ${groupedByUser.size} users`);
        
        for (const [userId, userReminders] of groupedByUser) {
          if (isTimeoutApproaching()) {
            console.log("[CRON] Approaching timeout limit, stopping training reminders");
            results.stoppedEarly = true;
            break;
          }
          
          if (results.trainingReminders.processed > 0) {
            await delay(200);
          }
          
          results.trainingReminders.processed++;
          try {
            // Build modules list for grouped email
            const modules = userReminders.map((r: any) => ({
              moduleId: r.module_id,
              moduleTitle: r.module_title,
              progressPercent: r.progress_percent,
              daysInactive: r.days_inactive,
              assignmentId: r.assignment_id,
            }));
            
            // Call grouped reminder function
            const { error: sendError } = await supabase.functions.invoke("send-training-reminder-grouped", {
              body: { userId, modules }
            });
            
            if (sendError) {
              console.error(`[CRON] Failed to send grouped training reminder for user ${userId}:`, sendError);
              results.trainingReminders.failed++;
            } else {
              console.log(`[CRON] Sent grouped training reminder to user ${userId} for ${modules.length} modules`);
              results.trainingReminders.success++;
              
              // Send single Push notification (best effort)
              try {
                const pushBody = modules.length === 1
                  ? `Moduł „${modules[0].moduleTitle}" czeka — ukończyłeś ${modules[0].progressPercent}%`
                  : `${modules.length} modułów szkoleniowych czeka na kontynuację`;
                await supabase.functions.invoke("send-push-notification", {
                  body: {
                    userId,
                    title: "Przypomnienie o szkoleniu",
                    body: pushBody,
                    url: "/training",
                    tag: `training-reminder-grouped-${userId}`
                  }
                });
              } catch (pushErr) {
                console.warn(`[CRON] Push failed for training reminder (non-blocking):`, pushErr);
              }
            }
          } catch (err) {
            console.error(`[CRON] Exception sending grouped training reminder:`, err);
            results.trainingReminders.failed++;
          }
        }
      } else {
        console.log("[CRON] No training reminders due");
      }
    }

    // 7b. INACTIVITY WARNINGS (14 days without login)
    if (!results.stoppedEarly && !isTimeoutApproaching()) {
      console.log("[CRON] Step 7b: Processing inactivity warnings...");
      
      const { data: inactiveWarningUsers, error: warningError } = await supabase
        .rpc("get_inactive_users_for_warning");

      if (warningError) {
        console.error("[CRON] Error fetching inactive users for warning:", warningError);
      } else if (inactiveWarningUsers && inactiveWarningUsers.length > 0) {
        console.log(`[CRON] Found ${inactiveWarningUsers.length} users for inactivity warning`);
        
        for (const u of inactiveWarningUsers) {
          if (isTimeoutApproaching()) { results.stoppedEarly = true; break; }
          if (results.inactivityWarnings.processed > 0) await delay(200);
          
          results.inactivityWarnings.processed++;
          try {
            const { error: sendError } = await supabase.functions.invoke("send-inactivity-warning", {
              body: { userId: u.user_id, daysInactive: u.days_inactive }
            });
            
            if (sendError) {
              console.error(`[CRON] Failed to send inactivity warning to ${u.email}:`, sendError);
              results.inactivityWarnings.failed++;
            } else {
              console.log(`[CRON] Sent inactivity warning to ${u.email} (${u.days_inactive} days inactive)`);
              results.inactivityWarnings.success++;
            }
          } catch (err) {
            console.error(`[CRON] Exception sending inactivity warning:`, err);
            results.inactivityWarnings.failed++;
          }
        }
      } else {
        console.log("[CRON] No users need inactivity warning");
      }
    }

    // 7c. INACTIVITY BLOCKING (30 days without login)
    if (!results.stoppedEarly && !isTimeoutApproaching()) {
      console.log("[CRON] Step 7c: Processing inactivity blocks...");
      
      const { data: inactiveBlockUsers, error: blockError } = await supabase
        .rpc("get_inactive_users_for_blocking");

      if (blockError) {
        console.error("[CRON] Error fetching inactive users for blocking:", blockError);
      } else if (inactiveBlockUsers && inactiveBlockUsers.length > 0) {
        console.log(`[CRON] Found ${inactiveBlockUsers.length} users for inactivity blocking`);
        
        for (const u of inactiveBlockUsers) {
          if (isTimeoutApproaching()) { results.stoppedEarly = true; break; }
          
          results.inactivityBlocks.processed++;
          try {
            // Block the user
            await supabase
              .from("profiles")
              .update({
                is_active: false,
                blocked_at: new Date().toISOString(),
                block_reason: 'inactivity_30_days',
                updated_at: new Date().toISOString()
              })
              .eq("user_id", u.user_id);
            
            console.log(`[CRON] Blocked user ${u.email} for ${u.days_inactive} days of inactivity`);
            results.inactivityBlocks.success++;
            
            // Create admin notification about the block
            await supabase.from("user_notifications").insert({
              user_id: u.user_id,
              notification_type: "system",
              source_module: "inactivity",
              title: "Konto zablokowane z powodu braku aktywności",
              message: `Twoje konto zostało zablokowane po ${u.days_inactive} dniach braku aktywności. Skontaktuj się z support@purelife.info.pl lub swoim opiekunem, aby odblokować dostęp.`,
              metadata: { event: 'inactivity_block', days_inactive: u.days_inactive },
            });
          } catch (err) {
            console.error(`[CRON] Exception blocking inactive user ${u.email}:`, err);
            results.inactivityBlocks.failed++;
          }
        }
      } else {
        console.log("[CRON] No users need inactivity blocking");
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
              
              // Check if already sent — for recurring events, ignore old sends (>25h before start_time)
              const resetThreshold = new Date(eventStart.getTime() - 25 * 60 * 60 * 1000).toISOString();
              const { data: alreadySent } = await supabase
                .from("event_push_reminders_sent")
                .select("id, sent_at")
                .eq("event_id", event.id)
                .eq("user_id", reg.user_id)
                .eq("reminder_minutes", configuredMinutes)
                .maybeSingle();
              
              if (alreadySent) {
                // If sent before the reset threshold, delete old record and re-send
                if (alreadySent.sent_at && alreadySent.sent_at < resetThreshold) {
                  await supabase
                    .from("event_push_reminders_sent")
                    .delete()
                    .eq("id", alreadySent.id);
                  console.log(`[CRON] Reset stale push reminder for user ${reg.user_id}, event "${event.title}"`);
                } else {
                  continue;
                }
              }
              
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
            await delay(200);
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

    // ===== 9. POST-EVENT THANK YOU EMAILS =====
    if (!isTimeoutApproaching()) {
      console.log("[CRON] Step 9: Processing post-event thank you emails...");

      const twoHoursAgo2 = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();

      // Find events that ended within last 2 hours (base end_time OR occurrence-based)
      const { data: endedEvents, error: endedErr } = await supabase
        .from("events")
        .select("id, title, end_time, host_user_id, created_by, occurrences")
        .eq("is_active", true);

      if (endedErr) {
        console.error("[CRON] Error fetching events for post-event:", endedErr);
      } else if (endedEvents && endedEvents.length > 0) {
        // Expand events with occurrences to find which ones just ended
        const twoHoursAgoMs = Date.now() - 2 * 60 * 60 * 1000;
        const nowMs = Date.now();
        
        interface EndedTerm {
          event: typeof endedEvents[0];
          occurrence_date: string | null;
          occurrence_time: string | null;
        }
        
        const endedTerms: EndedTerm[] = [];
        
        for (const evt of endedEvents) {
          const occs = evt.occurrences && Array.isArray(evt.occurrences) ? evt.occurrences : [];
          if (occs.length > 1) {
            // Multi-occurrence: check each occurrence end time
            for (const occ of occs as any[]) {
              if (!occ.date || !occ.time) continue;
              const occStart = warsawLocalToUtc(occ.date, occ.time);
              const durationMin = occ.duration_minutes || 60;
              const occEnd = new Date(occStart.getTime() + durationMin * 60 * 1000);
              if (occEnd.getTime() >= twoHoursAgoMs && occEnd.getTime() <= nowMs) {
                endedTerms.push({ event: evt, occurrence_date: occ.date, occurrence_time: occ.time });
              }
            }
          } else {
            // Single occurrence: use base end_time
            const endMs = new Date(evt.end_time).getTime();
            if (endMs >= twoHoursAgoMs && endMs <= nowMs) {
              endedTerms.push({ event: evt, occurrence_date: null, occurrence_time: null });
            }
          }
        }

        console.log(`[CRON] Found ${endedTerms.length} recently ended event terms`);

        for (const term of endedTerms) {
          const event = term.event;
          if (isTimeoutApproaching()) { results.stoppedEarly = true; break; }

          // NOTE: Registered users (partners, specialists, clients) do NOT receive post-event thank-you emails.
          // Only invited guests receive emails, conditional on attendance.

          // Process guest registrations with attendance check — filter by occurrence for recurring events
          let guestQuery = supabase
            .from("guest_event_registrations")
            .select("id, email, first_name, last_name, invited_by_user_id, thank_you_sent, occurrence_date, occurrence_time")
            .eq("event_id", event.id)
            .eq("status", "registered")
            .or("thank_you_sent.eq.false,thank_you_sent.is.null");

          const { data: allGuestRegs } = await guestQuery;
          
          // Filter guests to only those registered for this specific occurrence
          let guestRegs = allGuestRegs || [];
          if (term.occurrence_date && term.occurrence_time) {
            guestRegs = guestRegs.filter((g: any) =>
              (g.occurrence_date === term.occurrence_date && g.occurrence_time === term.occurrence_time)
            );
            console.log(`[CRON] Post-event guest filtering for ${term.occurrence_date} ${term.occurrence_time}: ${allGuestRegs?.length || 0} total → ${guestRegs.length} matched`);
          }

          if (guestRegs && guestRegs.length > 0) {
            // Check if this event has an auto-webinar config to determine attendance
            const { data: awConfig } = await supabase
              .from("auto_webinar_config")
              .select("id")
              .eq("event_id", event.id)
              .maybeSingle();

            // Get video IDs for this event's auto-webinar (if any)
            let eventVideoIds: string[] = [];
            if (awConfig) {
              const { data: videos } = await supabase
                .from("auto_webinar_videos")
                .select("id")
                .eq("config_id", awConfig.id)
                .eq("is_active", true);
              if (videos) {
                eventVideoIds = videos.map(v => v.id);
              }
            }

            for (const guest of guestRegs) {
              if (isTimeoutApproaching()) { results.stoppedEarly = true; break; }
              if (!guest.email) continue;

              // Determine email type based on attendance
              let emailType = 'thank_you'; // default for non-auto-webinar events

              if (awConfig && eventVideoIds.length > 0) {
                // Check if guest has a view record for this event's videos
                const { data: views } = await supabase
                  .from("auto_webinar_views")
                  .select("watch_duration_seconds")
                  .eq("guest_email", guest.email)
                  .in("video_id", eventVideoIds)
                  .order("watch_duration_seconds", { ascending: false })
                  .limit(1);

                const bestView = views && views.length > 0 ? views[0] : null;
                if (bestView && bestView.watch_duration_seconds && bestView.watch_duration_seconds > 0) {
                  emailType = 'thank_you';
                } else {
                  emailType = 'missed_event';
                }
              }

              results.postEventThankYou.processed++;
              if (results.postEventThankYou.processed > 1) await delay(200);

              try {
                const { error: sendErr } = await supabase.functions.invoke("send-post-event-thank-you", {
                  body: {
                    event_id: event.id,
                    recipient_email: guest.email,
                    recipient_name: `${guest.first_name || ''} ${guest.last_name || ''}`.trim(),
                    event_title: event.title,
                    inviter_user_id: guest.invited_by_user_id || event.host_user_id || event.created_by,
                    source_type: 'guest_event_registration',
                    source_id: guest.id,
                    email_type: emailType,
                  },
                });

                if (sendErr) {
                  console.error(`[CRON] Guest post-event ${emailType} failed for ${guest.email}:`, sendErr);
                  results.postEventThankYou.failed++;
                } else {
                  results.postEventThankYou.success++;
                  await supabase.from("guest_event_registrations").update({
                    thank_you_sent: true,
                    thank_you_sent_at: new Date().toISOString(),
                  }).eq("id", guest.id);
                }
              } catch (err) {
                console.error("[CRON] Exception guest post-event email:", err);
                results.postEventThankYou.failed++;
              }
            }
          }
        }
      } else {
        console.log("[CRON] No recently ended events for thank you emails");
      }
    }

    // 10. Update job log with results
    const totalProcessed = results.welcomeEmails.processed + results.trainingNotifications.processed + results.trainingReminders.processed + results.retries.processed + results.webinarReminders24h.processed + results.webinarReminders1h.processed + results.pushReminders.processed + results.contactReminders.processed + results.postEventThankYou.processed + results.inactivityWarnings.processed + results.inactivityBlocks.processed;
    const totalSuccess = results.welcomeEmails.success + results.trainingNotifications.success + results.trainingReminders.success + results.retries.success + results.webinarReminders24h.success + results.webinarReminders1h.success + results.pushReminders.success + results.contactReminders.success + results.postEventThankYou.success + results.inactivityWarnings.success + results.inactivityBlocks.success;
    
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
