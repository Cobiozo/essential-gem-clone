import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Save, Loader2, Upload, Trash2 } from 'lucide-react';
import { useDashboardMapSettings, DashboardMapSettings as TSettings } from '@/hooks/useDashboardMapSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const DashboardMapSettings: React.FC = () => {
  const { settings, loading, updateSettings } = useDashboardMapSettings();
  const [draft, setDraft] = useState<TSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingSide, setUploadingSide] = useState<'left' | 'right' | null>(null);
  const leftInputRef = useRef<HTMLInputElement>(null);
  const rightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (settings) setDraft(settings); }, [settings]);

  if (loading || !draft) {
    return (
      <Card><CardContent className="py-8 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Ładowanie ustawień…
      </CardContent></Card>
    );
  }

  const set = <K extends keyof TSettings>(k: K, v: TSettings[K]) =>
    setDraft({ ...draft, [k]: v });

  const handleSave = async () => {
    setSaving(true);
    const r = await updateSettings(draft);
    setSaving(false);
    if (r.success) toast.success('Ustawienia widżetu mapy zapisane');
    else toast.error(`Błąd zapisu: ${r.error}`);
  };

  const handleUpload = async (side: 'left' | 'right', file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Plik za duży (max 5MB)');
      return;
    }
    setUploadingSide(side);
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${side}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('dashboard-map-logos')
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    setUploadingSide(null);
    if (upErr) {
      toast.error(`Błąd uploadu: ${upErr.message}`);
      return;
    }
    const { data } = supabase.storage.from('dashboard-map-logos').getPublicUrl(path);
    const publicUrl = data.publicUrl;
    const next = { ...draft, [side === 'left' ? 'logo_left_url' : 'logo_right_url']: publicUrl };
    setDraft(next);
    const r = await updateSettings({ [side === 'left' ? 'logo_left_url' : 'logo_right_url']: publicUrl } as any);
    if (r.success) toast.success('Logo wgrane i zapisane');
    else toast.error(`Błąd zapisu: ${r.error}`);
  };

  const LogoSlot: React.FC<{ side: 'left' | 'right'; label: string }> = ({ side, label }) => {
    const key = side === 'left' ? 'logo_left_url' : 'logo_right_url';
    const url = draft[key] as string | null;
    const inputRef = side === 'left' ? leftInputRef : rightInputRef;
    return (
      <div className="rounded-md border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <div className="flex gap-1">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(side, f);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploadingSide === side}
            >
              {uploadingSide === side
                ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                : <Upload className="h-3 w-3 mr-1" />}
              Wgraj
            </Button>
            {url && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => set(key as any, '' as any)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="h-16 flex items-center justify-center rounded bg-muted/40 border border-dashed">
          {url
            ? <img src={url} alt={label} className="h-12 w-auto object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }} />
            : <span className="text-xs text-muted-foreground">Brak logo</span>}
        </div>
        <Input
          value={url ?? ''}
          onChange={(e) => set(key as any, e.target.value as any)}
          placeholder="URL logo (lub wgraj plik powyżej)"
          className="text-xs"
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4 text-primary" />
          Widżet mapy na pulpicie — ustawienia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Widoczność */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold">Widoczność</h4>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="enabled">Widżet włączony na pulpicie</Label>
            <Switch id="enabled" checked={draft.is_enabled}
              onCheckedChange={(v) => set('is_enabled', v)} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {([
              ['visible_to_client', 'Klient'],
              ['visible_to_partner', 'Partner'],
              ['visible_to_specjalista', 'Specjalista'],
              ['visible_to_leader', 'Lider'],
              ['visible_to_admin', 'Admin'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-md border px-2 py-2 cursor-pointer">
                <Switch checked={!!draft[key]} onCheckedChange={(v) => set(key, v as any)} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Wymiary */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold">Wymiary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Szerokość</Label>
              <Select value={draft.width} onValueChange={(v) => set('width', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Pełna</SelectItem>
                  <SelectItem value="two_thirds">2/3</SelectItem>
                  <SelectItem value="half">1/2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Wysokość: {draft.height_px}px</Label>
              <Slider min={300} max={800} step={10}
                value={[draft.height_px]}
                onValueChange={([v]) => set('height_px', v)} />
            </div>
          </div>
        </section>

        {/* Wygląd */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold">Wygląd</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Domyślny tryb</Label>
              <Select value={draft.default_mode} onValueChange={(v) => set('default_mode', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Klasyczna</SelectItem>
                  <SelectItem value="satellite">Satelitarna</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Kolor kropek</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={draft.marker_color}
                  onChange={(e) => set('marker_color', e.target.value)}
                  className="h-10 w-16 p-1" />
                <Input value={draft.marker_color}
                  onChange={(e) => set('marker_color', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Pokaż logo</Label>
              <Switch checked={draft.show_logos}
                onCheckedChange={(v) => set('show_logos', v)} />
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${draft.show_logos ? '' : 'opacity-50 pointer-events-none'}`}>
            <LogoSlot side="left" label="Logo lewe" />
            <LogoSlot side="right" label="Logo prawe" />
          </div>
        </section>

        {/* Tytuł */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold">Tytuł widżetu</h4>
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3 items-end">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Switch checked={draft.show_title}
                onCheckedChange={(v) => set('show_title', v)} />
              <span className="text-sm">Pokaż tytuł</span>
            </div>
            <Input value={draft.title} onChange={(e) => set('title', e.target.value)}
              placeholder="Mapa świata użytkowników" />
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Zapisz ustawienia
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardMapSettings;
