import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, Image as ImageIcon, Search, Newspaper } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNewsHubBanner, type NewsHubBannerConfig } from '@/hooks/useNewsHubBanner';
import { uploadNewsHubFile } from '@/hooks/useNewsHub';
import { NewsHubBanner } from '@/components/news-hub/NewsHubBanner';

const POSITIONS = [
  'top left', 'top', 'top right',
  'left', 'center', 'right',
  'bottom left', 'bottom', 'bottom right',
];

export const NewsHubBannerEditor: React.FC = () => {
  const { config, loading, save } = useNewsHubBanner();
  const [local, setLocal] = useState<NewsHubBannerConfig | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { if (!loading) setLocal(config); }, [loading, config]);

  if (loading || !local) {
    return <Card><CardContent className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>;
  }

  const set = (patch: Partial<NewsHubBannerConfig>) => setLocal({ ...local, ...patch });

  const handleUpload = async (file: File) => {
    setUploading(true);
    const url = await uploadNewsHubFile(file, 'covers');
    setUploading(false);
    if (!url) { toast.error('Błąd uploadu'); return; }
    set({ image_url: url });
    toast.success('Wgrano obraz');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(local);
      toast.success('Zapisano baner');
    } catch (e: any) {
      toast.error(`Błąd zapisu: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] gap-4 items-start">
      {/* LEFT — Live preview (sticky), 1:1 mock of /aktualnosci scaled to fit */}
      <Card className="lg:sticky lg:top-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4 text-primary" /> Podgląd na żywo
          </CardTitle>
          <CardDescription>Realny widok strony /aktualnosci (skalowany do szerokości panelu).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScaledPagePreview>
            <NewsHubBanner config={local} />
            <NewsHubPageMock />
          </ScaledPagePreview>
        </CardContent>
      </Card>


      {/* RIGHT — Options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ustawienia banera</CardTitle>
          <CardDescription>Konfiguracja wyglądu strony /aktualnosci.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Enabled */}
          <div className="flex items-center justify-between border rounded-md px-4 py-3">
            <div>
              <div className="font-medium">Włącz baner</div>
              <div className="text-xs text-muted-foreground">Gdy wyłączony — pokazuje się domyślny nagłówek tekstowy.</div>
            </div>
            <Switch checked={local.enabled} onCheckedChange={(v) => set({ enabled: v })} />
          </div>

          {/* Treść */}
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label>Tytuł</Label>
              <Input value={local.title || ''} onChange={(e) => set({ title: e.target.value })} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Podtytuł</Label>
              <Input value={local.subtitle || ''} onChange={(e) => set({ subtitle: e.target.value })} maxLength={300} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Etykieta CTA</Label>
                <Input value={local.cta_label || ''} onChange={(e) => set({ cta_label: e.target.value || null as any })} placeholder="np. Zobacz więcej" />
              </div>
              <div className="space-y-2">
                <Label>Link CTA</Label>
                <Input value={local.cta_url || ''} onChange={(e) => set({ cta_url: e.target.value || null as any })} placeholder="https://... lub /dashboard" />
              </div>
            </div>
          </div>

          {/* Obraz */}
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Obraz tła</div>
            {local.image_url && (
              <div className="flex items-center gap-2 text-xs">
                <img src={local.image_url} alt="" className="h-14 w-24 rounded object-cover border border-border" />
                <span className="truncate flex-1 text-muted-foreground">{local.image_url}</span>
                <button onClick={() => set({ image_url: null })} className="text-destructive"><X className="h-4 w-4" /></button>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-muted">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>Wgraj obraz banera</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
            </label>
            <div>
              <Label className="text-xs mb-1 block">URL obrazu</Label>
              <Input value={local.image_url || ''} onChange={(e) => set({ image_url: e.target.value || null })} placeholder="https://..." className="h-9 text-xs" />
            </div>

            <div>
              <Label className="text-xs mb-1 block">Dopasowanie</Label>
              <div className="flex gap-1">
                {(['cover', 'contain', 'fill'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => set({ fit: f })}
                    className={cn('flex-1 rounded px-2 py-1 text-xs border transition capitalize',
                      local.fit === f ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50')}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Pozycja obrazu</Label>
              <div className="grid grid-cols-3 gap-1 max-w-[200px]">
                {POSITIONS.map((p) => (
                  <button key={p} type="button" onClick={() => set({ position: p })} title={p}
                    className={cn('h-8 rounded border transition text-[10px]',
                      local.position === p ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50')}>·</button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Wysokość</Label>
                <span className="text-xs text-muted-foreground">{local.height}px</span>
              </div>
              <Slider min={180} max={700} step={10} value={[local.height]} onValueChange={([n]) => set({ height: n })} />
            </div>
          </div>

          {/* Nakładka */}
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nakładka koloru</div>
            <div className="grid grid-cols-2 gap-2 items-end">
              <div>
                <Label className="text-xs mb-1 block">Kolor</Label>
                <input type="color" value={local.overlay_color} onChange={(e) => set({ overlay_color: e.target.value })}
                  className="h-9 w-full rounded border border-border bg-transparent cursor-pointer" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Krycie</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(local.overlay_opacity * 100)}%</span>
                </div>
                <Slider min={0} max={100} step={1} value={[Math.round(local.overlay_opacity * 100)]} onValueChange={([n]) => set({ overlay_opacity: n / 100 })} />
              </div>
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <div className="text-sm">Gradient od dołu (lepsza czytelność)</div>
              <Switch checked={local.overlay_gradient} onCheckedChange={(v) => set({ overlay_gradient: v })} />
            </div>
          </div>

          {/* Typografia */}
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tekst</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1 block">Kolor tytułu</Label>
                <input type="color" value={local.title_color} onChange={(e) => set({ title_color: e.target.value })}
                  className="h-9 w-full rounded border border-border bg-transparent cursor-pointer" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Kolor podtytułu</Label>
                <input type="color" value={local.subtitle_color} onChange={(e) => set({ subtitle_color: e.target.value })}
                  className="h-9 w-full rounded border border-border bg-transparent cursor-pointer" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Wyrównanie</Label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button key={a} type="button" onClick={() => set({ text_align: a })}
                    className={cn('flex-1 rounded px-2 py-1 text-xs border transition capitalize',
                      local.text_align === a ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50')}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Rozmiar tytułu</Label>
                <span className="text-xs text-muted-foreground">{local.title_size}px</span>
              </div>
              <Slider min={20} max={80} step={1} value={[local.title_size]} onValueChange={([n]) => set({ title_size: n })} />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-card/95 backdrop-blur border-t border-border">
            <Button onClick={handleSave} disabled={saving} className="gap-2 w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Zapisz baner
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const REF_WIDTH = 1280;

const ScaledPagePreview: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(400);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;
    const update = () => {
      const w = wrap.clientWidth;
      const s = Math.min(1, w / REF_WIDTH);
      setScale(s);
      setHeight(inner.scrollHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div
      ref={wrapRef}
      className="w-full overflow-hidden rounded-b-xl border-t border-border bg-background"
      style={{ height }}
    >
      <div
        ref={innerRef}
        style={{ width: REF_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  );
};

const NewsHubPageMock: React.FC = () => (
  <section className="container max-w-7xl mx-auto px-4 pb-6">
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 flex-1 min-w-[220px]">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Szukaj...</span>
      </div>
      {['Wszystkie', 'Ogłoszenia', 'Artykuły', 'Wideo'].map((c, i) => (
        <span key={c} className={cn('rounded-full px-3 py-1.5 text-xs border', i === 0 ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground')}>
          {c}
        </span>
      ))}
    </div>

    <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-4">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className={cn('rounded-xl border border-border bg-card overflow-hidden', i === 1 && 'col-span-2 row-span-2')}>
            <div className="aspect-video bg-muted" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-2/3 rounded bg-muted" />
              <div className="h-2 w-1/2 rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
      <aside className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Archiwum</div>
        </div>
        <ul className="space-y-2 text-sm">
          {['Czerwiec 2026', 'Maj 2026', 'Kwiecień 2026', 'Marzec 2026'].map((m) => (
            <li key={m} className="flex justify-between text-muted-foreground">
              <span>{m}</span>
              <span>·</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  </section>
);

export default NewsHubBannerEditor;
