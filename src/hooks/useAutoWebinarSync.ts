import { useState, useEffect, useRef, useCallback } from 'react';
import type { AutoWebinarVideo, AutoWebinarConfig } from '@/types/autoWebinar';

/**
 * Get current time components in a specific timezone using Intl API.
 */
function getNowInTimezone(tz: string): { hours: number; minutes: number; seconds: number; dateStr: string } {
  const now = new Date();
  try {
    const timeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
    }).formatToParts(now);
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(now); // "YYYY-MM-DD" format

    const get = (type: string) => parseInt(timeParts.find(p => p.type === type)?.value || '0');
    let hours = get('hour');
    if (hours === 24) hours = 0; // Intl may return 24 for midnight

    return { hours, minutes: get('minute'), seconds: get('second'), dateStr: dateParts };
  } catch {
    // Fallback to local time if timezone is invalid
    return {
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
      dateStr: now.toISOString().slice(0, 10),
    };
  }
}

const DEFAULT_TIMEZONE = 'Europe/Warsaw';

/**
 * Parse "HH:MM" to seconds past midnight
 */
function parseTimeToSeconds(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 3600 + (m || 0) * 60;
}

/**
 * Extract time portion from slot string.
 * Handles both "HH:MM" and "YYYY-MM-DD_HH:MM" formats.
 */
function extractTimeFromSlot(slot: string): string {
  if (slot.includes('_')) {
    return slot.split('_')[1];
  }
  return slot;
}

/**
 * Extract date portion from slot string, or null if legacy format.
 */
function extractDateFromSlot(slot: string): string | null {
  if (slot.includes('_')) {
    return slot.split('_')[0];
  }
  return null;
}

/**
 * Check if a dated slot belongs to today in the given timezone.
 */
function isSlotToday(slot: string, tz: string): boolean {
  const date = extractDateFromSlot(slot);
  if (!date) return true;
  const { dateStr } = getNowInTimezone(tz);
  return date === dateStr;
}

/**
 * Check if a dated slot is in the past (before today in the given timezone).
 */
function isSlotInPast(slot: string, tz: string): boolean {
  const date = extractDateFromSlot(slot);
  if (!date) return false;
  const { dateStr } = getNowInTimezone(tz);
  return date < dateStr;
}

/**
 * Find the nearest slot from slot_hours list for current time.
 * Window extends to cover full video duration + thank-you + buffer.
 */
function findCurrentSlot(slotHours: string[], secondsPastMidnight: number, config: AutoWebinarConfig, maxVideoDuration = 0) {
  const roomOpenSec = (config.room_open_minutes_before ?? 5) * 60;
  const roomCloseAfterEndSec = 60;
  
  // Window must cover full video duration + thank-you screen + close buffer
  const effectiveWindowEnd = maxVideoDuration + roomCloseAfterEndSec + 60;
  
  const sorted = [...slotHours]
    .map(t => ({ time: t, seconds: parseTimeToSeconds(t) }))
    .sort((a, b) => a.seconds - b.seconds);

  for (const slot of sorted) {
    const windowStart = slot.seconds - roomOpenSec;
    const windowEnd = slot.seconds + effectiveWindowEnd;
    if (secondsPastMidnight >= windowStart && secondsPastMidnight < windowEnd) {
      return slot;
    }
  }

  for (const slot of sorted) {
    if (slot.seconds - roomOpenSec > secondsPastMidnight) {
      return { ...slot, isUpcoming: true };
    }
  }

  if (sorted.length > 0) {
    return { ...sorted[0], isUpcoming: true, isTomorrow: true };
  }

  return null;
}

export interface AutoWebinarSyncResult {
  currentVideo: AutoWebinarVideo | null;
  startOffset: number;
  isInActiveHours: boolean;
  secondsToNext: number;
  isTooLate: boolean;
  isLinkExpired: boolean;
  isNoInvitation: boolean;
  isVideoEnded: boolean;
  isRoomClosed: boolean;
}

/**
 * Helper: determine video state based on sinceSlot and duration.
 * Returns 'playing' | 'ended' | 'closed'
 */
function getVideoPhase(sinceSlot: number, duration: number): 'playing' | 'ended' | 'closed' {
  const THANK_YOU_DURATION = 60;
  if (duration <= 0) return 'playing'; // unknown duration — keep playing
  if (sinceSlot < duration) return 'playing';
  if (sinceSlot < duration + THANK_YOU_DURATION) return 'ended';
  return 'closed';
}

/**
 * Synchronized auto-webinar playback with explicit slot hours and guest link validation.
 */
