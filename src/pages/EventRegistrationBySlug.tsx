import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Resolver page for short event URLs: /e/:slug?ref=EQID
 * Resolves slug → event UUID and ref (eq_id) → user UUID,
 * then redirects to the existing EventGuestRegistration page.
 * For auto_webinar events, logs invitation clicks with tracking codes.
 * 
 * Includes special handling for Messenger/Facebook in-app WebView
 * which can have stale sessions causing redirect race conditions.
 */

const isInAppWebView = () =>
  /FBAN|FBAV|Messenger|Instagram|LinkedInApp/i.test(navigator.userAgent);

const EventRegistrationBySlug: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const resolvedRef = useRef(false);

  useEffect(() => {
    // Prevent double-execution on remount (React StrictMode / guard re-renders)
    if (resolvedRef.current) return;

    const abortController = new AbortController();

    const resolve = async () => {
      if (!slug) {
        setError('Brak identyfikatora wydarzenia.');
        return;
      }

      // 1. Resolve slug → event id + event_type
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, event_type, is_published')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (abortController.signal.aborted) return;

      if (eventError || !event) {
        setError('Nie znaleziono wydarzenia.');
        return;
      }

      // Block access to unpublished events
      if (!event.is_published) {
        setError('To wydarzenie nie jest już dostępne.');
        return;
      }

      if (abortController.signal.aborted) return;

      if (eventError || !event) {
        setError('Nie znaleziono wydarzenia.');
        return;
      }

      // 2. For auto_webinar without ref param → redirect to public watch page
      const ref = searchParams.get('ref');
      const slot = searchParams.get('slot');
      const lang = searchParams.get('lang');

      if (event.event_type === 'auto_webinar' && !ref) {
        resolvedRef.current = true;
        const watchParams = new URLSearchParams();
        if (slot) watchParams.set('slot', slot);
        const paramStr = watchParams.toString();
        const target = `/a-w/${slug}${paramStr ? `?${paramStr}` : ''}`;
        if (isInAppWebView()) {
          window.location.replace(target);
        } else {
          navigate(target, { replace: true });
        }
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

        if (abortController.signal.aborted) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('eq_id', ref)
          .maybeSingle();

        if (profile?.user_id) {
          redirectParams.set('invited_by', profile.user_id);
        }
      }

      if (abortController.signal.aborted) return;

      if (slot) {
        redirectParams.set('slot', slot);
      }

      if (lang) {
        redirectParams.set('lang', lang);
      }

      // 3. Redirect to existing registration page
      resolvedRef.current = true;
      const qs = redirectParams.toString();
      const target = `/events/register/${event.id}${qs ? `?${qs}` : ''}`;

      // Use window.location for in-app WebViews (Messenger, Instagram, etc.)
      // to bypass React Router state issues with stale auth sessions
      if (isInAppWebView()) {
        window.location.replace(target);
      } else {
        navigate(target, { replace: true });
      }
    };

    resolve();

    return () => {
      abortController.abort();
    };
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
