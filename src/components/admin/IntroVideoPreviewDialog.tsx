import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, X, Play, RotateCcw } from 'lucide-react';
import type { IntroVideoSettings } from '@/hooks/useIntroVideoSettings';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: IntroVideoSettings;
}

const triggerLabels: Record<string, string> = {
  app_start: 'Po włączeniu strony',
  before_login: 'Przed zalogowaniem (na /auth)',
  after_login: 'Po prawidłowym logowaniu',
  auth_page: 'Na stronie logowania (/auth)',
  dashboard_entry: 'Przy wejściu do dashboardu',
};

const frequencyLabels: Record<string, string> = {
  always: 'Zawsze',
  once_per_session: 'Raz na sesję',
  once_per_day: 'Raz dziennie',
  once_per_week: 'Raz w tygodniu',
  once_per_user: 'Raz na użytkownika',
  every_login: 'Przy każdym logowaniu',
};

export const IntroVideoPreviewDialog: React.FC<Props> = ({ open, onOpenChange, settings }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(settings.default_muted);
  const [showSkip, setShowSkip] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!open) return;
    setMuted(settings.default_muted);
    setShowSkip(false);
    setPlaying(true);
    const t = window.setTimeout(() => setShowSkip(true), settings.skip_after_ms);
    return () => window.clearTimeout(t);
  }, [open, settings.default_muted, settings.skip_after_ms]);

  const restart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    setShowSkip(false);
    setPlaying(true);
    window.setTimeout(() => setShowSkip(true), settings.skip_after_ms);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-4 h-4" /> Podgląd intro wideo
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 bg-muted/30">
          <div className="relative mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl aspect-video max-w-3xl border border-border">
            {settings.video_url ? (
              <video
                ref={videoRef}
                src={settings.video_url}
                autoPlay
                muted={muted}
                playsInline
                className="w-full h-full object-cover"
                onEnded={() => setPlaying(false)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
                Brak pliku wideo — najpierw prześlij MP4.
              </div>
            )}

            {settings.video_url && (
              <button
                type="button"
                onClick={() => {
                  setMuted((m) => {
                    if (videoRef.current) videoRef.current.muted = !m;
                    return !m;
                  });
                }}
                className="absolute bottom-4 left-4 bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-full backdrop-blur-sm transition"
                aria-label={muted ? 'Włącz dźwięk' : 'Wycisz'}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}

            {settings.video_url && settings.allow_skip && showSkip && playing && (
              <button
                type="button"
                onClick={() => setPlaying(false)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-2 text-xs font-medium"
              >
                Pomiń <X className="w-3.5 h-3.5" />
              </button>
            )}

            {!playing && settings.video_url && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <Button onClick={restart} variant="secondary" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" /> Odtwórz ponownie
                </Button>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm max-w-3xl mx-auto">
            <div className="rounded-lg border border-border bg-card/50 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Momenty wyświetlania</div>
              <div className="font-medium">
                {(settings.trigger_moments?.length ? settings.trigger_moments : [settings.trigger_moment])
                  .filter(Boolean)
                  .map((m) => triggerLabels[m as string] ?? m)
                  .join(', ') || '—'}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Częstotliwość</div>
              <div className="font-medium">{frequencyLabels[settings.frequency] ?? settings.frequency}</div>
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Przycisk „Pomiń"</div>
              <div className="font-medium">
                {settings.allow_skip ? `Po ${settings.skip_after_ms} ms` : 'Wyłączony'}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Dźwięk</div>
              <div className="font-medium">{settings.default_muted ? 'Domyślnie wyciszone' : 'Domyślnie z dźwiękiem'}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IntroVideoPreviewDialog;
