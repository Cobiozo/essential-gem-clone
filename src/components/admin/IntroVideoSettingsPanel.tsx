import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Video as VideoIcon, Eye } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  normalizeSettings,
  ALL_TRIGGER_MOMENTS,
  TRIGGER_MOMENT_LABELS,
  type IntroTriggerMoment,
  type IntroVideoSettings,
} from '@/hooks/useIntroVideoSettings';
import { IntroVideoPreviewDialog } from './IntroVideoPreviewDialog';

const DEFAULTS: Omit<IntroVideoSettings, 'id'> = {
  enabled: false,
  video_url: null,
  show_on_auth_only: false,
  show_on_anonymous: true,
  frequency: 'always',
  trigger_moments: ['app_start'],
  trigger_moment: 'app_start',
  skip_after_ms: 1500,
  allow_skip: true,
  default_muted: true,
};

export const IntroVideoSettingsPanel: React.FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<IntroVideoSettings | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('intro_video_settings' as any)
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
    setSettings(normalizeSettings(data));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (patch: Partial<IntroVideoSettings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : ({ ...DEFAULTS, id: '', ...patch } as IntroVideoSettings)));
  };

  const toggleMoment = (m: IntroTriggerMoment, checked: boolean) => {
    setSettings((s) => {
      const base = s ?? ({ ...DEFAULTS, id: '' } as IntroVideoSettings);
      const set = new Set(base.trigger_moments ?? []);
      if (checked) set.add(m); else set.delete(m);
      return { ...base, trigger_moments: Array.from(set) };
    });
  };

  const save = async () => {
    if (!settings) return;
    if (!settings.trigger_moments || settings.trigger_moments.length === 0) {
      toast({ title: 'Brak momentu', description: 'Zaznacz co najmniej jeden moment wyświetlania.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      enabled: settings.enabled,
      video_url: settings.video_url,
      show_on_auth_only: settings.show_on_auth_only,
      show_on_anonymous: settings.show_on_anonymous,
      frequency: settings.frequency,
      trigger_moments: settings.trigger_moments,
      trigger_moment: settings.trigger_moments[0] ?? null,
      skip_after_ms: settings.skip_after_ms,
      allow_skip: settings.allow_skip,
      default_muted: settings.default_muted,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };
    const res = settings.id
      ? await supabase.from('intro_video_settings' as any).update(payload).eq('id', settings.id)
      : await supabase.from('intro_video_settings' as any).insert(payload);
    if (res.error) {
      toast({ title: 'Błąd zapisu', description: res.error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Zapisano', description: 'Ustawienia intro wideo zostały zaktualizowane.' });
      qc.invalidateQueries({ queryKey: ['intro-video-settings'] });
      load();
    }
    setSaving(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'Plik za duży', description: 'Maks. 50 MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop() || 'mp4';
    const path = `intro-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('intro-videos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (upErr) {
      let msg = upErr.message;
      if (/bucket not found/i.test(msg)) {
        msg = 'Magazyn wideo „intro-videos" nie istnieje — uruchom migrację Supabase.';
      } else if (/row.?level security|policy|unauthor/i.test(msg)) {
        msg = 'Brak uprawnień: tylko administrator może wgrywać intro wideo.';
      }
      toast({ title: 'Błąd uploadu', description: msg, variant: 'destructive' });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('intro-videos').getPublicUrl(path);
    update({ video_url: data.publicUrl });
    setUploading(false);
    toast({ title: 'Plik przesłany', description: 'Nie zapomnij kliknąć „Zapisz".' });
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Ładowanie…</div>;

  const s = settings ?? ({ ...DEFAULTS, id: '' } as IntroVideoSettings);
  const activeMoments = new Set(s.trigger_moments ?? []);

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><VideoIcon className="w-5 h-5" /> Intro wideo</CardTitle>
          <CardDescription>
            Krótki film odtwarzany jako ekran powitalny przy wejściu do aplikacji.
            Zalecana długość: 4–5 sekund, format MP4, max 50 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Włącz intro wideo</Label>
              <p className="text-sm text-muted-foreground">Globalny włącznik funkcji</p>
            </div>
            <Switch checked={s.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>

          <div className="space-y-2">
            <Label>Plik wideo</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && <span className="text-sm text-muted-foreground">Przesyłanie…</span>}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="…lub wklej URL pliku MP4"
                value={s.video_url ?? ''}
                onChange={(e) => update({ video_url: e.target.value || null })}
              />
              {s.video_url && (
                <Button variant="outline" size="icon" onClick={() => update({ video_url: null })} aria-label="Usuń URL">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            {s.video_url && (
              <div className="mt-3 rounded-md overflow-hidden border bg-black">
                <video src={s.video_url} controls className="w-full max-h-64" />
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <Label className="text-base">Momenty wyświetlania</Label>
              <p className="text-sm text-muted-foreground">Możesz zaznaczyć wiele momentów – intro pokaże się przy każdym z nich.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ALL_TRIGGER_MOMENTS.map((m) => (
                <label key={m} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/40 transition">
                  <Checkbox
                    checked={activeMoments.has(m)}
                    onCheckedChange={(v) => toggleMoment(m, !!v)}
                  />
                  <span className="text-sm">{TRIGGER_MOMENT_LABELS[m]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Częstotliwość wyświetlania</Label>
            <Select value={s.frequency} onValueChange={(v: any) => update({ frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Zawsze (każde otwarcie/odświeżenie)</SelectItem>
                <SelectItem value="once_per_session">Raz na sesję przeglądarki</SelectItem>
                <SelectItem value="once_per_day">Raz dziennie</SelectItem>
                <SelectItem value="once_per_week">Raz w tygodniu</SelectItem>
                <SelectItem value="once_per_user">Raz na użytkownika (na zawsze)</SelectItem>
                <SelectItem value="every_login">Przy każdym logowaniu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pokaż przycisk „Pomiń" po: <span className="font-mono">{s.skip_after_ms} ms</span></Label>
            </div>
            <Slider
              value={[s.skip_after_ms]}
              min={0}
              max={5000}
              step={100}
              onValueChange={([v]) => update({ skip_after_ms: v })}
              disabled={!s.allow_skip}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Pozwól pominąć intro</Label>
              <Switch checked={s.allow_skip} onCheckedChange={(v) => update({ allow_skip: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Domyślnie wyciszone (zalecane)</Label>
              <Switch checked={s.default_muted} onCheckedChange={(v) => update({ default_muted: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Pokazuj też niezalogowanym</Label>
              <Switch checked={s.show_on_anonymous} onCheckedChange={(v) => update({ show_on_anonymous: v })} />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!s.video_url}>
              <Eye className="w-4 h-4 mr-2" />
              Podgląd
            </Button>
            <Button onClick={save} disabled={saving}>
              <Upload className="w-4 h-4 mr-2" />
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <IntroVideoPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} settings={s} />
    </div>
  );
};

export default IntroVideoSettingsPanel;
