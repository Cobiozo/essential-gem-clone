// Retry CRON: re-attempts join-link email delivery for open alerts.
// Runs every 2 min. Exponential backoff, cap 30 min. After max_attempts → notify admins.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function backoffMinutes(attempt: number): number {
  // attempt 1 → 2 min, 2 → 4, 3 → 8, 4 → 16, 5+ → 30 (cap)
  return Math.min(30, Math.pow(2, attempt));
}

function resolveOccurrenceLink(event: any, occIso: string | null): { link: string; source: string } {
  if (occIso) {
    const d = new Date(occIso);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dd}`;
      const timeStr = `${hh}:${mm}`;
      const occs = Array.isArray(event?.occurrences) ? event.occurrences : [];
      const match = occs.find((o: any) => o?.date === dateStr && (o?.time === timeStr || o?.time === `${hh}:${mm}:00`));
      if (match?.zoom_link) return { link: String(match.zoom_link), source: 'occurrence' };
    }
  }
  if (event?.zoom_link) return { link: String(event.zoom_link), source: 'event.zoom_link' };
  if (event?.location) return { link: String(event.location), source: 'event.location' };
  return { link: '', source: 'none' };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const nowIso = new Date().toISOString();
    const { data: alerts, error: fetchErr } = await supabase
      .from('missing_join_link_alerts')
      .select('*')
      .is('resolved_at', null)
      .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const alert of alerts as any[]) {
      // Skip if attempts already at or above max
      if ((alert.attempt_count ?? 0) >= (alert.max_attempts ?? 5)) continue;

      const nextAttemptNo = (alert.attempt_count ?? 0) + 1;

      // Fetch event + guest info
      const { data: event } = await supabase
        .from('events')
        .select('title, start_time, zoom_link, location, occurrences, host_user_id')
        .eq('id', alert.event_id)
        .single();

      if (!event) {
        await supabase.from('join_link_retry_log').insert({
          alert_id: alert.id, attempt_no: nextAttemptNo, outcome: 'no_link',
          error_message: 'event not found', triggered_by: 'cron',
        });
        continue;
      }

      const { link: zoomLink, source: linkSource } = resolveOccurrenceLink(event, alert.occurrence_datetime);
      const backoff = backoffMinutes(nextAttemptNo);
      const nextRetry = new Date(Date.now() + backoff * 60000).toISOString();

      // Guest info (best effort)
      let firstName = alert.recipient_name?.split(' ')[0] || '';
      const { data: guest } = await supabase
        .from('guest_event_registrations')
        .select('first_name, last_name')
        .eq('event_id', alert.event_id)
        .eq('email', alert.recipient_email)
        .maybeSingle();
      if (guest?.first_name) firstName = guest.first_name;

      // Host name
      let hostName = 'Zespół Pure Life';
      if (event.host_user_id) {
        const { data: hostProfile } = await supabase
          .from('profiles').select('first_name, last_name').eq('user_id', event.host_user_id).maybeSingle();
        if (hostProfile) hostName = `${hostProfile.first_name || ''} ${hostProfile.last_name || ''}`.trim() || hostName;
      }

      if (!zoomLink) {
        await supabase.from('join_link_retry_log').insert({
          alert_id: alert.id, attempt_no: nextAttemptNo, outcome: 'no_link',
          error_message: `no zoom link available (source=${linkSource})`,
          triggered_by: 'cron', zoom_link_used: null,
        });
        await supabase.from('missing_join_link_alerts').update({
          attempt_count: nextAttemptNo,
          last_attempt_at: new Date().toISOString(),
          last_error: 'Brak linku Zoom (nawet w fallbackach)',
          next_retry_at: nextAttemptNo >= (alert.max_attempts ?? 5) ? null : nextRetry,
          reason: 'no_link',
        }).eq('id', alert.id);
        results.push({ alert_id: alert.id, outcome: 'no_link' });
        continue;
      }

      // Attempt send
      const eventStart = alert.occurrence_datetime || event.start_time;
      const startDate = eventStart ? new Date(eventStart) : null;
      const displayDate = startDate ? startDate.toLocaleDateString('pl-PL') : '';
      const displayTime = startDate ? startDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';

      let sendOk = false;
      let errMsg = '';
      try {
        const { data: sendData, error: sendErr } = await supabase.functions.invoke("send-webinar-email", {
          body: {
            type: 'join_now',
            email: alert.recipient_email,
            firstName,
            eventTitle: event.title || alert.event_title,
            eventDate: displayDate,
            eventTime: displayTime,
            zoomLink,
            hostName,
            eventId: alert.event_id,
          },
        });
        if (sendErr) throw sendErr;
        sendOk = (sendData as any)?.success !== false;
        if (!sendOk) errMsg = (sendData as any)?.error || 'unknown';
      } catch (e: any) {
        sendOk = false;
        errMsg = e?.message || String(e);
      }

      if (sendOk) {
        await supabase.from('join_link_retry_log').insert({
          alert_id: alert.id, attempt_no: nextAttemptNo, outcome: 'sent',
          triggered_by: 'cron', zoom_link_used: zoomLink,
        });
        await supabase.from('missing_join_link_alerts').update({
          attempt_count: nextAttemptNo,
          last_attempt_at: new Date().toISOString(),
          last_error: null,
          next_retry_at: null,
          resolved_at: new Date().toISOString(),
        }).eq('id', alert.id);
        results.push({ alert_id: alert.id, outcome: 'sent' });
      } else {
        const exhausted = nextAttemptNo >= (alert.max_attempts ?? 5);
        await supabase.from('join_link_retry_log').insert({
          alert_id: alert.id, attempt_no: nextAttemptNo,
          outcome: exhausted ? 'max_attempts_exhausted' : 'smtp_error',
          error_message: errMsg, triggered_by: 'cron', zoom_link_used: zoomLink,
        });
        await supabase.from('missing_join_link_alerts').update({
          attempt_count: nextAttemptNo,
          last_attempt_at: new Date().toISOString(),
          last_error: errMsg,
          next_retry_at: exhausted ? null : nextRetry,
          reason: 'send_failed',
        }).eq('id', alert.id);

        if (exhausted) {
          try {
            await supabase.functions.invoke('notify-admins-missing-join-link', {
              body: {
                email: alert.recipient_email,
                firstName,
                eventId: alert.event_id,
                eventTitle: event.title || alert.event_title,
                occurrenceDatetime: alert.occurrence_datetime,
                reason: 'send_failed',
                errorMessage: `Wyczerpano ${nextAttemptNo} prób automatycznego ponawiania. Ostatni błąd: ${errMsg}`,
              },
            });
          } catch (_) { /* noop */ }
        }
        results.push({ alert_id: alert.id, outcome: exhausted ? 'exhausted' : 'retry_scheduled', next_retry_at: exhausted ? null : nextRetry });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error('[retry-missing-join-links] error:', err);
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
