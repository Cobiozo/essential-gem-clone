import React, { useRef, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Radio } from 'lucide-react';
import { useAutoWebinarConfig, useAutoWebinarVideos, useAutoWebinarSync } from '@/hooks/useAutoWebinar';
import { AutoWebinarCountdown } from './AutoWebinarCountdown';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const AutoWebinarRoom: React.FC = () => {
  const { config, loading: configLoading } = useAutoWebinarConfig();
  const { videos, loading: videosLoading } = useAutoWebinarVideos();
  const { currentVideo, startOffset, isInActiveHours, secondsToNext } = useAutoWebinarSync(videos, config);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Sync video to calculated offset
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo || startOffset < 0) return;

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
  }, [currentVideo, startOffset, hasStarted]);

  // Reset hasStarted when video changes
  useEffect(() => {
    setHasStarted(false);
  }, [currentVideo?.id]);

  if (configLoading || videosLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (!config?.is_enabled) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Radio className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Auto-webinary są wyłączone</h2>
          <p className="text-muted-foreground">Sprawdź ponownie później</p>
        </div>
      </DashboardLayout>
    );
  }

  const activeVideos = videos.filter(v => v.is_active);

  if (activeVideos.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Radio className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Brak dostępnych materiałów</h2>
          <p className="text-muted-foreground">Administrator nie dodał jeszcze żadnych filmów</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Radio className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Auto-Webinar</h1>
              <p className="text-sm text-muted-foreground">
                Automatyczne odtwarzanie co godzinę ({config.start_hour}:00 – {config.end_hour}:00)
              </p>
            </div>
          </div>
          {isInActiveHours && currentVideo && startOffset >= 0 && (
            <Badge variant="destructive" className="animate-pulse gap-1.5">
              <span className="w-2 h-2 rounded-full bg-background" />
              NA ŻYWO
            </Badge>
          )}
        </div>

        {/* Video player or countdown */}
        {isInActiveHours && currentVideo && startOffset >= 0 ? (
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="relative bg-black aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full"
                  controls={false}
                  playsInline
                  muted={false}
                >
                  <source src={currentVideo.video_url} type="video/mp4" />
                </video>
                {/* Overlay with title */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                    {currentVideo.title}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AutoWebinarCountdown secondsToNext={secondsToNext} />
              {config.welcome_message && (
                <p className="mt-6 text-center text-muted-foreground max-w-md">
                  {config.welcome_message}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Harmonogram</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Webinary automatyczne odbywają się co {config.interval_minutes} minut, 
              od godziny {config.start_hour}:00 do {config.end_hour}:00. 
              W playliście jest {activeVideos.length} {activeVideos.length === 1 ? 'film' : 'filmów'}.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AutoWebinarRoom;
