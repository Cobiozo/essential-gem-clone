import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Monitor, Smartphone } from 'lucide-react';
import type { IntroVideoSettings } from '@/hooks/useIntroVideoSettings';
import { IntroVideoStage } from '@/components/intro/IntroVideoStage';

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
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [replayKey, setReplayKey] = useState(0);

  const stageProps = {
    settings,
    mode: 'preview' as const,
    resetKey: `${replayKey}-${device}-${settings.display_size}-${settings.position}-${settings.custom_width_percent}-${settings.backdrop_style}-${settings.object_fit}-${settings.border_radius}-${settings.video_url}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 border-b flex-row items-center justify-between gap-3 space-y-0">
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-4 h-4" /> Podgląd intro wideo (realny wygląd)
          </DialogTitle>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border p-0.5 bg-muted">
              <button
                type="button"
                onClick={() => setDevice('desktop')}
                className={`px-2.5 py-1 text-xs rounded flex items-center gap-1.5 ${device === 'desktop' ? 'bg-background shadow-sm' : 'opacity-60'}`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setDevice('mobile')}
                className={`px-2.5 py-1 text-xs rounded flex items-center gap-1.5 ${device === 'mobile' ? 'bg-background shadow-sm' : 'opacity-60'}`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setReplayKey((k) => k + 1)}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Odtwórz
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 bg-muted/30">
          <div className="mx-auto" style={{ maxWidth: device === 'desktop' ? '100%' : 380 }}>
            <div className="text-xs text-muted-foreground mb-2 text-center">
              {device === 'desktop' ? 'Symulacja okna przeglądarki' : 'Symulacja telefonu'}
            </div>
            <div
              className="relative w-full rounded-xl overflow-hidden border border-border shadow-2xl bg-background"
              style={{ aspectRatio: device === 'desktop' ? '16 / 10' : '9 / 19' }}
            >
              {/* fake page background */}
              <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted/50" />
              <IntroVideoStage key={stageProps.resetKey} {...stageProps} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm max-w-5xl mx-auto">
            <div className="rounded-lg border border-border bg-card/50 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Momenty</div>
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
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Rozmiar / pozycja</div>
              <div className="font-medium">
                {settings.display_size}
                {settings.display_size === 'custom' ? ` (${settings.custom_width_percent}%)` : ''}
                {' · '}{settings.position}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IntroVideoPreviewDialog;
