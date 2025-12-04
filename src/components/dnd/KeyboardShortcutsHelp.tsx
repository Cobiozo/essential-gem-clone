import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { keyboardShortcuts } from './hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  className?: string;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ className }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          title="Skróty klawiszowe (?)"
        >
          <Keyboard className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Skróty klawiszowe
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {keyboardShortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <span className="text-sm text-muted-foreground">{shortcut.action}</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded shadow-sm">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Naciśnij <kbd className="px-1 py-0.5 text-xs bg-muted rounded">?</kbd> aby otworzyć tę pomoc
        </p>
      </DialogContent>
    </Dialog>
  );
};
