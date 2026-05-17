import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_LOCATIONS, type AppLocation } from './mobileNavRegistry';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentPath: string;
  onPick: (path: string) => void;
}

const MobileNavPathPicker: React.FC<Props> = ({ open, onOpenChange, currentPath, onPick }) => {
  const [custom, setCustom] = useState('');

  const groups = useMemo(() => {
    const map = new Map<string, AppLocation[]>();
    APP_LOCATIONS.forEach((loc) => {
      const g = loc.group || 'Inne';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(loc);
    });
    return Array.from(map.entries());
  }, []);

  const handlePick = (path: string) => {
    onPick(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wskaż miejsce w aplikacji</DialogTitle>
          <DialogDescription>
            Kliknij kafelek odpowiadający miejscu, do którego ma prowadzić ta pozycja paska.
            Obecnie wybrane: <code className="text-xs">{currentPath || '—'}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {groups.map(([group, items]) => (
            <div key={group}>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{group}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map((loc) => {
                  const Cmp = (Icons as any)[loc.iconName] || Icons.Circle;
                  const active = currentPath === loc.path;
                  return (
                    <button
                      key={loc.path}
                      type="button"
                      onClick={() => handlePick(loc.path)}
                      className={cn(
                        'flex items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted',
                        active ? 'border-primary bg-primary/5' : 'border-border'
                      )}
                    >
                      <Cmp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{loc.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{loc.path}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="border-t pt-4">
            <Label className="text-xs">Ścieżka własna (dla zaawansowanych)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="/np-nowa-strona"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
              <Button
                onClick={() => custom.trim().startsWith('/') && handlePick(custom.trim())}
                disabled={!custom.trim().startsWith('/')}
              >
                Użyj
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MobileNavPathPicker;
