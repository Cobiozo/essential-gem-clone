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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const results = {
    welcomeEmails: { processed: 0, success: 0, failed: 0 },
    trainingNotifications: { processed: 0, success: 0, failed: 0 },
    retries: { processed: 0, success: 0, failed: 0 },
  };
  
  let jobLogId: string | null = null;

  try {
    console.log("[CRON] Starting process-pending-notifications job...");
    
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

    // 3. Process users without welcome email
    console.log("[CRON] Finding users without welcome email...");
    const { data: usersWithoutWelcome, error: welcomeError } = await supabase
      .rpc("get_users_without_welcome_email");

    if (welcomeError) {
      console.error("[CRON] Error fetching users without welcome:", welcomeError);
    } else if (usersWithoutWelcome && usersWithoutWelcome.length > 0) {
      console.log(`[CRON] Found ${usersWithoutWelcome.length} users without welcome email`);
      
      for (const user of usersWithoutWelcome as UserWithoutWelcome[]) {
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
              .from("training_user_progress")
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

    // 5. Retry failed emails (max 3 attempts)
    console.log("[CRON] Finding failed emails to retry...");
    const { data: failedEmails, error: retryError } = await supabase
      .rpc("get_retryable_failed_emails");

    if (retryError) {
      console.error("[CRON] Error fetching failed emails:", retryError);
    } else if (failedEmails && failedEmails.length > 0) {
      console.log(`[CRON] Found ${failedEmails.length} failed emails to retry`);
      
      for (const email of failedEmails as RetryableEmail[]) {
        results.retries.processed++;
        try {
          const newRetryCount = (email.retry_count || 0) + 1;
          
          // Call send-single-email function for retry
          const { error: sendError } = await supabase.functions.invoke("send-single-email", {
            body: {
              recipientEmail: email.recipient_email,
              recipientUserId: email.recipient_user_id,
              subject: email.subject,
              templateId: email.template_id,
              emailType: email.email_type,
              isRetry: true,
              originalEmailLogId: email.id,
              retryCount: newRetryCount,
              metadata: { ...email.metadata, retry_count: newRetryCount }
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

    // 6. Update job log with results
    const totalProcessed = results.welcomeEmails.processed + results.trainingNotifications.processed + results.retries.processed;
    const totalSuccess = results.welcomeEmails.success + results.trainingNotifications.success + results.retries.success;
    
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
