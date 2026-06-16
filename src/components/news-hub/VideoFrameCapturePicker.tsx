import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadNewsHubFile } from '@/hooks/useNewsHub';

interface Props {
  videoUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPicked: (url: string) => void;
}

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t - Math.floor(t)) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

export const VideoFrameCapturePicker: React.FC<Props> = ({ videoUrl, open, onOpenChange, onPicked }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      setDuration(0);
      setCurrent(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!ready) return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowLeft') { e.preventDefault(); seek(Math.max(0, current - step)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); seek(Math.min(duration, current + step)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, ready, current, duration]);

  const seek = (t: number) => {
    setCurrent(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    setUploading(true);
    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(video, 0, 0, w, h);
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.9);
      });
      const file = new File([blob], `frame-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = await uploadNewsHubFile(file, 'covers', { kind: 'cover' });
      if (!url) throw new Error('Upload nie zwrócił URL');
      toast.success('Okładka ustawiona');
      onPicked(url);
      onOpenChange(false);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('tainted') || msg.toLowerCase().includes('security')) {
        toast.error('Nie można pobrać klatki z tego wideo (CORS). Wgraj okładkę ręcznie.');
      } else {
        toast.error(msg || 'Błąd zapisu klatki');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Wybierz klatkę z wideo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ maxHeight: '60vh' }}>
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              preload="auto"
              playsInline
              muted
              className="max-h-[60vh] w-full object-contain"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setDuration(v.duration || 0);
                setReady(true);
              }}
              onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{fmt(current)}</span>
              <span>{fmt(duration)}</span>
            </div>
            <Slider
              value={[current]}
              min={0}
              max={duration || 1}
              step={0.1}
              disabled={!ready}
              onValueChange={([v]) => seek(v)}
            />
            <p className="text-xs text-muted-foreground">Przewiń suwakiem (lub ←/→, Shift+←/→ = ±5s) i zatwierdź klatkę.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Anuluj</Button>
          <Button onClick={capture} disabled={!ready || uploading}>
            {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Użyj tej klatki
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
