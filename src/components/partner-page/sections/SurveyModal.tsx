import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { SurveySection } from './SurveySection';

interface Props {
  config: Record<string, any>;
  open: boolean;
  onClose: () => void;
}

export const SurveyModal: React.FC<Props> = ({ config, open, onClose }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Content */}
      <div className="relative w-full max-w-3xl mx-4 my-8 max-h-[calc(100vh-4rem)] overflow-y-auto rounded-2xl bg-background shadow-2xl">
        <button
          onClick={onClose}
          className="sticky top-3 float-right mr-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-muted/80 hover:bg-muted text-foreground transition-colors"
          aria-label="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>
        <SurveySection config={config} />
      </div>
    </div>
  );
};
