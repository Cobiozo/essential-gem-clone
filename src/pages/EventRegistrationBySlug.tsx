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

      // 2. For auto_webinar without ref param → redirect to public watch page
      const ref = searchParams.get('ref');
      const slot = searchParams.get('slot');

      if (event.event_type === 'auto_webinar' && !ref) {
        // Guest already registered, coming from email — go directly to watch page
        navigate(`/auto-webinar/watch/${slug}`, { replace: true });
        return;
      }

      const redirectParams = new URLSearchParams();

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
          redirectParams.set('invited_by', profile.user_id);
        }
      }

      if (slot) {
        redirectParams.set('slot', slot);
      }

      // 3. Redirect to existing registration page
      const qs = redirectParams.toString();
      navigate(`/events/register/${event.id}${qs ? `?${qs}` : ''}`, { replace: true });
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
