import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Film, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadNewsHubFile } from '@/hooks/useNewsHub';
import { VideoFrameCapturePicker } from '../VideoFrameCapturePicker';

interface Props {
  videoUrl?: string | null;
  value?: string | null;
  onChange: (url: string | null) => void;
}

function isHostedVideo(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return !lower.includes('youtube.com') && !lower.includes('youtu.be') && !lower.includes('vimeo.com');
}

export const PosterPickerField: React.FC<Props> = ({ videoUrl, value, onChange }) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const canPickFrame = isHostedVideo(videoUrl);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadNewsHubFile(file, 'covers', { kind: 'cover' });
      if (url) {
        onChange(url);
        toast.success('Okładka wgrana');
      } else {
        toast.error('Błąd uploadu');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Błąd uploadu');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Okładka wideo</Label>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="h-16 w-28 rounded object-cover border border-border" />
          <button type="button" onClick={() => onChange(null)} className="text-destructive text-xs flex items-center gap-1 hover:underline">
            <X className="h-3.5 w-3.5" /> Usuń okładkę
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Bez okładki widz zobaczy czarny ekran przed odtworzeniem.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1" />}
          Wgraj okładkę
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canPickFrame || !videoUrl}
          title={!canPickFrame ? 'Dostępne tylko dla wgranego MP4 (YouTube/Vimeo mają własne miniatury)' : ''}
          onClick={() => setPickerOpen(true)}
        >
          <Film className="h-4 w-4 mr-1" />
          Wybierz klatkę z wideo
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
        />
      </div>
      {videoUrl && canPickFrame && (
        <VideoFrameCapturePicker
          videoUrl={videoUrl}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPicked={onChange}
        />
      )}
    </div>
  );
};
