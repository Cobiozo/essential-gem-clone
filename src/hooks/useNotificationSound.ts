import { useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'notification-sounds-enabled';
const DEBOUNCE_MS = 2000;

let notificationAudio: HTMLAudioElement | null = null;
let messageAudio: HTMLAudioElement | null = null;

// Preload once globally
if (typeof window !== 'undefined') {
  notificationAudio = new Audio('/sounds/notification.mp3');
  notificationAudio.volume = 0.5;
  messageAudio = new Audio('/sounds/message.mp3');
  messageAudio.volume = 0.5;
}

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event('notification-sounds-changed'));
  } catch {}
}

export const useNotificationSound = () => {
  const lastNotifRef = useRef(0);
  const lastMsgRef = useRef(0);

  const playNotificationSound = useCallback(() => {
    if (!isSoundEnabled() || !notificationAudio) return;
    const now = Date.now();
    if (now - lastNotifRef.current < DEBOUNCE_MS) return;
    lastNotifRef.current = now;
    notificationAudio.currentTime = 0;
    notificationAudio.play().catch(() => {});
  }, []);

  const playMessageSound = useCallback(() => {
    if (!isSoundEnabled() || !messageAudio) return;
    const now = Date.now();
    if (now - lastMsgRef.current < DEBOUNCE_MS) return;
    lastMsgRef.current = now;
    messageAudio.currentTime = 0;
    messageAudio.play().catch(() => {});
  }, []);

  return { playNotificationSound, playMessageSound };
};
