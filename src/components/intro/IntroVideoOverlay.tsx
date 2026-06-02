import React, { useEffect, useRef, useState } from 'react';
import { useIntroVideoSettings, type IntroFrequency, type IntroTriggerMoment } from '@/hooks/useIntroVideoSettings';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { IntroVideoStage } from './IntroVideoStage';

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

const triggerMatches = (
  trigger: IntroTriggerMoment,
  pathname: string,
  user: any,
  loginTrigger: number,
  lastSeenLoginTrigger: number,
): boolean => {
  switch (trigger) {
    case 'app_start': return true;
    case 'auth_page': return pathname === '/auth';
    case 'before_login': return pathname === '/auth' && !user;
    case 'after_login': return !!user && loginTrigger > lastSeenLoginTrigger;
    case 'dashboard_entry': return !!user && pathname.startsWith('/dashboard');
    default: return false;
  }
};

export const IntroVideoOverlay: React.FC = () => {
  const { data: settings, isLoading } = useIntroVideoSettings();
  const { user, loginTrigger } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const lastSeenLoginTriggerRef = useRef(loginTrigger);
  const playedForKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || !settings) return;
    if (!settings.enabled || !settings.video_url) return;
    if (!settings.show_on_anonymous && !user) return;

    const moments = settings.trigger_moments?.length
      ? settings.trigger_moments
      : (settings.trigger_moment ? [settings.trigger_moment] : ['app_start' as IntroTriggerMoment]);

    const matched = moments.find((m) =>
      triggerMatches(m, location.pathname, user, loginTrigger, lastSeenLoginTriggerRef.current),
    );
    if (!matched) return;

    if (!shouldShowByFrequency(settings.frequency, user?.id, loginTrigger)) return;

    const key = `${matched}:${location.pathname}:${loginTrigger}`;
    if (playedForKeyRef.current === key) return;
    playedForKeyRef.current = key;

    setVisible(true);
    markPlayed(settings.frequency, user?.id, loginTrigger);
    lastSeenLoginTriggerRef.current = loginTrigger;
  }, [isLoading, settings, user, loginTrigger, location.pathname]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settings?.allow_skip) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, settings]);

  const handleClose = () => {
    setClosing(true);
    window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 300);
  };

  if (!visible || !settings?.video_url) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`}
    >
      <IntroVideoStage settings={settings} mode="live" onClose={handleClose} />
    </div>
  );
};
