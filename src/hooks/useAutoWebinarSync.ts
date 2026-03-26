import { useState, useEffect } from 'react';
import type { AutoWebinarVideo, AutoWebinarConfig } from '@/types/autoWebinar';

/**
 * Parse "HH:MM" to seconds past midnight
 */
function parseTimeToSeconds(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 3600 + (m || 0) * 60;
}

/**
 * Find the nearest slot from slot_hours list for current time.
 */
function findCurrentSlot(slotHours: string[], secondsPastMidnight: number, config: AutoWebinarConfig) {
  const roomOpenSec = (config.room_open_minutes_before ?? 5) * 60;
  const linkExpirySec = (config.link_expiry_minutes ?? 10) * 60;
  
  const sorted = [...slotHours]
    .map(t => ({ time: t, seconds: parseTimeToSeconds(t) }))
    .sort((a, b) => a.seconds - b.seconds);

  for (const slot of sorted) {
    const windowStart = slot.seconds - roomOpenSec;
    const windowEnd = slot.seconds + linkExpirySec;
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
  const [currentVideo, setCurrentVideo] = useState<AutoWebinarVideo | null>(null);
  const [startOffset, setStartOffset] = useState(0);
  const [isInActiveHours, setIsInActiveHours] = useState(false);
  const [secondsToNext, setSecondsToNext] = useState(0);
  const [isTooLate, setIsTooLate] = useState(false);
  const [isLinkExpired, setIsLinkExpired] = useState(false);
  const [isNoInvitation, setIsNoInvitation] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isRoomClosed, setIsRoomClosed] = useState(false);

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

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
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
        calculateExplicitSlots(now, secondsPastMidnight, activeVideos, slotHours);
      } else {
        calculateLegacy(now, secondsPastMidnight, activeVideos);
      }
    };

    const calculateExplicitSlots = (
      now: Date,
      secondsPastMidnight: number,
      activeVideos: AutoWebinarVideo[],
      slotHours: string[]
    ) => {
      const roomOpenSec = (config.room_open_minutes_before ?? 5) * 60;
      const countdownSec = (config.countdown_minutes_before ?? 2) * 60;
      const linkExpirySec = (config.link_expiry_minutes ?? 10) * 60;
      const lateJoinMaxSec = config.late_join_max_seconds ?? 300;
      const roomCloseAfterEndSec = 60; // 1 min after video ends → room closed

      // GUEST with slot parameter — strict validation
      if (isGuest && guestSlotTime) {
        const guestSlotSec = parseTimeToSeconds(guestSlotTime);
        const sinceSlot = secondsPastMidnight - guestSlotSec;

        // Select video based on slot index
        const slotIndex = slotHours.indexOf(guestSlotTime);
        const videoIndex = (slotIndex >= 0 ? slotIndex : 0) % activeVideos.length;
        const video = activeVideos[videoIndex];
        const duration = video.duration_seconds;

        console.log('[AutoWebinarSync] guest slot calc:', {
          guestSlotTime,
          guestSlotSec,
          sinceSlot,
          duration,
          roomCloseAfterEndSec,
          linkExpirySec,
          lateJoinMaxSec,
          roomOpenSec,
        });

        // Room closed (1 min after video ends)
        if (duration > 0 && sinceSlot >= duration + roomCloseAfterEndSec) {
          resetFlags();
          setIsRoomClosed(true);
          setCurrentVideo(null);
          setIsInActiveHours(false);
          setStartOffset(-1);
          setSecondsToNext(0);
          updateInterval(10000);
          return;
        }

        // Video ended but room still open (thank you screen)
        if (duration > 0 && sinceSlot >= duration && sinceSlot < duration + roomCloseAfterEndSec) {
          resetFlags();
          setIsVideoEnded(true);
          setIsInActiveHours(true);
          setCurrentVideo(video);
          setStartOffset(-1);
          setSecondsToNext(0);
          updateInterval(1000);
          return;
        }

        // Link expired — only if video is NOT currently playing
        // If video is still running (sinceSlot < duration), let it play regardless of linkExpiry
        if (sinceSlot > linkExpirySec && (duration <= 0 || sinceSlot >= duration)) {
          resetFlags();
          setIsLinkExpired(true);
          setCurrentVideo(null);
          setIsInActiveHours(false);
          setStartOffset(-1);
          setSecondsToNext(0);
          updateInterval(10000);
          return;
        }

        // Too early (before room opens)
        if (sinceSlot < -roomOpenSec) {
          resetFlags();
          setCurrentVideo(null);
          setIsInActiveHours(false);
          setSecondsToNext(guestSlotSec - roomOpenSec - secondsPastMidnight);
          updateInterval(10000);
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
        if (sinceSlot > lateJoinMaxSec && duration > 0 && sinceSlot < duration && !bypassLateBlock) {
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
        resetFlags();
        setIsInActiveHours(true);

        if (duration > 0 && sinceSlot < duration) {
          setCurrentVideo(video);
          setStartOffset(sinceSlot);
          setSecondsToNext(0);
          updateInterval(10000);
        } else if (duration <= 0) {
          // Unknown duration — just play
          setCurrentVideo(video);
          setStartOffset(0);
          updateInterval(10000);
        }
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
      const slot = findCurrentSlot(slotHours, secondsPastMidnight, config);
      
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

      // Within active window
      if (sinceSlot < 0) {
        resetFlags();
        setIsInActiveHours(true);
        setCurrentVideo(null);
        setStartOffset(-1);
        setSecondsToNext(Math.abs(sinceSlot));
        updateInterval(sinceSlot > -countdownSec ? 1000 : 10000);
        return;
      }

      // Playing
      resetFlags();
      setIsInActiveHours(true);

      const slotIndex = slotHours.indexOf(slot.time);
      const videoIndex = (slotIndex >= 0 ? slotIndex : 0) % activeVideos.length;
      const video = activeVideos[videoIndex];

      if (video.duration_seconds > 0 && sinceSlot < video.duration_seconds) {
        setCurrentVideo(video);
        setStartOffset(sinceSlot);
        setSecondsToNext(0);
        updateInterval(10000);
      } else {
        setCurrentVideo(null);
        setStartOffset(-1);
        const nextSlotIdx = slotHours.indexOf(slot.time) + 1;
        if (nextSlotIdx < slotHours.length) {
          const nextSec = parseTimeToSeconds(slotHours[nextSlotIdx]);
          setSecondsToNext(nextSec - secondsPastMidnight);
        } else {
          setSecondsToNext(0);
        }
        updateInterval(10000);
      }
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

  return { currentVideo, startOffset, isInActiveHours, secondsToNext, isTooLate, isLinkExpired, isNoInvitation, isVideoEnded, isRoomClosed };
}
