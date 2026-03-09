import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AutoWebinarVideo, AutoWebinarConfig } from '@/types/autoWebinar';

export function useAutoWebinarConfig() {
  const [config, setConfig] = useState<AutoWebinarConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase
      .from('auto_webinar_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    setConfig(data as AutoWebinarConfig | null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  return { config, loading, refetch: fetchConfig };
}

export function useAutoWebinarVideos() {
  const [videos, setVideos] = useState<AutoWebinarVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    const { data } = await supabase
      .from('auto_webinar_videos')
      .select('*')
      .order('sort_order', { ascending: true });
    setVideos((data as AutoWebinarVideo[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  return { videos, loading, refetch: fetchVideos };
}

/**
 * Calculate which video should be playing and at what time offset,
 * synchronized based on interval_minutes from start_hour.
 */
export function useAutoWebinarSync(videos: AutoWebinarVideo[], config: AutoWebinarConfig | null) {
  const [currentVideo, setCurrentVideo] = useState<AutoWebinarVideo | null>(null);
  const [startOffset, setStartOffset] = useState(0);
  const [isInActiveHours, setIsInActiveHours] = useState(false);
  const [secondsToNext, setSecondsToNext] = useState(0);

  useEffect(() => {
    if (!config?.is_enabled || videos.length === 0) {
      setCurrentVideo(null);
      setIsInActiveHours(false);
      return;
    }

    const activeVideos = videos.filter(v => v.is_active);
    if (activeVideos.length === 0) {
      setCurrentVideo(null);
      return;
    }

    const calculate = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
      const secondsPastMidnight = currentHour * 3600 + currentMinute * 60 + currentSecond;

      const activeStartSeconds = config.start_hour * 3600;
      const activeEndSeconds = config.end_hour * 3600;
      const intervalSeconds = (config.interval_minutes || 60) * 60;

      // Pre-entry window: 5 minutes (300 seconds) before start_hour
      const preEntryWindow = 300;

      // Check if we're in the pre-entry window before active hours
      if (secondsPastMidnight >= activeStartSeconds - preEntryWindow && secondsPastMidnight < activeStartSeconds) {
        setIsInActiveHours(false);
        setCurrentVideo(null);
        setSecondsToNext(activeStartSeconds - secondsPastMidnight);
        return;
      }

      // Check if outside active hours entirely
      if (secondsPastMidnight < activeStartSeconds - preEntryWindow || secondsPastMidnight >= activeEndSeconds) {
        setIsInActiveHours(false);
        setCurrentVideo(null);
        let nextStartSeconds = activeStartSeconds - preEntryWindow;
        if (secondsPastMidnight >= activeEndSeconds) {
          nextStartSeconds = activeStartSeconds - preEntryWindow + 86400;
        }
        setSecondsToNext(nextStartSeconds - secondsPastMidnight);
        return;
      }

      setIsInActiveHours(true);

      const secondsSinceStart = secondsPastMidnight - activeStartSeconds;
      const currentSlotIndex = Math.floor(secondsSinceStart / intervalSeconds);
      const secondsIntoSlot = secondsSinceStart % intervalSeconds;
      const nextSlotStartSec = activeStartSeconds + (currentSlotIndex + 1) * intervalSeconds;

      // Determine which video
      let videoIndex: number;
      if (config.playlist_mode === 'sequential') {
        videoIndex = currentSlotIndex % activeVideos.length;
      } else {
        const seed = currentSlotIndex * 1000 + now.getDate() * 31 + now.getMonth() * 367;
        videoIndex = seed % activeVideos.length;
      }

      const video = activeVideos[videoIndex];
      setCurrentVideo(video);

      if (video.duration_seconds > 0 && secondsIntoSlot < video.duration_seconds) {
        setStartOffset(secondsIntoSlot);
        setSecondsToNext(0);
      } else if (video.duration_seconds > 0) {
        // Video finished — show countdown to next slot (5 min before next)
        setStartOffset(-1);
        const countdownTarget = nextSlotStartSec;
        const secsToNext = countdownTarget - secondsPastMidnight;
        // Only show countdown if within 5 minutes
        setSecondsToNext(secsToNext <= preEntryWindow ? secsToNext : secsToNext);
      } else {
        setStartOffset(0);
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [videos, config]);

  return { currentVideo, startOffset, isInActiveHours, secondsToNext };
}
