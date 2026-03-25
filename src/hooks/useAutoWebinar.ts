import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AutoWebinarVideo, AutoWebinarConfig } from '@/types/autoWebinar';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 2000;

export function useAutoWebinarConfig() {
  const [config, setConfig] = useState<AutoWebinarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('auto_webinar_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (fetchError) throw fetchError;
      setConfig(data as AutoWebinarConfig | null);
      setError(null);
      retryCount.current = 0;
    } catch (err: any) {
      console.error('[AutoWebinar] Config fetch error:', err);
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        const delay = RETRY_BASE_DELAY * Math.pow(2, retryCount.current - 1);
        setTimeout(fetchConfig, delay);
        return;
      }
      setError(err.message || 'Nie udało się załadować konfiguracji');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  return { config, loading, error, refetch: fetchConfig };
}

export function useAutoWebinarVideos() {
  const [videos, setVideos] = useState<AutoWebinarVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);

  const fetchVideos = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('auto_webinar_videos')
        .select('*')
        .order('sort_order', { ascending: true });
      if (fetchError) throw fetchError;
      setVideos((data as AutoWebinarVideo[]) || []);
      setError(null);
      retryCount.current = 0;
    } catch (err: any) {
      console.error('[AutoWebinar] Videos fetch error:', err);
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        const delay = RETRY_BASE_DELAY * Math.pow(2, retryCount.current - 1);
        setTimeout(fetchVideos, delay);
        return;
      }
      setError(err.message || 'Nie udało się załadować filmów');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  return { videos, loading, error, refetch: fetchVideos };
}

/**
 * Calculate which video should be playing and at what time offset,
 * synchronized based on interval_minutes from start_hour.
 * Timer optimized: 10s interval normally, 1s during countdown.
 */
export function useAutoWebinarSync(videos: AutoWebinarVideo[], config: AutoWebinarConfig | null, isGuest = false) {
  const [currentVideo, setCurrentVideo] = useState<AutoWebinarVideo | null>(null);
  const [startOffset, setStartOffset] = useState(0);
  const [isInActiveHours, setIsInActiveHours] = useState(false);
  const [secondsToNext, setSecondsToNext] = useState(0);
  const [isTooLate, setIsTooLate] = useState(false);

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

    let intervalId: ReturnType<typeof setInterval>;
    let currentIntervalMs = 0;

    const calculate = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
      const secondsPastMidnight = currentHour * 3600 + currentMinute * 60 + currentSecond;

      const activeStartSeconds = config.start_hour * 3600;
      const activeEndSeconds = config.end_hour * 3600;
      const intervalSeconds = (config.interval_minutes || 60) * 60;
      const preEntryWindow = 300;

      // Pre-entry window
      if (secondsPastMidnight >= activeStartSeconds - preEntryWindow && secondsPastMidnight < activeStartSeconds) {
        setIsInActiveHours(false);
        setCurrentVideo(null);
        setSecondsToNext(activeStartSeconds - secondsPastMidnight);
        updateInterval(1000); // 1s during countdown
        return;
      }

      // Outside active hours
      if (secondsPastMidnight < activeStartSeconds - preEntryWindow || secondsPastMidnight >= activeEndSeconds) {
        setIsInActiveHours(false);
        setCurrentVideo(null);
        let nextStartSeconds = activeStartSeconds - preEntryWindow;
        if (secondsPastMidnight >= activeEndSeconds) {
          nextStartSeconds = activeStartSeconds - preEntryWindow + 86400;
        }
        const secsToNext = nextStartSeconds - secondsPastMidnight;
        setSecondsToNext(secsToNext);
        updateInterval(secsToNext <= 300 ? 1000 : 10000);
        return;
      }

      setIsInActiveHours(true);

      const secondsSinceStart = secondsPastMidnight - activeStartSeconds;
      const currentSlotIndex = Math.floor(secondsSinceStart / intervalSeconds);
      const secondsIntoSlot = secondsSinceStart % intervalSeconds;
      const nextSlotStartSec = activeStartSeconds + (currentSlotIndex + 1) * intervalSeconds;
      const lateJoinMaxSeconds = config.late_join_max_seconds ?? 300;

      // Guest late join policy — block if too late into slot
      if (isGuest && secondsIntoSlot > lateJoinMaxSeconds) {
        setIsTooLate(true);
        setCurrentVideo(null);
        setStartOffset(-1);
        setSecondsToNext(0);
        updateInterval(10000);
        return;
      }
      setIsTooLate(false);

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
        updateInterval(10000); // 10s during playback
      } else if (video.duration_seconds > 0) {
        setStartOffset(-1);
        const secsToNext = nextSlotStartSec - secondsPastMidnight;
        setSecondsToNext(secsToNext);
        updateInterval(secsToNext <= 300 ? 1000 : 10000);
      } else {
        setStartOffset(0);
        updateInterval(10000);
      }
    };

    const updateInterval = (ms: number) => {
      if (ms !== currentIntervalMs) {
        currentIntervalMs = ms;
        clearInterval(intervalId);
        intervalId = setInterval(calculate, ms);
      }
    };

    calculate();
    intervalId = setInterval(calculate, 10000);
    currentIntervalMs = 10000;

    return () => clearInterval(intervalId);
  }, [videos, config, isGuest]);

  return { currentVideo, startOffset, isInActiveHours, secondsToNext, isTooLate };
}
