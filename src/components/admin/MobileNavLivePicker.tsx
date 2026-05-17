import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, MousePointerClick, Check, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (path: string, label?: string) => void;
  initialPath?: string;
}

const withPickParam = (path: string) => {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}__navpick=1`;
};

const MobileNavLivePicker: React.FC<Props> = ({ open, onOpenChange, onPick, initialPath = '/dashboard' }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [addr, setAddr] = useState(initialPath);
  const [iframeSrc, setIframeSrc] = useState(withPickParam(initialPath));
  const [selected, setSelected] = useState<{ path: string; label: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      return;
    }
    setIframeSrc(withPickParam(initialPath));
    setAddr(initialPath);
  }, [open, initialPath]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (d?.type === 'NAV_PICK' && typeof d.path === 'string') {
        setSelected({ path: d.path, label: d.label || d.path });
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const go = () => {
    const p = addr.trim();
    if (!p.startsWith('/')) return;
    setIframeSrc(withPickParam(p));
  };

  const save = () => {
    if (!selected) return;
    onPick(selected.path, selected.label);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-primary" />
            Wskaż miejsce w aplikacji kliknięciem
          </DialogTitle>
          <DialogDescription>
            Przejdź do żądanej strony, a następnie kliknij element (link, zakładka, kafelek),
            do którego ma prowadzić ta pozycja paska. Każde kliknięcie jest tylko podglądem — nie nawiguje.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40">
          <Input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="/dashboard"
            className="font-mono text-sm"
          />
          <Button variant="secondary" onClick={go}>
            <ArrowRight className="h-4 w-4 mr-1" /> Idź
          </Button>
        </div>

        <div className="flex-1 bg-background overflow-hidden">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-0"
            title="Podgląd aplikacji"
          />
        </div>

        <div className="p-3 border-t bg-muted/40 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            {selected ? (
              <div className="text-sm">
                <span className="text-muted-foreground">Wybrano: </span>
                <span className="font-medium">{selected.label}</span>
                <span className="text-muted-foreground mx-1">→</span>
                <code className="text-xs bg-background px-2 py-0.5 rounded border">{selected.path}</code>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Kliknij element wewnątrz podglądu, aby go wybrać.
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Anuluj
          </Button>
          <Button onClick={save} disabled={!selected}>
            <Check className="h-4 w-4 mr-1" /> Zapisz jako cel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MobileNavLivePicker;
