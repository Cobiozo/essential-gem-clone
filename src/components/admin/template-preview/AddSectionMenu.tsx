import React, { useState, useEffect } from 'react';
import { Plus, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SECTION_TYPE_OPTIONS } from './defaultSectionConfigs';

interface Props {
  onAdd: (type: string) => void;
  onPaste?: () => void;
}

export const AddSectionMenu: React.FC<Props> = ({ onAdd, onPaste }) => {
  const [open, setOpen] = useState(false);
  const [hasClipboard, setHasClipboard] = useState(false);

  useEffect(() => {
    if (open) {
      setHasClipboard(!!localStorage.getItem('copied_section'));
    }
  }, [open]);

  return (
    <div className="flex justify-center py-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 rounded-full border-dashed border-2 text-muted-foreground hover:text-foreground hover:border-primary">
            <Plus className="w-4 h-4" /> Dodaj sekcję
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="center">
          <div className="grid gap-1 max-h-72 overflow-y-auto">
            {onPaste && (
              <button
                className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm transition-colors border-b border-border mb-1 pb-2 ${hasClipboard ? 'hover:bg-muted text-foreground' : 'text-muted-foreground/50 cursor-not-allowed'}`}
                onClick={() => { if (hasClipboard) { onPaste(); setOpen(false); } }}
                disabled={!hasClipboard}
              >
                <ClipboardPaste className="w-4 h-4" />
                <span>Wklej skopiowaną sekcję</span>
              </button>
            )}
            {SECTION_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                onClick={() => { onAdd(opt.type); setOpen(false); }}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
