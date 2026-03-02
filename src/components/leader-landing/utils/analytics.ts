import { supabase } from '@/integrations/supabase/client';

export function trackLandingEvent(pageId: string, eventType: string, eventData: Record<string, unknown> = {}) {
  const visitorId = localStorage.getItem('pl_visitor_id') || 'unknown';
  
  // Cast needed until Supabase types are regenerated
  (supabase.from('leader_landing_analytics') as any).insert({
    page_id: pageId,
    event_type: eventType,
    event_data: eventData,
    visitor_id: visitorId,
  }).then(() => {});
}
