import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Resolver page for short event URLs: /e/:slug?ref=EQID
 * Resolves slug → event UUID and ref (eq_id) → user UUID,
 * then redirects to the existing EventGuestRegistration page.
 * For auto_webinar events, logs invitation clicks with tracking codes.
 */
const EventRegistrationBySlug: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolve = async () => {
      if (!slug) {
        setError('Brak identyfikatora wydarzenia.');
        return;
      }

      // 1. Resolve slug → event id + event_type
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, event_type')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (eventError || !event) {
        setError('Nie znaleziono wydarzenia.');
        return;
      }

      // 2. Resolve ref (eq_id) → user_id
      const ref = searchParams.get('ref');
      let invitedByParam = '';

      if (ref) {
        // Log click for auto_webinar events
        if (event.event_type === 'auto_webinar') {
          const trackingCode = `${ref}-${Date.now().toString(36)}`;
          await supabase
            .from('auto_webinar_invitation_clicks')
            .insert({
              event_id: event.id,
              ref_code: ref,
              tracking_code: trackingCode,
              user_agent: navigator.userAgent,
            });
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('eq_id', ref)
          .maybeSingle();

        if (profile?.user_id) {
          invitedByParam = `?invited_by=${profile.user_id}`;
        }
      }

      // 3. Redirect to existing registration page
      navigate(`/events/register/${event.id}${invitedByParam}`, { replace: true });
    };

    resolve();
  }, [slug, searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg">{error}</p>
          <a href="/" className="text-primary underline">Wróć do strony głównej</a>
        </div>
      </div>
    );
  }

  return <LoadingSpinner />;
};

export default EventRegistrationBySlug;
