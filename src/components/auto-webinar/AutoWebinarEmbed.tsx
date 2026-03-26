import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, Volume2, AlertTriangle, RefreshCw, Heart, XCircle } from 'lucide-react';
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
  const { currentVideo, startOffset, isInActiveHours, secondsToNext, isTooLate, isLinkExpired, isNoInvitation, isVideoEnded, isRoomClosed } = useAutoWebinarSync(videos, config, isGuest, guestSlotTime, previewMode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasExistingSession, setHasExistingSession] = useState(false);
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

  // Also check when isTooLate becomes true (guest might have been watching before)
  useEffect(() => {
    if (!isTooLate || !isGuest || !guestEmail || hasExistingSession) return;

    const checkForRejoin = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Find any view record for this guest today (any video in this webinar)
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

  // Analytics tracking
  useAutoWebinarTracking(effectiveVideoId, effectiveIsPlaying, isGuest, guestEmail);

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

  // Video playback — starts muted for autoplay compliance
  const hasStartedRef = useRef(false);
  const currentSrcRef = useRef<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const videoToPlay = currentVideo;
    if (!videoToPlay || startOffset < 0 || (!previewMode && showWelcome)) return;

    // Only reload if source actually changed
    if (currentSrcRef.current === videoToPlay.video_url && hasStartedRef.current) {
      return;
    }

    setVideoError(null);
    currentSrcRef.current = videoToPlay.video_url;

    const handleCanPlay = () => {
      if (!hasStartedRef.current && startOffset > 0) {
        video.currentTime = startOffset;
      }
      video.muted = true;
      setIsMuted(true);
      video.play().catch(console.warn);
      hasStartedRef.current = true;
      setHasStarted(true);
    };

    video.addEventListener('canplay', handleCanPlay, { once: true });
    video.src = videoToPlay.video_url;
    video.load();

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentVideo, startOffset, showWelcome, previewMode, videos]);

  useEffect(() => {
    hasStartedRef.current = false;
    currentSrcRef.current = null;
    setHasStarted(false);
    setShowUnmuteOverlay(true);
  }, [currentVideo?.id]);

  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
    setShowUnmuteOverlay(false);
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleVideoError = () => {
    setVideoError('Nie udało się załadować transmisji.');
  };

  if (configLoading || videosLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (configError || videosError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Błąd ładowania</h2>
        <p className="text-muted-foreground">{configError || videosError}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Odśwież stronę
        </Button>
      </div>
    );
  }

  if (!config?.is_enabled && !previewMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Radio className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Auto-webinary są wyłączone</h2>
        <p className="text-muted-foreground">Sprawdź ponownie później</p>
      </div>
    );
  }

  const activeVideos = videos.filter(v => v.is_active);

  if (activeVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Radio className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Brak dostępnych materiałów</h2>
        <p className="text-muted-foreground">Administrator nie dodał jeszcze żadnych filmów</p>
      </div>
    );
  }

  const roomTitle = config?.room_title || 'Webinar NA ŻYWO';
  const roomSubtitle = config?.room_subtitle || `Automatyczne odtwarzanie co ${config?.interval_minutes || 60} min (${config?.start_hour}:00 – ${config?.end_hour}:00)`;
  const bgColor = config?.room_background_color || '#000000';
  const showLiveBadge = config?.room_show_live_badge !== false;
  const showScheduleInfo = config?.room_show_schedule_info !== false;
  const countdownLabel = config?.countdown_label || 'Następny webinar za';

  // In preview mode: admin is never blocked by isTooLate/expired, always sees what participants see
  // Returning guests (hasExistingSession) bypass isTooLate
  const canBypassTooLate = previewMode || hasExistingSession;
  const shouldShowPlayer = isInActiveHours && currentVideo && startOffset >= 0 && !showWelcome && (!isTooLate || canBypassTooLate) && !isLinkExpired && !isNoInvitation && !isVideoEnded && !isRoomClosed;
  const shouldShowWelcome = !previewMode && showWelcome && config?.welcome_message && isInActiveHours && currentVideo && startOffset >= 0 && !isTooLate && !isLinkExpired && !isNoInvitation && !isVideoEnded && !isRoomClosed;
  const showPreviewOfflineInfo = previewMode && !shouldShowPlayer;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      {!previewMode && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config?.room_logo_url ? (
              <img src={config.room_logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="p-2 rounded-lg bg-destructive/10">
                <Radio className="h-5 w-5 text-destructive" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{roomTitle}</h2>
              <p className="text-sm text-muted-foreground">{roomSubtitle}</p>
            </div>
          </div>
          {showLiveBadge && isInActiveHours && currentVideo && startOffset >= 0 && !showWelcome && (
            <Badge variant="destructive" className="animate-pulse gap-1.5">
              <span className="w-2 h-2 rounded-full bg-background" />
              NA ŻYWO
            </Badge>
          )}
        </div>
      )}

      {/* Welcome message overlay */}
      {shouldShowWelcome ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-8"
              style={{ backgroundColor: bgColor }}
            >
              <Radio className="h-12 w-12 text-white/60 mb-6 animate-pulse" />
              <p className="text-white text-xl md:text-2xl font-semibold max-w-2xl leading-relaxed">
                {config?.welcome_message}
              </p>
              <p className="text-white/50 text-sm mt-6">
                Transmisja rozpocznie się za chwilę...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : shouldShowPlayer ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div ref={containerRef} className="relative aspect-video" style={{ backgroundColor: bgColor }}>
              {/* Participant count */}
              {config?.fake_participants_enabled && (
                <div className="absolute top-3 right-3 z-10">
                  <AutoWebinarParticipantCount
                    min={config.fake_participants_min || 45}
                    max={config.fake_participants_max || 120}
                  />
                </div>
              )}
              {/* Video error state */}
              {videoError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                  <p className="text-sm">{videoError}</p>
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
                    muted
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

                  {/* Unmute overlay */}
                  {showUnmuteOverlay && hasStarted && (
                    <button
                      onClick={handleUnmute}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition-opacity hover:bg-black/50 z-10"
                    >
                      <div className="flex items-center gap-2 bg-white/90 text-black rounded-full px-6 py-3 shadow-lg font-medium">
                        <Volume2 className="h-5 w-5" />
                        Włącz dźwięk
                      </div>
                    </button>
                  )}

                  {/* Player controls */}
                  {hasStarted && !showUnmuteOverlay && (
                    <AutoWebinarPlayerControls
                      videoRef={videoRef}
                      containerRef={containerRef}
                      isMuted={isMuted}
                      onToggleMute={handleToggleMute}
                    />
                  )}

                  {/* Fake chat */}
                  {config?.fake_chat_enabled && hasStarted && !showUnmuteOverlay && (
                    <AutoWebinarFakeChat
                      configId={config?.id || null}
                      startOffset={startOffset}
                      isPlaying={effectiveIsPlaying}
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
              className="relative aspect-video flex flex-col items-center justify-center text-center px-8"
              style={{ backgroundColor: bgColor }}
            >
              <XCircle className="h-10 w-10 text-destructive mb-4" />
              <h2 className="text-white text-xl md:text-2xl font-semibold mb-4">
                Spotkanie już się odbyło
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-lg leading-relaxed mb-2">
                Ten link jest nieważny, ponieważ spotkanie już się odbyło.
              </p>
              <p className="text-white/60 text-sm max-w-lg leading-relaxed mt-4">
                Skontaktuj się z osobą, która Cię zaprosiła, aby uzyskać więcej informacji.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isVideoEnded ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-8"
              style={{ backgroundColor: bgColor }}
            >
              {config?.room_logo_url && (
                <img src={config.room_logo_url} alt="" className="h-12 w-12 rounded-lg object-cover mb-6 opacity-80" />
              )}
              <Heart className="h-10 w-10 text-destructive mb-4" />
              <h2 className="text-white text-xl md:text-2xl font-semibold mb-4">
                Dziękujemy za uczestnictwo!
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-lg leading-relaxed mb-2">
                Mamy nadzieję, że spotkanie było dla Ciebie wartościowe.
              </p>
              <p className="text-white/60 text-sm max-w-lg leading-relaxed mt-4">
                Skontaktuj się z osobą, która Cię zaprosiła na to spotkanie — chętnie odpowie na Twoje pytania i pomoże w kolejnych krokach.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isLinkExpired ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-8"
              style={{ backgroundColor: bgColor }}
            >
              {config?.room_logo_url && (
                <img src={config.room_logo_url} alt="" className="h-12 w-12 rounded-lg object-cover mb-6 opacity-80" />
              )}
              <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
              <h2 className="text-white text-xl md:text-2xl font-semibold mb-4">
                Ten link wygasł
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-lg leading-relaxed mb-2">
                Link do tego webinaru jest już nieaktywny.
              </p>
              <p className="text-white/60 text-sm max-w-lg leading-relaxed mt-4">
                Skontaktuj się z osobą, która Cię zaprosiła, aby otrzymać nowy link na najbliższy termin.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isNoInvitation ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-8"
              style={{ backgroundColor: bgColor }}
            >
              <Radio className="h-10 w-10 text-white/60 mb-4" />
              <h2 className="text-white text-xl md:text-2xl font-semibold mb-4">
                Brak aktywnego zaproszenia
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-lg leading-relaxed">
                Aby dołączyć do webinaru, potrzebujesz linku zaproszeniowego z wyznaczoną godziną.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isTooLate ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-8"
              style={{ backgroundColor: bgColor }}
            >
              {config?.room_logo_url && (
                <img src={config.room_logo_url} alt="" className="h-12 w-12 rounded-lg object-cover mb-6 opacity-80" />
              )}
              <AlertTriangle className="h-10 w-10 text-yellow-400 mb-4" />
              <h2 className="text-white text-xl md:text-2xl font-semibold mb-4">
                Spotkanie jest w trakcie
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-lg leading-relaxed mb-2">
                Cenimy sobie punktualność w celu pełnego zrozumienia przekazywanej wiedzy.
                Dołączenie w tym momencie nie jest możliwe.
              </p>
              <p className="text-white/60 text-sm max-w-lg leading-relaxed mt-4">
                W celu ustalenia nowego terminu skontaktuj się z osobą, która zaprosiła Cię na to spotkanie.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : showPreviewOfflineInfo ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Poza godzinami emisji</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              {(config?.slot_hours?.length ?? 0) > 0
                ? `Godziny emisji: ${[...(config!.slot_hours)].sort().join(', ')}.`
                : `Transmisja aktywna w godzinach ${config?.start_hour}:00 – ${config?.end_hour}:00.`}
              {secondsToNext > 0 && ' Uczestnicy widzą odliczanie do następnej sesji.'}
            </p>
          </CardContent>
        </Card>
      ) : secondsToNext > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AutoWebinarCountdown secondsToNext={secondsToNext} label={countdownLabel} />
            {config?.fake_participants_enabled && isInActiveHours && (
              <div className="mt-4">
                <AutoWebinarParticipantCount
                  min={config.fake_participants_min || 45}
                  max={config.fake_participants_max || 120}
                />
              </div>
            )}
            {config?.welcome_message && (
              <p className="mt-6 text-center text-muted-foreground max-w-md">
                {config.welcome_message}
              </p>
            )}
          </CardContent>
        </Card>
      ) : isGuest && guestSlotTime ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-8"
              style={{ backgroundColor: bgColor }}
            >
              <XCircle className="h-10 w-10 text-destructive mb-4" />
              <h2 className="text-white text-xl md:text-2xl font-semibold mb-4">
                Spotkanie już się odbyło
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-lg leading-relaxed mb-2">
                Ten link jest nieważny, ponieważ spotkanie już się odbyło.
              </p>
              <p className="text-white/60 text-sm max-w-lg leading-relaxed mt-4">
                Skontaktuj się z osobą, która Cię zaprosiła, aby uzyskać więcej informacji.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Oczekiwanie na transmisję...</p>
          </CardContent>
        </Card>
      )}

      {/* Custom section */}
      {!previewMode && showScheduleInfo && config?.room_custom_section_title && config?.room_custom_section_content && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{config.room_custom_section_title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {config.room_custom_section_content}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
