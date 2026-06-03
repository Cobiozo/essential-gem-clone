import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrowserTranslationDetector } from '@/hooks/useBrowserTranslationDetector';
import { useLanguage } from '@/contexts/LanguageContext';
import { HowToDisableTranslatorDialog } from './HowToDisableTranslatorDialog';

const DISMISS_KEY = 'plc-browser-translation-dismissed';
const DISMISS_HOURS = 24;

export const BrowserTranslationWarning: React.FC = () => {
  const isTranslated = useBrowserTranslationDetector();
  const { tf } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return;
      const ts = parseInt(raw, 10);
      if (Date.now() - ts < DISMISS_HOURS * 60 * 60 * 1000) {
        setDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    } catch {}
  }, []);

  if (!isTranslated || dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setDismissed(true);
  };

  return (
    <>
      <div
        translate="no"
        className="notranslate sticky top-0 z-[150] w-full bg-destructive text-destructive-foreground shadow-lg"
        role="alert"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 text-sm leading-snug">
            <strong className="font-semibold mr-1">
              {tf('browser_translation.title', 'Wykryto tłumacza przeglądarki.')}
            </strong>
            <span>
              {tf(
                'browser_translation.body',
                'Pure Life Center posiada własny przełącznik języka w górnym pasku ('
              )}
            </span>
            <Globe className="inline-block h-3.5 w-3.5 mx-1 -mt-0.5" />
            <span>
              {tf(
                'browser_translation.body_tail',
                '). Wyłącz tłumacza przeglądarki, aby uniknąć błędów wyświetlania.'
              )}
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 whitespace-nowrap"
            onClick={() => setShowHow(true)}
          >
            {tf('browser_translation.how_btn', 'Jak wyłączyć?')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive-foreground hover:bg-destructive-foreground/10"
            onClick={handleDismiss}
            aria-label={tf('common.close', 'Zamknij')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <HowToDisableTranslatorDialog open={showHow} onOpenChange={setShowHow} />
    </>
  );
};
