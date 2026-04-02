import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, Volume2, AlertTriangle, RefreshCw, Heart, XCircle, Play } from 'lucide-react';
import { useAutoWebinarConfig, useAutoWebinarVideos, useAutoWebinarSync } from '@/hooks/useAutoWebinar';
import { useAutoWebinarTracking } from '@/hooks/useAutoWebinarTracking';
import { AutoWebinarCountdown } from './AutoWebinarCountdown';
import { AutoWebinarPlayerControls } from './AutoWebinarPlayerControls';
import { AutoWebinarParticipantCount } from './AutoWebinarParticipantCount';
import { AutoWebinarFakeChat } from './AutoWebinarFakeChat';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

import type { AutoWebinarCategory } from '@/hooks/useAutoWebinar';

interface AutoWebinarEmbedProps {
  isGuest?: boolean;
  previewMode?: boolean;
  guestSlotTime?: string | null;
  guestEmail?: string | null;
  category?: AutoWebinarCategory;
}

export const AutoWebinarEmbed: React.FC<AutoWebinarEmbedProps> = ({ isGuest = false, previewMode = false, guestSlotTime, guestEmail, category = 'business_opportunity' }) => {
  const { config, loading: configLoading, error: configError } = useAutoWebinarConfig(category);
  const { videos, loading: videosLoading, error: videosError } = useAutoWebinarVideos(config?.id);
  const [hasExistingSession, setHasExistingSession] = useState(() => {
    if (isGuest && guestEmail) {
      const today = new Date().toISOString().slice(0, 10);
      const sessionKey = `aw_session_${category}_${guestEmail}_${today}`;
      return !!localStorage.getItem(sessionKey);
    }
    return false;
  });
  const { currentVideo, startOffset, isInActiveHours, secondsToNext, isTooLate, isLinkExpired, isNoInvitation, isVideoEnded, isRoomClosed } = useAutoWebinarSync(videos, config, isGuest, guestSlotTime, previewMode, hasExistingSession);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const sessionCheckDone = useRef(false);

  // Check if guest has an existing session (for rejoin after disconnect)
  useEffect(() => {
    if (!isGuest || !guestEmail || !currentVideo?.id || sessionCheckDone.current) return;

    const checkExistingSession = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('auto_webinar_views')
        .select('id')
        .eq('video_id', currentVideo.id)
        .eq('guest_email', guestEmail)
        .gte('created_at', todayStart.toISOString())
        .limit(1)
        .maybeSingle();

      if (data) {
        console.log('[AutoWebinarEmbed] Found existing session for guest, allowing rejoin');
        setHasExistingSession(true);
      }
      sessionCheckDone.current = true;
    };

    checkExistingSession();
  }, [isGuest, guestEmail, currentVideo?.id]);

  // Also check when isTooLate becomes true
  useEffect(() => {
    if (!isTooLate || !isGuest || !guestEmail || hasExistingSession) return;

    const checkForRejoin = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('auto_webinar_views')
        .select('id')
        .eq('guest_email', guestEmail)
        .gte('created_at', todayStart.toISOString())
        .limit(1)
        .maybeSingle();

      if (data) {
        console.log('[AutoWebinarEmbed] Guest has prior session today, bypassing isTooLate');
        setHasExistingSession(true);
      }
    };

    checkForRejoin();
  }, [isTooLate, isGuest, guestEmail, hasExistingSession]);

  // Determine effective playback state for tracking
  const effectiveIsPlaying = isInActiveHours && !!currentVideo && startOffset >= 0 && !showWelcome;
  const effectiveVideoId = currentVideo?.id || null;

  // Resolve guest_registration_id from email + event_id + slot_time for accurate tracking
  const [guestRegistrationId, setGuestRegistrationId] = useState<string | null>(null);
  const [guestDisplayName, setGuestDisplayName] = useState<string | null>(null);
  const [guestInviterUserId, setGuestInviterUserId] = useState<string | null>(null);
  const [guestFirstName, setGuestFirstName] = useState<string | null>(null);
  useEffect(() => {
    if (!isGuest || !guestEmail || !config?.event_id) {
      setGuestRegistrationId(null);
      setGuestDisplayName(null);
      setGuestInviterUserId(null);
      setGuestFirstName(null);
      return;
    }
    const resolve = async () => {
      const normalizedEmail = guestEmail.trim().toLowerCase();
      let query = supabase
        .from('guest_event_registrations')
        .select('id, first_name, last_name, invited_by_user_id')
        .eq('email', normalizedEmail)
        .eq('event_id', config.event_id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1);

      // If we have a slot_time, filter by it for precision
      if (guestSlotTime) {
        query = query.eq('slot_time', guestSlotTime);
      }

      const { data } = await query.maybeSingle();

      if (data?.id) {
        console.log('[AutoWebinarEmbed] Resolved guestRegistrationId:', data.id);
        setGuestRegistrationId(data.id);
        setGuestInviterUserId(data.invited_by_user_id || null);
        setGuestFirstName(data.first_name || null);
        // Format name as "Imię P." for chat display
        const firstName = data.first_name || '';
        const lastInitial = data.last_name ? ` ${data.last_name[0]}.` : '';
        const formatted = `${firstName}${lastInitial}`.trim();
        if (formatted) setGuestDisplayName(formatted);
      } else {
        console.log('[AutoWebinarEmbed] Could not resolve guestRegistrationId for', normalizedEmail);
        setGuestRegistrationId(null);
        setGuestInviterUserId(null);
        setGuestFirstName(null);
      }
    };
    resolve();
  }, [isGuest, guestEmail, config?.event_id, guestSlotTime]);

  // Send thank-you email immediately when video ends for guests
  const thankYouEmailSentRef = useRef(false);
  useEffect(() => {
    if (!isVideoEnded || !isGuest || !guestRegistrationId || !guestEmail || !config?.event_id || thankYouEmailSentRef.current) return;
    
    thankYouEmailSentRef.current = true;
    
    const eventTitle = config?.room_title || 'Webinar';
    const recipientName = guestFirstName || guestEmail.split('@')[0];
    
    console.log('[AutoWebinarEmbed] Video ended — sending thank-you email to', guestEmail);
    
    supabase.functions.invoke('send-post-event-thank-you', {
      body: {
        event_id: config.event_id,
        recipient_email: guestEmail,
        recipient_name: recipientName,
        event_title: eventTitle,
        inviter_user_id: guestInviterUserId,
        source_type: 'guest_event_registration',
        source_id: guestRegistrationId,
        email_type: 'thank_you',
      },
    }).then(({ error }) => {
      if (error) {
        console.error('[AutoWebinarEmbed] Failed to send thank-you email:', error);
      } else {
        console.log('[AutoWebinarEmbed] Thank-you email sent successfully');
        // Mark as sent in DB
        supabase
          .from('guest_event_registrations')
          .update({ thank_you_sent: true, thank_you_sent_at: new Date().toISOString() })
          .eq('id', guestRegistrationId)
          .then(() => console.log('[AutoWebinarEmbed] Marked thank_you_sent'));
      }
    });
  }, [isVideoEnded, isGuest, guestRegistrationId, guestEmail, config?.event_id, config?.room_title, guestFirstName, guestInviterUserId]);

  useAutoWebinarTracking(effectiveVideoId, effectiveIsPlaying, isGuest, guestEmail, guestRegistrationId, category);

  // Invalidate session when room closes
  useEffect(() => {
    if (!isRoomClosed) return;
    if (isGuest && guestEmail) {
      const today = new Date().toISOString().slice(0, 10);
      const sessionKey = `aw_session_${category}_${guestEmail}_${today}`;
      localStorage.removeItem(sessionKey);
      console.log('[AutoWebinarEmbed] Room closed — session removed from localStorage');
    }
  }, [isRoomClosed, isGuest, guestEmail]);

  // Welcome message overlay
  useEffect(() => {
    if (!config?.welcome_message || !isInActiveHours || !currentVideo || startOffset < 0) {
      setShowWelcome(false);
      return;
    }
    if (previewMode) { setShowWelcome(false); return; }
    setShowWelcome(true);
    const timer = setTimeout(() => setShowWelcome(false), 30000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, isInActiveHours, previewMode]);

  // Video playback — try to start with sound
  const hasStartedRef = useRef(false);
  const currentSrcRef = useRef<string | null>(null);
  const startOffsetRef = useRef(startOffset);

  // Keep ref in sync without triggering playback effect
  useEffect(() => {
    startOffsetRef.current = startOffset;
  }, [startOffset]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const videoToPlay = currentVideo;
    if (!videoToPlay || startOffsetRef.current < 0 || (!previewMode && showWelcome)) return;

    // Only reload if source actually changed
    if (currentSrcRef.current === videoToPlay.video_url && hasStartedRef.current) {
      return;
    }

    setVideoError(null);
    currentSrcRef.current = videoToPlay.video_url;

    const handleCanPlay = () => {
      const offset = startOffsetRef.current;
      if (!hasStartedRef.current && offset > 0 && !previewMode) {
        video.currentTime = offset;
      }
      
      if (previewMode) {
        // In preview mode, start muted but show "Enable sound" overlay like for guests
        video.muted = true;
        setIsMuted(true);
        video.play().then(() => {
          hasStartedRef.current = true;
          setNeedsUserInteraction(true);
          setHasStarted(true);
        }).catch(console.warn);
        return;
      }
      
      // Try to play with sound first
      video.muted = false;
      setIsMuted(false);
      video.play().then(() => {
        // Autoplay with sound succeeded
        hasStartedRef.current = true;
        setNeedsUserInteraction(false);
        // Save session to localStorage for rejoin after refresh
        if (isGuest && guestEmail) {
          const today = new Date().toISOString().slice(0, 10);
          const sessionKey = `aw_session_${category}_${guestEmail}_${today}`;
          localStorage.setItem(sessionKey, 'active');
        }
        setHasStarted(true);
      }).catch(() => {
        // Browser blocked autoplay with sound — show interaction overlay
        console.log('[AutoWebinarEmbed] Autoplay with sound blocked, requesting user interaction');
        video.muted = true;
        setIsMuted(true);
        video.play().then(() => {
          hasStartedRef.current = true;
          setNeedsUserInteraction(true);
          if (isGuest && guestEmail) {
            const today = new Date().toISOString().slice(0, 10);
            const sessionKey = `aw_session_${category}_${guestEmail}_${today}`;
            localStorage.setItem(sessionKey, 'active');
          }
          setHasStarted(true);
        }).catch(console.warn);
      });
    };

    video.addEventListener('canplay', handleCanPlay, { once: true });
    video.src = videoToPlay.video_url;
    video.load();

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.video_url, showWelcome, previewMode]);

  useEffect(() => {
    hasStartedRef.current = false;
    currentSrcRef.current = null;
    setHasStarted(false);
    setNeedsUserInteraction(false);
  }, [currentVideo?.id]);

  const handleEnableSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
    setNeedsUserInteraction(false);
  };

  const handleVideoError = () => {
    setVideoError('Nie udało się załadować transmisji.');
  };

  if (configLoading || videosLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (configError || videosError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] text-center gap-3 px-4">
        <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive" />
        <h2 className="text-lg sm:text-xl font-semibold">Błąd ładowania</h2>
        <p className="text-sm text-muted-foreground">{configError || videosError}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Odśwież stronę
        </Button>
      </div>
    );
  }

  if (!config?.is_enabled && !previewMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] text-center px-4">
        <Radio className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3" />
        <h2 className="text-lg sm:text-xl font-semibold mb-2">Auto-webinary są wyłączone</h2>
        <p className="text-sm text-muted-foreground">Sprawdź ponownie później</p>
      </div>
    );
  }

  const activeVideos = videos.filter(v => v.is_active);

  if (activeVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] text-center px-4">
        <Radio className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3" />
        <h2 className="text-lg sm:text-xl font-semibold mb-2">Brak dostępnych materiałów</h2>
        <p className="text-sm text-muted-foreground">Administrator nie dodał jeszcze żadnych filmów</p>
      </div>
    );
  }

  const roomTitle = config?.room_title || 'Webinar NA ŻYWO';
  const roomSubtitle = config?.room_subtitle || `Automatyczne odtwarzanie co ${config?.interval_minutes || 60} min (${config?.start_hour}:00 – ${config?.end_hour}:00)`;
  const bgColor = config?.room_background_color || '#000000';
  const infoBgColor = bgColor === '#000000' ? '#1a1f2e' : bgColor;
  const showLiveBadge = config?.room_show_live_badge !== false;
  const showScheduleInfo = config?.room_show_schedule_info !== false;
  const countdownLabel = config?.countdown_label || 'Następny webinar za';

  const canBypassTooLate = previewMode || hasExistingSession;
  const shouldShowPlayer = isInActiveHours && currentVideo && startOffset >= 0 && !showWelcome && (!isTooLate || canBypassTooLate) && !isLinkExpired && !isNoInvitation && !isVideoEnded && !isRoomClosed;
  const shouldShowWelcome = !previewMode && showWelcome && config?.welcome_message && isInActiveHours && currentVideo && startOffset >= 0 && !isTooLate && !isLinkExpired && !isNoInvitation && !isVideoEnded && !isRoomClosed;
  const showPreviewOfflineInfo = previewMode && !shouldShowPlayer;

  return (
    <div className="space-y-3 sm:space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {(config?.room_logo_url || (config as any)?.room_logo_url_2) ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {config?.room_logo_url && <img src={config.room_logo_url} alt="" className="h-7 sm:h-10 max-w-[80px] sm:max-w-[120px] object-contain" />}
              {(config as any)?.room_logo_url_2 && <img src={(config as any).room_logo_url_2} alt="" className="h-7 sm:h-10 max-w-[80px] sm:max-w-[120px] object-contain" />}
            </div>
          ) : (
            <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 shrink-0">
              <Radio className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-bold truncate">{roomTitle}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{roomSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {config?.fake_participants_enabled && isInActiveHours && currentVideo && startOffset >= 0 && !showWelcome && (
              <AutoWebinarParticipantCount
                min={config.fake_participants_min || 45}
                max={config.fake_participants_max || 120}
              />
            )}
            {showLiveBadge && isInActiveHours && currentVideo && startOffset >= 0 && !showWelcome && (
              <Badge variant="destructive" className="animate-pulse gap-1 sm:gap-1.5 text-xs shrink-0">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-background" />
                NA ŻYWO
              </Badge>
            )}
        </div>
      </div>

      {/* Welcome message overlay */}
      {shouldShowWelcome ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-4 sm:px-8"
              style={{ backgroundColor: infoBgColor }}
            >
              <Radio className="h-8 w-8 sm:h-12 sm:w-12 text-white/60 mb-4 sm:mb-6 animate-pulse" />
              <p className="text-white text-base sm:text-xl md:text-2xl font-semibold max-w-2xl leading-relaxed">
                {config?.welcome_message}
              </p>
              <p className="text-white/50 text-xs sm:text-sm mt-4 sm:mt-6">
                Transmisja rozpocznie się za chwilę...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : shouldShowPlayer ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div ref={containerRef} className="relative aspect-video" style={{ backgroundColor: bgColor }}>
              {/* Video error state */}
              {videoError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 px-4">
                  <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" />
                  <p className="text-xs sm:text-sm text-center">{videoError}</p>
                  <Button variant="secondary" size="sm" onClick={() => {
                    setVideoError(null);
                    setHasStarted(false);
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Spróbuj ponownie
                  </Button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full"
                    controls={false}
                    playsInline
                    onError={handleVideoError}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => setIsBuffering(false)}
                    onCanPlay={() => setIsBuffering(false)}
                  />

                  {/* Buffering spinner */}
                  {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                      <LoadingSpinner />
                    </div>
                  )}

                  {/* Enable sound overlay — shown when autoplay with sound was blocked */}
                  {needsUserInteraction && hasStarted && (
                    <button
                      onClick={handleEnableSound}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer transition-opacity hover:bg-black/60 z-10"
                    >
                      <div className="flex items-center gap-2 bg-white/90 text-black rounded-full px-5 py-2.5 sm:px-6 sm:py-3 shadow-lg font-medium text-sm sm:text-base">
                        <Volume2 className="h-5 w-5" />
                        Włącz dźwięk
                      </div>
                    </button>
                  )}

                  {/* Player controls — fullscreen only */}
                  {hasStarted && !needsUserInteraction && (
                    <AutoWebinarPlayerControls
                      videoRef={videoRef}
                      containerRef={containerRef}
                    />
                  )}

                   {/* Fake chat */}
                  {config?.fake_chat_enabled && hasStarted && !needsUserInteraction && (
                    <AutoWebinarFakeChat
                      configId={config?.id || null}
                      startOffset={startOffset}
                      isPlaying={effectiveIsPlaying}
                      guestRegistrationId={guestRegistrationId}
                      guestEmail={guestEmail}
                      guestName={guestDisplayName}
                      videoId={currentVideo?.id || null}
                      slotTime={guestSlotTime || null}
                    />
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : isRoomClosed ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-4 sm:px-8"
              style={{ backgroundColor: infoBgColor }}
            >
              <XCircle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive mb-3 sm:mb-4" />
              <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4">
                Spotkanie już się odbyło
              </h2>
              <p className="text-white/80 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed mb-2">
                Ten link jest nieważny, ponieważ spotkanie już się odbyło.
              </p>
              <p className="text-white/60 text-xs sm:text-sm max-w-lg leading-relaxed mt-3 sm:mt-4">
                Skontaktuj się z osobą, która Cię zaprosiła, aby uzyskać więcej informacji.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isVideoEnded ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-4 sm:px-8"
              style={{ backgroundColor: infoBgColor }}
            >
              {(config?.room_logo_url || (config as any)?.room_logo_url_2) && (
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {config?.room_logo_url && <img src={config.room_logo_url} alt="" className="h-8 sm:h-12 max-w-[100px] sm:max-w-[140px] object-contain opacity-80" />}
                  {(config as any)?.room_logo_url_2 && <img src={(config as any).room_logo_url_2} alt="" className="h-8 sm:h-12 max-w-[100px] sm:max-w-[140px] object-contain opacity-80" />}
                </div>
              )}
              <Heart className="h-8 w-8 sm:h-10 sm:w-10 text-destructive mb-3 sm:mb-4" />
              <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4">
                Dziękujemy za uczestnictwo!
              </h2>
              <p className="text-white/80 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed mb-2">
                Mamy nadzieję, że spotkanie było dla Ciebie wartościowe.
              </p>
              <p className="text-white/60 text-xs sm:text-sm max-w-lg leading-relaxed mt-3 sm:mt-4">
                Skontaktuj się z osobą, która Cię zaprosiła na to spotkanie — chętnie odpowie na Twoje pytania i pomoże w kolejnych krokach.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isLinkExpired ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-4 sm:px-8"
              style={{ backgroundColor: infoBgColor }}
            >
              {(config?.room_logo_url || (config as any)?.room_logo_url_2) && (
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {config?.room_logo_url && <img src={config.room_logo_url} alt="" className="h-8 sm:h-12 max-w-[100px] sm:max-w-[140px] object-contain opacity-80" />}
                  {(config as any)?.room_logo_url_2 && <img src={(config as any).room_logo_url_2} alt="" className="h-8 sm:h-12 max-w-[100px] sm:max-w-[140px] object-contain opacity-80" />}
                </div>
              )}
              <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive mb-3 sm:mb-4" />
              <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4">
                Ten link wygasł
              </h2>
              <p className="text-white/80 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed mb-2">
                Link do tego webinaru jest już nieaktywny.
              </p>
              <p className="text-white/60 text-xs sm:text-sm max-w-lg leading-relaxed mt-3 sm:mt-4">
                Skontaktuj się z osobą, która Cię zaprosiła, aby otrzymać nowy link na najbliższy termin.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isNoInvitation ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-4 sm:px-8"
              style={{ backgroundColor: infoBgColor }}
            >
              <Radio className="h-8 w-8 sm:h-10 sm:w-10 text-white/60 mb-3 sm:mb-4" />
              <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4">
                Brak aktywnego zaproszenia
              </h2>
              <p className="text-white/80 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed">
                Aby dołączyć do webinaru, potrzebujesz linku zaproszeniowego z wyznaczoną godziną.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isTooLate ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-4 sm:px-8"
              style={{ backgroundColor: infoBgColor }}
            >
              {(config?.room_logo_url || (config as any)?.room_logo_url_2) && (
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {config?.room_logo_url && <img src={config.room_logo_url} alt="" className="h-8 sm:h-12 max-w-[100px] sm:max-w-[140px] object-contain opacity-80" />}
                  {(config as any)?.room_logo_url_2 && <img src={(config as any).room_logo_url_2} alt="" className="h-8 sm:h-12 max-w-[100px] sm:max-w-[140px] object-contain opacity-80" />}
                </div>
              )}
              <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-400 mb-3 sm:mb-4" />
              <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4">
                Spotkanie jest w trakcie
              </h2>
              <p className="text-white/80 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed mb-2">
                Cenimy sobie punktualność w celu pełnego zrozumienia przekazywanej wiedzy.
                Dołączenie w tym momencie nie jest możliwe.
              </p>
              <p className="text-white/60 text-xs sm:text-sm max-w-lg leading-relaxed mt-3 sm:mt-4">
                W celu ustalenia nowego terminu skontaktuj się z osobą, która zaprosiła Cię na to spotkanie.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : showPreviewOfflineInfo ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16 text-center px-4">
            <Radio className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h2 className="text-base sm:text-lg font-semibold mb-2">Poza godzinami emisji</h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-md">
              {(config?.slot_hours?.length ?? 0) > 0
                ? `Godziny emisji: ${[...(config!.slot_hours)].sort().join(', ')}.`
                : `Transmisja aktywna w godzinach ${config?.start_hour}:00 – ${config?.end_hour}:00.`}
              {secondsToNext > 0 && ' Uczestnicy widzą odliczanie do następnej sesji.'}
            </p>
          </CardContent>
        </Card>
      ) : secondsToNext > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16 px-4">
            <AutoWebinarCountdown secondsToNext={secondsToNext} label={countdownLabel} />
            {config?.fake_participants_enabled && secondsToNext > 0 && secondsToNext <= 300 && (
              <div className="mt-3 sm:mt-4">
                <AutoWebinarParticipantCount
                  min={config.fake_participants_min || 45}
                  max={config.fake_participants_max || 120}
                  label="oczekujących na rozpoczęcie spotkania:"
                />
              </div>
            )}
            {config?.welcome_message && (
              <p className="mt-4 sm:mt-6 text-center text-muted-foreground text-xs sm:text-sm max-w-md">
                {config.welcome_message}
              </p>
            )}
          </CardContent>
        </Card>
      ) : isGuest && guestSlotTime ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-4 sm:px-8"
              style={{ backgroundColor: infoBgColor }}
            >
              <XCircle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive mb-3 sm:mb-4" />
              <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4">
                Spotkanie już się odbyło
              </h2>
              <p className="text-white/80 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed mb-2">
                Ten link jest nieważny, ponieważ spotkanie już się odbyło.
              </p>
              <p className="text-white/60 text-xs sm:text-sm max-w-lg leading-relaxed mt-3 sm:mt-4">
                Skontaktuj się z osobą, która Cię zaprosiła, aby uzyskać więcej informacji.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16 px-4">
            <Radio className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <p className="text-muted-foreground text-sm">Oczekiwanie na transmisję...</p>
          </CardContent>
        </Card>
      )}

      {/* Custom section */}
      {showScheduleInfo && config?.room_custom_section_title && config?.room_custom_section_content && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{config.room_custom_section_title}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line">
              {config.room_custom_section_content}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
