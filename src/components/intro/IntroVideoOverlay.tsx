import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { useIntroVideoSettings } from '@/hooks/useIntroVideoSettings';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_KEY = 'intro_video_played_session';
const DAILY_KEY = 'intro_video_played_date';

const shouldShowByFrequency = (frequency: string): boolean => {
  if (frequency === 'always') return true;
  if (frequency === 'once_per_session') {
    return sessionStorage.getItem(SESSION_KEY) !== '1';
  }
  if (frequency === 'once_per_day') {
    const today = new Date().toISOString().slice(0, 10);
    return localStorage.getItem(DAILY_KEY) !== today;
  }
  return true;
};

const markPlayed = (frequency: string) => {
  if (frequency === 'once_per_session') {
    sessionStorage.setItem(SESSION_KEY, '1');
  } else if (frequency === 'once_per_day') {
    localStorage.setItem(DAILY_KEY, new Date().toISOString().slice(0, 10));
  }
};

export const IntroVideoOverlay: React.FC = () => {
  const { data: settings, isLoading } = useIntroVideoSettings();
  const { user } = useAuth();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showSkip, setShowSkip] = useState(false);

  // Decide visibility once per mount based on settings
  useEffect(() => {
    if (isLoading || !settings) return;
    if (!settings.enabled || !settings.video_url) return;
    if (!settings.show_on_anonymous && !user) return;
    if (settings.show_on_auth_only && location.pathname !== '/auth') return;
    if (!shouldShowByFrequency(settings.frequency)) return;

    setMuted(settings.default_muted);
    setVisible(true);
    markPlayed(settings.frequency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Show skip button after delay
  useEffect(() => {
    if (!visible || !settings?.allow_skip) return;
    const t = window.setTimeout(() => setShowSkip(true), settings.skip_after_ms);
    return () => window.clearTimeout(t);
  }, [visible, settings]);

  // Esc to skip
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settings?.allow_skip) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, settings]);

  // Safety auto-close if video doesn't load in 3s
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 2) handleClose();
    }, 3000);
    return () => window.clearTimeout(t);
  }, [visible]);

  const handleClose = () => {
    setClosing(true);
    window.setTimeout(() => setVisible(false), 300);
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

      {/* Sound toggle */}
      <button
        type="button"
        onClick={toggleMute}
        className="absolute bottom-6 left-6 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition"
        aria-label={muted ? 'Włącz dźwięk' : 'Wycisz'}
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Skip */}
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
