import React, { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Check, RectangleHorizontal, RectangleVertical, Square, Circle, Maximize } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Cropper from 'react-easy-crop';
import { getCroppedImg, type Area } from '@/lib/cropImage';

interface Props {
  value: string;
  onChange: (url: string) => void;
  compact?: boolean;
  /** Limit available shape presets by ID. When provided, only these presets are shown. */
  allowedShapes?: string[];
  /** Default selected shape preset ID. Falls back to first available. */
  defaultShape?: string;
  /** When true, show "Podgląd na stronie wydarzenia" panel below cropper. */
  showEventBannerPreview?: boolean;
}

interface ShapePreset {
  id: string;
  label: string;
  aspect: number | undefined;
  cropShape: 'rect' | 'round';
  icon: React.ReactNode;
}

const SHAPE_PRESETS: ShapePreset[] = [
  { id: 'h21_9', label: '21:9', aspect: 21 / 9, cropShape: 'rect', icon: <RectangleHorizontal className="h-4 w-4" /> },
  { id: 'h16_9', label: '16:9', aspect: 16 / 9, cropShape: 'rect', icon: <RectangleHorizontal className="h-4 w-4" /> },
  { id: 'h4_3', label: '4:3', aspect: 4 / 3, cropShape: 'rect', icon: <RectangleHorizontal className="h-3.5 w-3.5" /> },
  { id: 'v9_16', label: '9:16', aspect: 9 / 16, cropShape: 'rect', icon: <RectangleVertical className="h-4 w-4" /> },
  { id: 'v3_4', label: '3:4', aspect: 3 / 4, cropShape: 'rect', icon: <RectangleVertical className="h-3.5 w-3.5" /> },
  { id: 'square', label: 'Kwadrat', aspect: 1, cropShape: 'rect', icon: <Square className="h-4 w-4" /> },
  { id: 'circle', label: 'Koło', aspect: 1, cropShape: 'round', icon: <Circle className="h-4 w-4" /> },
  { id: 'oval_h', label: 'Owal ↔', aspect: 16 / 9, cropShape: 'round', icon: <span className="h-4 w-4 inline-flex items-center justify-center"><span className="block w-4 h-2.5 rounded-full border-2 border-current" /></span> },
  { id: 'oval_v', label: 'Owal ↕', aspect: 9 / 16, cropShape: 'round', icon: <span className="h-4 w-4 inline-flex items-center justify-center"><span className="block w-2.5 h-4 rounded-full border-2 border-current" /></span> },
  { id: 'free', label: 'Dowolny', aspect: undefined, cropShape: 'rect', icon: <Maximize className="h-4 w-4" /> },
];

export const ImageUploadInput: React.FC<Props> = ({
  value,
  onChange,
  compact,
  allowedShapes,
  defaultShape,
  showEventBannerPreview,
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtered preset list per allowedShapes whitelist
  const availablePresets = React.useMemo(
    () => (allowedShapes && allowedShapes.length > 0
      ? SHAPE_PRESETS.filter(p => allowedShapes.includes(p.id))
      : SHAPE_PRESETS),
    [allowedShapes]
  );
  const initialShape = defaultShape && availablePresets.some(p => p.id === defaultShape)
    ? defaultShape
    : availablePresets[0]?.id ?? 'h16_9';

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedShape, setSelectedShape] = useState<string>(initialShape);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const activePreset = availablePresets.find(p => p.id === selectedShape) || availablePresets[0] || SHAPE_PRESETS[0];

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Błąd', description: 'Dozwolone tylko pliki graficzne.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Błąd', description: 'Max 5MB.', variant: 'destructive' });
      return;
    }

    setSelectedFile(file);
    setCropSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSelectedShape(initialShape);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Live preview: regenerate cropped thumbnail when crop area changes
  React.useEffect(() => {
    if (!showEventBannerPreview || !cropSrc || !croppedAreaPixels) return;
    let cancelled = false;
    let lastUrl: string | null = null;
    const timeoutId = window.setTimeout(async () => {
      try {
        const blob = await getCroppedImg(cropSrc, croppedAreaPixels, 'rect');
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        lastUrl = url;
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        // ignore preview errors
      }
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (lastUrl) {
        // url ownership transferred to state; do not revoke here
      }
    };
  }, [cropSrc, croppedAreaPixels, showEventBannerPreview]);

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels || !selectedFile) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(cropSrc, croppedAreaPixels, activePreset.cropShape);
      const isRound = activePreset.cropShape === 'round';
      const ext = isRound ? 'png' : 'jpg';
      const contentType = isRound ? 'image/png' : 'image/jpeg';
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('landing-images').upload(path, croppedBlob, {
        contentType,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('landing-images').getPublicUrl(path);
      const shapeTag = activePreset.id !== 'h16_9' ? `#shape=${activePreset.id}` : '';
      onChange(urlData.publicUrl + shapeTag);
      toast({ title: 'Przesłano!' });
      closeCropDialog();
    } catch (err: any) {
      toast({ title: 'Błąd uploadu', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const closeCropDialog = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCropSrc(null);
    setSelectedFile(null);
    setCroppedAreaPixels(null);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-2">
      {value && !compact && (
        <div className="relative w-full">
          <img src={value} alt="Podgląd" className="w-full max-h-64 object-contain rounded-md border bg-muted" />
          <button onClick={() => onChange('')} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder="URL lub prześlij plik" className="flex-1 text-sm" />
        <Button type="button" variant="outline" size="icon" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <Dialog open={!!cropSrc} onOpenChange={(open) => { if (!open) closeCropDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pozycjonowanie zdjęcia</DialogTitle>
          </DialogHeader>

          {/* Shape selector */}
          <div className="overflow-x-auto pb-1">
            <ToggleGroup
              type="single"
              value={selectedShape}
              onValueChange={(v) => { if (v) { setSelectedShape(v); setCrop({ x: 0, y: 0 }); setZoom(1); } }}
              className="flex flex-wrap gap-1 justify-start"
            >
              {SHAPE_PRESETS.map((preset) => (
                <ToggleGroupItem
                  key={preset.id}
                  value={preset.id}
                  aria-label={preset.label}
                  className="flex flex-col items-center gap-0.5 px-2 py-1.5 text-xs min-w-[48px]"
                >
                  {preset.icon}
                  <span className="text-[10px] leading-tight">{preset.label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="relative w-full h-64 bg-muted rounded-md overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                minZoom={0.3}
                aspect={activePreset.aspect}
                cropShape={activePreset.cropShape}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={activePreset.cropShape === 'rect'}
              />
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
            <Slider
              value={[zoom]}
              min={0.3}
              max={3}
              step={0.05}
              onValueChange={([v]) => setZoom(v)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCropDialog} disabled={uploading}>
              <X className="w-3 h-3 mr-1" /> Anuluj
            </Button>
            <Button onClick={handleCropConfirm} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
              Zatwierdź
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
