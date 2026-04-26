import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Upload, X, Loader2, Check, RectangleHorizontal, RectangleVertical, Square, Circle,
  Maximize, Crop, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Smartphone, Tablet, Monitor,
} from 'lucide-react';
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

type DevicePreview = 'mobile' | 'tablet' | 'desktop';
const DEVICE_ASPECT: Record<DevicePreview, string> = {
  mobile: '16 / 9',
  tablet: '2 / 1',
  desktop: '21 / 9',
};

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
  const availablePresets = useMemo(
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
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedShape, setSelectedShape] = useState<string>(initialShape);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop');

  const activePreset = availablePresets.find(p => p.id === selectedShape) || availablePresets[0] || SHAPE_PRESETS[0];

  // Position as % of crop area (0..100). Computed from crop.x/y vs the
  // current visible movement range in the cropper. We derive it from
  // mediaSize, zoom and aspect — the same math react-easy-crop uses internally.
  const movementBounds = useMemo(() => {
    if (!mediaSize) return { maxX: 0, maxY: 0 };
    // Approximate: react-easy-crop allows panning by (mediaSize * zoom - cropArea) / 2.
    // We don't know the cropArea pixel size here, but for percentage display
    // we just need a bound > 0. Use mediaSize * (zoom - 1) / 2 as a safe proxy
    // (so percentage feels meaningful). Falls back gracefully when zoom <= 1.
    const halfRange = (z: number) => Math.max(50, (Math.max(z, 1) - 1) * 200 + 100);
    return { maxX: halfRange(zoom), maxY: halfRange(zoom) };
  }, [mediaSize, zoom]);

  const posXPct = movementBounds.maxX > 0 ? Math.round((crop.x / movementBounds.maxX) * 100) : 0;
  const posYPct = movementBounds.maxY > 0 ? Math.round((crop.y / movementBounds.maxY) * 100) : 0;

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const onMediaLoaded = useCallback((size: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => {
    setMediaSize({ width: size.naturalWidth, height: size.naturalHeight });
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
    resetTransform();
    setSelectedShape(initialShape);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const resetTransform = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  // Live preview: regenerate cropped thumbnail when crop area changes
  useEffect(() => {
    if (!showEventBannerPreview || !cropSrc || !croppedAreaPixels) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const blob = await getCroppedImg(cropSrc, croppedAreaPixels, 'rect', { rotation, flipH, flipV });
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
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
    };
  }, [cropSrc, croppedAreaPixels, rotation, flipH, flipV, showEventBannerPreview]);

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(cropSrc, croppedAreaPixels, activePreset.cropShape, { rotation, flipH, flipV });
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
      toast({ title: selectedFile ? 'Przesłano!' : 'Zaktualizowano kadrowanie!' });
      closeCropDialog();
    } catch (err: any) {
      toast({ title: 'Błąd uploadu', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleEditExisting = async () => {
    if (!value) return;
    const hashIdx = value.indexOf('#');
    const cleanUrl = hashIdx >= 0 ? value.slice(0, hashIdx) : value;
    const shapeMatch = hashIdx >= 0 ? value.slice(hashIdx + 1).match(/shape=([\w-]+)/) : null;
    const shapeId = shapeMatch?.[1];

    setUploading(true);
    try {
      const bust = `${cleanUrl.includes('?') ? '&' : '?'}_=${Date.now()}`;
      const res = await fetch(cleanUrl + bust, { mode: 'cors', cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      setSelectedFile(null);
      setCropSrc(objectUrl);
      resetTransform();
      setSelectedShape(
        shapeId && availablePresets.some(p => p.id === shapeId) ? shapeId : initialShape
      );
      setPreviewUrl(null);
    } catch (err: any) {
      toast({
        title: 'Nie można otworzyć obrazu',
        description: 'Spróbuj wgrać plik ponownie z dysku.',
        variant: 'destructive',
      });
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
    setMediaSize(null);
    setPreviewUrl(null);
  };

  // Quick alignment helpers (snap to 9-grid)
  const alignTo = (h: 'left' | 'center' | 'right', v: 'top' | 'center' | 'bottom') => {
    const dx = h === 'left' ? -movementBounds.maxX : h === 'right' ? movementBounds.maxX : 0;
    const dy = v === 'top' ? -movementBounds.maxY : v === 'bottom' ? movementBounds.maxY : 0;
    setCrop({ x: dx, y: dy });
  };

  // Keyboard nudging while dialog open (arrows = 1px, shift = 10px)
  useEffect(() => {
    if (!cropSrc) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setCrop(c => ({ ...c, x: c.x - step })); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setCrop(c => ({ ...c, x: c.x + step })); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setCrop(c => ({ ...c, y: c.y - step })); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); setCrop(c => ({ ...c, y: c.y + step })); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cropSrc]);

  // Number input helpers
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  return (
    <div className="space-y-2">
      {value && !compact && (
        <div className="relative w-full">
          <img src={value} alt="Podgląd" className="w-full max-h-64 object-contain rounded-md border bg-muted" />
          <div className="absolute top-1 right-1 flex gap-1">
            <button
              type="button"
              onClick={handleEditExisting}
              disabled={uploading}
              className="bg-background/90 hover:bg-background text-foreground rounded-full p-1.5 shadow-sm border transition-colors disabled:opacity-50"
              title="Edytuj kadrowanie"
              aria-label="Edytuj kadrowanie"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crop className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-sm transition-colors hover:bg-destructive/90"
              title="Usuń obraz"
              aria-label="Usuń obraz"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder="URL lub prześlij plik" className="flex-1 text-sm" />
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleEditExisting}
            disabled={uploading}
            title="Edytuj kadrowanie"
            aria-label="Edytuj kadrowanie"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />}
          </Button>
        )}
        <Button type="button" variant="outline" size="icon" onClick={() => inputRef.current?.click()} disabled={uploading} title="Wgraj nowy plik" aria-label="Wgraj nowy plik">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <Dialog open={!!cropSrc} onOpenChange={(open) => { if (!open) closeCropDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
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
              {availablePresets.map((preset) => (
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

          <div className="relative w-full h-80 md:h-96 bg-muted rounded-md overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                minZoom={0.3}
                maxZoom={5}
                aspect={activePreset.aspect}
                cropShape={activePreset.cropShape}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                onMediaLoaded={onMediaLoaded}
                showGrid={activePreset.cropShape === 'rect'}
              />
            )}

            {/* Banner safe-zone overlays — only when banner preview is active and rect crop */}
            {showEventBannerPreview && activePreset.cropShape === 'rect' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {/* The cropper itself shows the user-selected aspect; these overlays
                    illustrate the responsive banner crops within that area. */}
                <div className="relative w-[92%] h-[92%]">
                  {/* 21:9 desktop safe zone — centered horizontal strip */}
                  <div
                    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-2 border-yellow-400/80 bg-yellow-400/5"
                    style={{ height: '42.857%' /* 9/21 */ }}
                  >
                    <span className="absolute -top-5 left-0 text-[10px] font-semibold text-yellow-300 bg-black/60 px-1.5 py-0.5 rounded">
                      Desktop 21:9 — strefa zawsze widoczna
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
            <span>Zoom: <span className="font-mono text-foreground">{zoom.toFixed(2)}×</span></span>
            <span>Pozycja: <span className="font-mono text-foreground">{posXPct >= 0 ? '+' : ''}{posXPct}% × {posYPct >= 0 ? '+' : ''}{posYPct}%</span></span>
            <span>Obrót: <span className="font-mono text-foreground">{Math.round(rotation)}°</span></span>
            {(flipH || flipV) && (
              <span>Lustro: <span className="font-mono text-foreground">{[flipH && 'poziomo', flipV && 'pionowo'].filter(Boolean).join(' + ')}</span></span>
            )}
            <span className="ml-auto opacity-70">Strzałki = 1px • Shift+Strzałki = 10px</span>
          </div>

          {/* Zoom controls */}
          <div className="space-y-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0 w-12">Zoom</span>
              <Slider
                value={[zoom]}
                min={0.3}
                max={5}
                step={0.05}
                onValueChange={([v]) => setZoom(v)}
                className="flex-1"
              />
              <Input
                type="number"
                value={zoom.toFixed(2)}
                step={0.05}
                min={0.3}
                max={5}
                onChange={(e) => setZoom(clamp(parseFloat(e.target.value) || 1, 0.3, 5))}
                className="h-7 w-20 text-xs text-center"
              />
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setZoom(1)}>Reset</Button>
            </div>

            {/* Position X */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0 w-12">Pozioma</span>
              <Slider
                value={[crop.x]}
                min={-movementBounds.maxX || -500}
                max={movementBounds.maxX || 500}
                step={1}
                onValueChange={([v]) => setCrop(c => ({ ...c, x: v }))}
                className="flex-1"
              />
              <Input
                type="number"
                value={Math.round(crop.x)}
                step={1}
                onChange={(e) => setCrop(c => ({ ...c, x: parseInt(e.target.value) || 0 }))}
                className="h-7 w-20 text-xs text-center"
              />
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setCrop(c => ({ ...c, x: 0 }))}>Reset</Button>
            </div>

            {/* Position Y */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0 w-12">Pionowa</span>
              <Slider
                value={[crop.y]}
                min={-movementBounds.maxY || -500}
                max={movementBounds.maxY || 500}
                step={1}
                onValueChange={([v]) => setCrop(c => ({ ...c, y: v }))}
                className="flex-1"
              />
              <Input
                type="number"
                value={Math.round(crop.y)}
                step={1}
                onChange={(e) => setCrop(c => ({ ...c, y: parseInt(e.target.value) || 0 }))}
                className="h-7 w-20 text-xs text-center"
              />
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setCrop(c => ({ ...c, y: 0 }))}>Reset</Button>
            </div>

            {/* Rotation */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0 w-12">Obrót</span>
              <Slider
                value={[rotation]}
                min={-180}
                max={180}
                step={1}
                onValueChange={([v]) => setRotation(v)}
                className="flex-1"
              />
              <Input
                type="number"
                value={Math.round(rotation)}
                step={1}
                min={-180}
                max={180}
                onChange={(e) => setRotation(clamp(parseInt(e.target.value) || 0, -180, 180))}
                className="h-7 w-20 text-xs text-center"
              />
              <Button type="button" size="icon" variant="outline" className="h-7 w-7" title="Obrót -90°" onClick={() => setRotation(r => ((r - 90 + 540) % 360) - 180)}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="icon" variant="outline" className="h-7 w-7" title="Obrót +90°" onClick={() => setRotation(r => ((r + 90 + 540) % 360) - 180)}>
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setRotation(0)}>Reset</Button>
            </div>
          </div>

          {/* Flip + alignment grid + reset */}
          <div className="flex flex-wrap items-start gap-3 px-1 pt-1">
            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground">Lustro</div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={flipH ? 'default' : 'outline'}
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setFlipH(v => !v)}
                  title="Odbij poziomo"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" /> Poziomo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={flipV ? 'default' : 'outline'}
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setFlipV(v => !v)}
                  title="Odbij pionowo"
                >
                  <FlipVertical className="h-3.5 w-3.5" /> Pionowo
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground">Wyrównaj kadr</div>
              <div className="grid grid-cols-3 gap-0.5 w-[84px]">
                {(['top', 'center', 'bottom'] as const).map((v) =>
                  (['left', 'center', 'right'] as const).map((h) => (
                    <button
                      key={`${v}-${h}`}
                      type="button"
                      onClick={() => alignTo(h, v)}
                      className="h-7 w-7 rounded border border-border hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
                      title={`Wyrównaj: ${v === 'top' ? 'góra' : v === 'bottom' ? 'dół' : 'środek'}-${h === 'left' ? 'lewo' : h === 'right' ? 'prawo' : 'środek'}`}
                      aria-label={`align-${v}-${h}`}
                    >
                      <span className="block w-1.5 h-1.5 rounded-full bg-foreground/70" />
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-1 ml-auto">
              <div className="text-[11px] text-muted-foreground opacity-0 select-none">.</div>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={resetTransform}>
                Resetuj wszystko
              </Button>
            </div>
          </div>

          {showEventBannerPreview && (
            <div className="space-y-1.5 pt-3 border-t">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Podgląd na stronie wydarzenia
                </p>
                <ToggleGroup
                  type="single"
                  value={devicePreview}
                  onValueChange={(v) => { if (v) setDevicePreview(v as DevicePreview); }}
                  className="gap-0.5"
                >
                  <ToggleGroupItem value="mobile" aria-label="Mobile" className="h-7 px-2 text-[11px] gap-1">
                    <Smartphone className="h-3 w-3" /> 16:9
                  </ToggleGroupItem>
                  <ToggleGroupItem value="tablet" aria-label="Tablet" className="h-7 px-2 text-[11px] gap-1">
                    <Tablet className="h-3 w-3" /> 2:1
                  </ToggleGroupItem>
                  <ToggleGroupItem value="desktop" aria-label="Desktop" className="h-7 px-2 text-[11px] gap-1">
                    <Monitor className="h-3 w-3" /> 21:9
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div
                className="relative w-full max-h-[560px] bg-muted rounded-md overflow-hidden"
                style={{ aspectRatio: DEVICE_ASPECT[devicePreview] }}
              >
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Podgląd bannera"
                      className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 min-h-[120px] bg-gradient-to-t from-background/90 via-background/55 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 sm:pb-4">
                      <p className="text-sm font-semibold text-foreground line-clamp-1 drop-shadow-lg">
                        Tytuł wydarzenia
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Generowanie podglądu…
                  </div>
                )}
              </div>
            </div>
          )}
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
