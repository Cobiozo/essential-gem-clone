import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HowToDisableTranslatorDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { tf } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {tf('browser_translation.how_title', 'Jak wyłączyć tłumacza przeglądarki')}
          </DialogTitle>
          <DialogDescription>
            {tf(
              'browser_translation.how_intro',
              'Wybierz instrukcję dla swojej przeglądarki:'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Google Chrome</h4>
            <p className="text-muted-foreground">
              {tf(
                'browser_translation.how_chrome',
                'Kliknij prawym przyciskiem na stronie → „Wyświetl oryginał" lub w ikonie tłumacza w pasku adresu wybierz „Nigdy nie tłumacz tej strony".'
              )}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Microsoft Edge</h4>
            <p className="text-muted-foreground">
              {tf(
                'browser_translation.how_edge',
                'Ikona tłumacza w pasku adresu → „Pokaż oryginał" oraz odznacz „Zawsze tłumacz strony z tego języka".'
              )}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Safari</h4>
            <p className="text-muted-foreground">
              {tf(
                'browser_translation.how_safari',
                'W pasku adresu kliknij ikonę „A" → „Pokaż oryginał".'
              )}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Mozilla Firefox</h4>
            <p className="text-muted-foreground">
              {tf(
                'browser_translation.how_firefox',
                'W ikonie tłumacza w pasku adresu wybierz „Pokaż oryginał".'
              )}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
