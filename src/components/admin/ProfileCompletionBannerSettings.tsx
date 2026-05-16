import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, AlertCircle, Globe2 } from 'lucide-react';
import { FIELD_LABELS } from '@/components/profile/ProfileFieldsBanner';

type BannerConfig = {
  id: string;
  enabled: boolean;
  title: string;
  message: string;
  button_label: string;
  required_fields: string[];
  target_path: string;
  severity: 'info' | 'warning' | 'destructive';
  dismissible: boolean;
};

const FIELD_KEYS = Object.keys(FIELD_LABELS);

export const ProfileCompletionBannerSettings: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<BannerConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['profile-fields-banner-config-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_completion_banner_config')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data as BannerConfig | null;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const toggleField = (key: string, checked: boolean) => {
    setForm((f) =>
      f
        ? {
            ...f,
            required_fields: checked
              ? Array.from(new Set([...(f.required_fields || []), key]))
              : (f.required_fields || []).filter((k) => k !== key),
          }
        : f,
    );
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase
      .from('profile_completion_banner_config')
      .update({
        enabled: form.enabled,
        title: form.title.trim(),
        message: form.message.trim(),
        button_label: form.button_label.trim(),
        required_fields: form.required_fields,
        target_path: form.target_path,
        severity: form.severity,
        dismissible: form.dismissible,
      })
      .eq('id', form.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Błąd zapisu', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Zapisano', description: 'Konfiguracja banera została zaktualizowana.' });
    qc.invalidateQueries({ queryKey: ['profile-fields-banner-config'] });
    qc.invalidateQueries({ queryKey: ['profile-fields-banner-config-admin'] });
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    const { data, error } = await supabase.functions.invoke('backfill-profile-countries', {
      body: {},
    });
    setBackfilling(false);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Uzupełnianie krajów zakończone',
      description: `Przeskanowano: ${data?.scanned ?? 0}, zgeokodowano nowych: ${data?.geocoded ?? 0}, zaktualizowano profili: ${data?.updated ?? 0}, bez lokalizacji: ${data?.missing ?? 0}`,
    });
    qc.invalidateQueries({ queryKey: ['user-statistics-profiles'] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Baner uzupełnienia danych użytkownika
          </CardTitle>
          <CardDescription>
            Wyświetla się na każdej stronie zalogowanym użytkownikom, którym brakuje wybranych pól profilu. Przycisk przekierowuje do /my-account z podświetlonymi na czerwono polami.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between border rounded-md px-4 py-3">
            <div>
              <div className="font-medium">Włącz baner</div>
              <div className="text-xs text-muted-foreground">
                Gdy wyłączony — baner nie pojawia się u nikogo.
              </div>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          </div>

          <div className="space-y-2">
            <Label>Wymagane pola</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {FIELD_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-accent"
                >
                  <Checkbox
                    checked={form.required_fields?.includes(key)}
                    onCheckedChange={(v) => toggleField(key, !!v)}
                  />
                  <span className="text-sm">{FIELD_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tytuł</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Etykieta przycisku</Label>
              <Input
                value={form.button_label}
                onChange={(e) => setForm({ ...form, button_label: e.target.value })}
                maxLength={60}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Treść</Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Strona docelowa</Label>
              <Select value={form.target_path} onValueChange={(v) => setForm({ ...form, target_path: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="/my-account">/my-account (Moje konto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Styl</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Informacyjny (niebieski)</SelectItem>
                  <SelectItem value="warning">Ostrzegawczy (pomarańczowy)</SelectItem>
                  <SelectItem value="destructive">Krytyczny (czerwony)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border rounded-md px-4 py-3">
              <div>
                <div className="font-medium text-sm">Można zamknąć</div>
                <div className="text-xs text-muted-foreground">Na czas sesji</div>
              </div>
              <Switch
                checked={form.dismissible}
                onCheckedChange={(v) => setForm({ ...form, dismissible: v })}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Zapisz konfigurację
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4 text-primary" /> Uzupełnij brakujące kraje w profilach
          </CardTitle>
          <CardDescription>
            Wyszukuje profile z miastem ale bez kraju i automatycznie uzupełnia kraj na podstawie geokodowania OpenStreetMap. Działa jednorazowo — bezpiecznie można uruchamiać wielokrotnie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleBackfill} disabled={backfilling} variant="secondary" className="gap-2">
            {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
            Uruchom uzupełnianie
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileCompletionBannerSettings;
