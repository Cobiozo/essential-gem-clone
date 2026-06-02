import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { useIntroVideoSettings, type IntroFrequency, type IntroTriggerMoment } from '@/hooks/useIntroVideoSettings';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_KEY = 'intro_video_played_session';
const DAILY_KEY = 'intro_video_played_date';
const WEEKLY_KEY = 'intro_video_played_week';
const USER_KEY_PREFIX = 'intro_video_played_user_';
const LOGIN_TRIGGER_KEY = 'intro_video_login_trigger';

const isoWeek = (d = new Date()) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${weekNo}`;
};

const shouldShowByFrequency = (frequency: IntroFrequency, userId?: string | null, loginTrigger?: number): boolean => {
  if (frequency === 'always') return true;
  if (frequency === 'once_per_session') return sessionStorage.getItem(SESSION_KEY) !== '1';
  if (frequency === 'once_per_day') {
    const today = new Date().toISOString().slice(0, 10);
    return localStorage.getItem(DAILY_KEY) !== today;
  }
  if (frequency === 'once_per_week') return localStorage.getItem(WEEKLY_KEY) !== isoWeek();
  if (frequency === 'once_per_user') {
    if (!userId) return true;
    return localStorage.getItem(USER_KEY_PREFIX + userId) !== '1';
  }
  if (frequency === 'every_login') {
    return sessionStorage.getItem(LOGIN_TRIGGER_KEY) !== String(loginTrigger ?? 0);
  }
  return true;
};

const markPlayed = (frequency: IntroFrequency, userId?: string | null, loginTrigger?: number) => {
  if (frequency === 'once_per_session') sessionStorage.setItem(SESSION_KEY, '1');
  else if (frequency === 'once_per_day') localStorage.setItem(DAILY_KEY, new Date().toISOString().slice(0, 10));
  else if (frequency === 'once_per_week') localStorage.setItem(WEEKLY_KEY, isoWeek());
  else if (frequency === 'once_per_user' && userId) localStorage.setItem(USER_KEY_PREFIX + userId, '1');
  else if (frequency === 'every_login') sessionStorage.setItem(LOGIN_TRIGGER_KEY, String(loginTrigger ?? 0));
};

const matchesTrigger = (
  trigger: IntroTriggerMoment,
  pathname: string,
  user: any,
  loginTrigger: number,
  lastSeenLoginTriggerRef: React.MutableRefObject<number>,
): boolean => {
  switch (trigger) {
    case 'app_start':
      return true;
    case 'auth_page':
      return pathname === '/auth';
    case 'before_login':
      return pathname === '/auth' && !user;
    case 'after_login':
      return !!user && loginTrigger > lastSeenLoginTriggerRef.current;
    case 'dashboard_entry':
      return !!user && pathname.startsWith('/dashboard');
    default:
      return true;
  }
};

export const IntroVideoOverlay: React.FC = () => {
  const { data: settings, isLoading } = useIntroVideoSettings();
  const { user, loginTrigger } = useAuth();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showSkip, setShowSkip] = useState(false);
  const lastSeenLoginTriggerRef = useRef(loginTrigger);
  const playedForPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || !settings) return;
    if (!settings.enabled || !settings.video_url) return;
    if (!settings.show_on_anonymous && !user) return;

    const trigger = (settings.trigger_moment as IntroTriggerMoment) ?? 'app_start';
    if (!matchesTrigger(trigger, location.pathname, user, loginTrigger, lastSeenLoginTriggerRef)) return;
    if (!shouldShowByFrequency(settings.frequency, user?.id, loginTrigger)) return;

    const key = `${trigger}:${location.pathname}:${loginTrigger}`;
    if (playedForPathRef.current === key) return;
    playedForPathRef.current = key;

    setMuted(settings.default_muted);
    setVisible(true);
    markPlayed(settings.frequency, user?.id, loginTrigger);
    lastSeenLoginTriggerRef.current = loginTrigger;
  }, [isLoading, settings, user, loginTrigger, location.pathname]);

  useEffect(() => {
    if (!visible || !settings?.allow_skip) return;
    const t = window.setTimeout(() => setShowSkip(true), settings.skip_after_ms);
    return () => window.clearTimeout(t);
  }, [visible, settings]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settings?.allow_skip) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, settings]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 2) handleClose();
    }, 3000);
    return () => window.clearTimeout(t);
  }, [visible]);

  const handleClose = () => {
    setClosing(true);
    window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
      setShowSkip(false);
    }, 300);
  };

  const toggleMute = () => {
    setMuted((m) => {
      if (videoRef.current) videoRef.current.muted = !m;
      return !m;
    });
  };

  if (!visible || !settings?.video_url) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-300 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-label="Intro"
    >
      <video
        ref={videoRef}
        src={settings.video_url}
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        className="w-full h-full object-cover"
        onEnded={handleClose}
        onError={handleClose}
      />

      <button
        type="button"
        onClick={toggleMute}
        className="absolute bottom-6 left-6 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition"
        aria-label={muted ? 'Włącz dźwięk' : 'Wycisz'}
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {settings.allow_skip && showSkip && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 text-sm font-medium animate-fade-in"
          aria-label="Pomiń intro"
        >
          Pomiń <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
