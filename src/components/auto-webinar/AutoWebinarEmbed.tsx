import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import { useAutoWebinarConfig, useAutoWebinarVideos, useAutoWebinarSync } from '@/hooks/useAutoWebinar';
import { AutoWebinarCountdown } from './AutoWebinarCountdown';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const AutoWebinarEmbed: React.FC = () => {
  const { config, loading: configLoading } = useAutoWebinarConfig();
  const { videos, loading: videosLoading } = useAutoWebinarVideos();
  const { currentVideo, startOffset, isInActiveHours, secondsToNext } = useAutoWebinarSync(videos, config);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Welcome message overlay — show for 30 seconds on initial load
  useEffect(() => {
    if (!config?.welcome_message || !isInActiveHours || !currentVideo || startOffset < 0) {
      setShowWelcome(false);
      return;
    }
    setShowWelcome(true);
    const timer = setTimeout(() => setShowWelcome(false), 30000);
    return () => clearTimeout(timer);
    // Only trigger on first join (config load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, isInActiveHours]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo || startOffset < 0 || showWelcome) return;

    const handleCanPlay = () => {
      if (!hasStarted && startOffset > 0) {
        video.currentTime = startOffset;
      }
      video.play().catch(console.warn);
      setHasStarted(true);
    };

    video.addEventListener('canplay', handleCanPlay, { once: true });
    video.load();

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentVideo, startOffset, hasStarted, showWelcome]);

  useEffect(() => {
    setHasStarted(false);
  }, [currentVideo?.id]);

  if (configLoading || videosLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!config?.is_enabled) {
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

  const roomTitle = config.room_title || 'Webinar NA ŻYWO';
  const roomSubtitle = config.room_subtitle || `Automatyczne odtwarzanie co ${config.interval_minutes || 60} min (${config.start_hour}:00 – ${config.end_hour}:00)`;
  const bgColor = config.room_background_color || '#000000';
  const showLiveBadge = config.room_show_live_badge !== false;
  const showScheduleInfo = config.room_show_schedule_info !== false;
  const countdownLabel = config.countdown_label || 'Następny webinar za';

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.room_logo_url ? (
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

      {/* Welcome message overlay or Video player or countdown */}
      {showWelcome && config.welcome_message && isInActiveHours && currentVideo && startOffset >= 0 ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div
              className="relative aspect-video flex flex-col items-center justify-center text-center px-8"
              style={{ backgroundColor: bgColor }}
            >
              <Radio className="h-12 w-12 text-white/60 mb-6 animate-pulse" />
              <p className="text-white text-xl md:text-2xl font-semibold max-w-2xl leading-relaxed">
                {config.welcome_message}
              </p>
              <p className="text-white/50 text-sm mt-6">
                Transmisja rozpocznie się za chwilę...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isInActiveHours && currentVideo && startOffset >= 0 ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="relative aspect-video" style={{ backgroundColor: bgColor }}>
              <video
                ref={videoRef}
                className="w-full h-full"
                controls={false}
                playsInline
                muted={false}
              >
                <source src={currentVideo.video_url} type="video/mp4" />
              </video>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AutoWebinarCountdown secondsToNext={secondsToNext} label={countdownLabel} />
            {config.welcome_message && (
              <p className="mt-6 text-center text-muted-foreground max-w-md">
                {config.welcome_message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Custom section */}
      {showScheduleInfo && config.room_custom_section_title && config.room_custom_section_content && (
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