export function useAutoWebinarSync(
  videos: AutoWebinarVideo[],
  config: AutoWebinarConfig | null,
  isGuest = false,
  guestSlotTime?: string | null,
  previewMode = false,
  bypassLateBlock = false
): AutoWebinarSyncResult {
  const [currentVideo, setCurrentVideoRaw] = useState<AutoWebinarVideo | null>(null);
  const prevVideoIdRef = useRef<string | null>(null);
  const [startOffset, setStartOffset] = useState(0);
  const [isInActiveHours, setIsInActiveHours] = useState(false);
  const [secondsToNext, setSecondsToNext] = useState(0);
  const [isTooLate, setIsTooLate] = useState(false);
  const [isLinkExpired, setIsLinkExpired] = useState(false);
  const [isNoInvitation, setIsNoInvitation] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  const hasStartedPlayingRef = useRef(bypassLateBlock);

  // Stable setter: only triggers re-render when video ID actually changes
  const setCurrentVideo = useCallback((video: AutoWebinarVideo | null) => {
    const newId = video?.id ?? null;
    if (newId !== prevVideoIdRef.current) {
      prevVideoIdRef.current = newId;
      setCurrentVideoRaw(video);
    }
  }, []);

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

    const slotHours = config.slot_hours || [];
    const useExplicitSlots = slotHours.length > 0;

    let intervalId: ReturnType<typeof setInterval>;
    let currentIntervalMs = 0;

    const updateInterval = (ms: number) => {
      if (ms !== currentIntervalMs) {
        currentIntervalMs = ms;
        clearInterval(intervalId);
        intervalId = setInterval(calculate, ms);
      }
    };

    const resetFlags = () => {
      setIsTooLate(false);
      setIsLinkExpired(false);
      setIsNoInvitation(false);
      setIsVideoEnded(false);
      setIsRoomClosed(false);
    };

    const calculate = () => {
      // Preview mode: always play first active video, bypass all slot/time logic
      if (previewMode && activeVideos.length > 0) {
        resetFlags();
        setIsInActiveHours(true);
        setCurrentVideo(activeVideos[0]);
        setStartOffset(0);
        setSecondsToNext(0);
        updateInterval(30000);
        return;
      }

      const tz = (config as any).timezone || DEFAULT_TIMEZONE;
      const now = new Date();
      const tzNow = getNowInTimezone(tz);
      const currentHour = tzNow.hours;
      const currentMinute = tzNow.minutes;
      const currentSecond = tzNow.seconds;
      const secondsPastMidnight = currentHour * 3600 + currentMinute * 60 + currentSecond;

      console.log('[AutoWebinarSync] calculate:', {
        time: `${currentHour}:${currentMinute}:${currentSecond}`,
        secondsPastMidnight,
        isGuest,
        guestSlotTime,
        useExplicitSlots,
        videosCount: activeVideos.length,
      });

      if (useExplicitSlots) {
        calculateExplicitSlots(now, secondsPastMidnight, activeVideos, slotHours, tz);
      } else {
        calculateLegacy(now, secondsPastMidnight, activeVideos);
      }
    };

    const calculateExplicitSlots = (
      now: Date,
      secondsPastMidnight: number,
      activeVideos: AutoWebinarVideo[],
      slotHours: string[],
      tz: string
    ) => {
      const roomOpenSec = (config.room_open_minutes_before ?? 5) * 60;
      const countdownSec = (config.countdown_minutes_before ?? 2) * 60;
      const lateJoinMaxSec = config.late_join_max_seconds ?? 300;

      // GUEST with slot parameter — strict validation
      if (isGuest && guestSlotTime) {
        // Handle both "HH:MM" and "YYYY-MM-DD_HH:MM" formats
        const slotTimePart = extractTimeFromSlot(guestSlotTime);
        
        // If slot has a date and it's in the past → room closed
        if (isSlotInPast(guestSlotTime, tz)) {
          resetFlags();
          setIsRoomClosed(true);
          setCurrentVideo(null);
          setIsInActiveHours(false);
          setStartOffset(-1);
          setSecondsToNext(0);
          updateInterval(10000);
          return;
        }
        
        // If slot has a future date (not today) → show countdown
        if (!isSlotToday(guestSlotTime, tz)) {
          const slotDate = extractDateFromSlot(guestSlotTime)!;
          const slotDateTime = new Date(`${slotDate}T${slotTimePart}:00`);
          const msToSlot = slotDateTime.getTime() - now.getTime();
          const secToSlot = Math.max(0, Math.floor(msToSlot / 1000));
          resetFlags();
          setIsInActiveHours(false);
          setCurrentVideo(null);
          setStartOffset(-1);
          setSecondsToNext(secToSlot);
          updateInterval(secToSlot <= 300 ? 1000 : 10000);
          return;
        }
        
        // Slot is for today — use time portion for calculations
        const guestSlotSec = parseTimeToSeconds(slotTimePart);
        const sinceSlot = secondsPastMidnight - guestSlotSec;

        // Select video based on slot index (match by time portion)
        const slotIndex = slotHours.indexOf(slotTimePart);
        const videoIndex = (slotIndex >= 0 ? slotIndex : 0) % activeVideos.length;
        const video = activeVideos[videoIndex];
        const duration = video.duration_seconds;

        console.log('[AutoWebinarSync] guest slot calc:', {
          guestSlotTime,
          slotTimePart,
          guestSlotSec,
          sinceSlot,
          duration,
          roomOpenSec,
          lateJoinMaxSec,
        });

        // Determine phase based strictly on video duration
        const phase = getVideoPhase(sinceSlot, duration);

        // Room closed (after thank-you period)
        if (phase === 'closed') {
          resetFlags();
          setIsRoomClosed(true);
          setCurrentVideo(null);
          setIsInActiveHours(false);
          setStartOffset(-1);
          setSecondsToNext(0);
          updateInterval(10000);
          return;
        }

        // Video ended — thank you screen
        if (phase === 'ended') {
          resetFlags();
          setIsVideoEnded(true);
          setIsInActiveHours(true);
          setCurrentVideo(video);
          setStartOffset(-1);
          setSecondsToNext(0);
          updateInterval(1000);
          return;
        }

        // Too early (before room opens) — show single countdown to slot start
        if (sinceSlot < -roomOpenSec) {
          resetFlags();
          setIsInActiveHours(true);
          setCurrentVideo(null);
          setStartOffset(-1);
          setSecondsToNext(guestSlotSec - secondsPastMidnight);
          updateInterval(guestSlotSec - secondsPastMidnight <= 300 ? 1000 : 10000);
          return;
        }

        // Room open, countdown phase (before slot start)
        if (sinceSlot < 0) {
          resetFlags();
          setIsInActiveHours(true);
          setCurrentVideo(null);
          setStartOffset(-1);
          setSecondsToNext(Math.abs(sinceSlot));
          updateInterval(sinceSlot > -countdownSec ? 1000 : 10000);
          return;
        }

        // Late join blocking (guest joined after allowed threshold)
        // bypassLateBlock skips this so returning guests can rejoin
        if (sinceSlot > lateJoinMaxSec && duration > 0 && sinceSlot < duration && !bypassLateBlock && !hasStartedPlayingRef.current) {
          resetFlags();
          setIsTooLate(true);
          setCurrentVideo(null);
          setIsInActiveHours(true);
          setStartOffset(-1);
          setSecondsToNext(0);
          updateInterval(10000);
          return;
        }

        // Playing (0 <= sinceSlot < duration)
        hasStartedPlayingRef.current = true;
        resetFlags();
        setIsInActiveHours(true);
        setCurrentVideo(video);
        setStartOffset(sinceSlot);
        setSecondsToNext(0);
        // Increase precision near end of video
        const timeToEnd = duration > 0 ? duration - sinceSlot : Infinity;
        updateInterval(timeToEnd <= 30 ? 1000 : 10000);
        return;
      }

      // GUEST without slot parameter — no access
      if (isGuest && !guestSlotTime) {
        resetFlags();
        setIsNoInvitation(true);
        setCurrentVideo(null);
        setIsInActiveHours(false);
        setStartOffset(-1);
        setSecondsToNext(0);
        updateInterval(10000);
        return;
      }

      // LOGGED-IN USER — find current/next slot
      const maxDuration = Math.max(...activeVideos.map(v => v.duration_seconds || 0));
      const slot = findCurrentSlot(slotHours, secondsPastMidnight, config, maxDuration);
      
      if (!slot) {
        resetFlags();
        setIsInActiveHours(false);
        setCurrentVideo(null);
        setSecondsToNext(0);
        updateInterval(10000);
        return;
      }

      const sinceSlot = secondsPastMidnight - slot.seconds;

      if ('isUpcoming' in slot && slot.isUpcoming) {
        resetFlags();
        setIsInActiveHours(false);
        setCurrentVideo(null);
        const secToRoom = 'isTomorrow' in slot && slot.isTomorrow
          ? (slot.seconds + 86400 - secondsPastMidnight - roomOpenSec)
          : (slot.seconds - roomOpenSec - secondsPastMidnight);
        setSecondsToNext(Math.max(0, secToRoom));
        updateInterval(secToRoom <= 300 ? 1000 : 10000);
        return;
      }

      // Within active window — countdown phase
      if (sinceSlot < 0) {
        resetFlags();
        setIsInActiveHours(true);
        setCurrentVideo(null);
        setStartOffset(-1);
        setSecondsToNext(Math.abs(sinceSlot));
        updateInterval(sinceSlot > -countdownSec ? 1000 : 10000);
        return;
      }

      // Playing / ended / closed — select video
      const slotIndex = slotHours.indexOf(slot.time);
      const videoIndex = (slotIndex >= 0 ? slotIndex : 0) % activeVideos.length;
      const video = activeVideos[videoIndex];
      const duration = video.duration_seconds;
      const phase = getVideoPhase(sinceSlot, duration);

      // Room closed (after thank-you period)
      if (phase === 'closed') {
        resetFlags();
        setIsRoomClosed(true);
        setCurrentVideo(null);
        setIsInActiveHours(false);
        setStartOffset(-1);
        setSecondsToNext(0);
        updateInterval(10000);
        return;
      }

      // Video ended — thank you screen
      if (phase === 'ended') {
        resetFlags();
        setIsVideoEnded(true);
        setIsInActiveHours(true);
        setCurrentVideo(video);
        setStartOffset(-1);
        setSecondsToNext(0);
        updateInterval(1000);
        return;
      }

      // Still playing
      resetFlags();
      setIsInActiveHours(true);
      setCurrentVideo(video);
      setStartOffset(sinceSlot);
      setSecondsToNext(0);
      // Increase precision near end of video
      const timeToEnd = duration > 0 ? duration - sinceSlot : Infinity;
      updateInterval(timeToEnd <= 30 ? 1000 : 10000);
    };

    const calculateLegacy = (
      now: Date,
      secondsPastMidnight: number,
      activeVideos: AutoWebinarVideo[]
    ) => {
      const activeStartSeconds = config.start_hour * 3600;
      const activeEndSeconds = config.end_hour * 3600;
      const intervalSeconds = (config.interval_minutes || 60) * 60;
      const preEntryWindow = 300;
      const lateJoinMaxSeconds = config.late_join_max_seconds ?? 300;

      if (secondsPastMidnight >= activeStartSeconds - preEntryWindow && secondsPastMidnight < activeStartSeconds) {
        setIsInActiveHours(false);
        setCurrentVideo(null);
        setSecondsToNext(activeStartSeconds - secondsPastMidnight);
        updateInterval(1000);
        return;
      }

      if (secondsPastMidnight < activeStartSeconds - preEntryWindow || secondsPastMidnight >= activeEndSeconds) {
        setIsInActiveHours(false);
        setCurrentVideo(null);
        let nextStartSeconds = activeStartSeconds - preEntryWindow;
        if (secondsPastMidnight >= activeEndSeconds) {
          nextStartSeconds = activeStartSeconds - preEntryWindow + 86400;
        }
        setSecondsToNext(nextStartSeconds - secondsPastMidnight);
        updateInterval((nextStartSeconds - secondsPastMidnight) <= 300 ? 1000 : 10000);
        return;
      }

      setIsInActiveHours(true);
      setIsLinkExpired(false);
      setIsNoInvitation(false);

      const secondsSinceStart = secondsPastMidnight - activeStartSeconds;
      const currentSlotIndex = Math.floor(secondsSinceStart / intervalSeconds);
      const secondsIntoSlot = secondsSinceStart % intervalSeconds;
      const nextSlotStartSec = activeStartSeconds + (currentSlotIndex + 1) * intervalSeconds;

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
        updateInterval(10000);
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

    calculate();
    intervalId = setInterval(calculate, 10000);
    currentIntervalMs = 10000;

    return () => clearInterval(intervalId);
  }, [videos, config, isGuest, guestSlotTime, previewMode, bypassLateBlock]);

  // Reset ref when slot or config changes
  useEffect(() => {
    hasStartedPlayingRef.current = bypassLateBlock;
  }, [guestSlotTime, config?.id, bypassLateBlock]);

  return { currentVideo, startOffset, isInActiveHours, secondsToNext, isTooLate, isLinkExpired, isNoInvitation, isVideoEnded, isRoomClosed };
}
