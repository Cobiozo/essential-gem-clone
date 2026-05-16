import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Eye, Loader2, Save, Globe2, AlertCircle, Info, Bell, Sparkles, Gift, Calendar, BookOpen, ExternalLink, AlertTriangle, CheckCircle, Megaphone, Star, Heart, Rocket, Flame, Zap, Award, Crown, Mail, MessageSquare, ShoppingCart, Settings, Users, Lock, Unlock } from 'lucide-react';
import { AppBanner, FIELD_LABELS, BannerCard } from '@/components/banners/AppBanners';

const ICON_CHOICES = ['Info','AlertCircle','AlertTriangle','Bell','Sparkles','Gift','Calendar','BookOpen','ExternalLink','CheckCircle','Megaphone','Star','Heart','Rocket','Flame','Zap','Award','Crown','Mail','MessageSquare','ShoppingCart','Settings','Users','Lock','Unlock'];
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = { Info, AlertCircle, AlertTriangle, Bell, Sparkles, Gift, Calendar, BookOpen, ExternalLink, CheckCircle, Megaphone, Star, Heart, Rocket, Flame, Zap, Award, Crown, Mail, MessageSquare, ShoppingCart, Settings, Users, Lock, Unlock };

const ROLES = ['admin','partner','specjalista','klient','lider'];
const PROFILE_FIELDS = Object.keys(FIELD_LABELS);

const emptyBanner = (): Partial<AppBanner> => ({
  enabled: true,
  priority: 50,
  title: 'Nowy baner',
  message: 'Treść komunikatu...',
  button_label: 'Przejdź',
  severity: 'info',
  dismissible: true,
  style_variant: 'soft',
  accent_color: null,
  icon_name: 'Info',
  target_url: '/dashboard',
  open_in_new_tab: false,
  audience_type: 'all',
  required_fields: [],
  target_roles: [],
  target_user_ids: [],
  starts_at: null,
  ends_at: null,
  hide_on_paths: ['/auth','/reset-password','/change-password','/install'],
});

function validateTargetUrl(url: string): string | null {
  if (!url) return 'Adres docelowy jest wymagany';
  if (url.startsWith('/')) return null;
  if (/^https?:\/\//i.test(url)) return null;
  return 'Musi być ścieżką wewnętrzną (np. /dashboard) lub pełnym URL (https://...)';
}

const BannerEditor: React.FC<{ banner: Partial<AppBanner>; onChange: (b: Partial<AppBanner>) => void }> = ({ banner, onChange }) => {
  const set = <K extends keyof AppBanner>(k: K, v: AppBanner[K]) => onChange({ ...banner, [k]: v });
  const Icon = ICON_MAP[banner.icon_name || 'Info'] || Info;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tytuł</Label>
            <Input value={banner.title || ''} onChange={(e) => set('title', e.target.value)} maxLength={140} />
          </div>
          <div className="space-y-1.5">
            <Label>Etykieta przycisku</Label>
            <Input value={banner.button_label || ''} onChange={(e) => set('button_label', e.target.value)} maxLength={60} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Treść</Label>
          <Textarea rows={4} value={banner.message || ''} onChange={(e) => set('message', e.target.value)} maxLength={1000} />
        </div>

        <div className="space-y-1.5">
          <Label>Adres docelowy</Label>
          <Input
            value={banner.target_url || ''}
            onChange={(e) => set('target_url', e.target.value)}
            placeholder="/dashboard albo https://..."
          />
          <p className="text-xs text-muted-foreground">Ścieżka wewnętrzna (np. <code>/leader-panel</code>) lub pełny URL zewnętrzny.</p>
          {validateTargetUrl(banner.target_url || '') && (
            <p className="text-xs text-destructive">{validateTargetUrl(banner.target_url || '')}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Styl</Label>
            <Select value={banner.severity} onValueChange={(v) => set('severity', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informacja</SelectItem>
                <SelectItem value="warning">Ostrzeżenie</SelectItem>
                <SelectItem value="destructive">Krytyczny</SelectItem>
                <SelectItem value="success">Sukces</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Wariant</Label>
            <Select value={banner.style_variant} onValueChange={(v) => set('style_variant', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="soft">Miękki</SelectItem>
                <SelectItem value="solid">Pełny</SelectItem>
                <SelectItem value="outline">Kontur</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priorytet</Label>
            <Input type="number" value={banner.priority ?? 0} onChange={(e) => set('priority', parseInt(e.target.value) || 0)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Ikona</Label>
          <div className="grid grid-cols-8 gap-1 max-h-32 overflow-auto border rounded-md p-2">
            {ICON_CHOICES.map((name) => {
              const I = ICON_MAP[name];
              const selected = banner.icon_name === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => set('icon_name', name)}
                  className={`p-2 rounded hover:bg-accent flex items-center justify-center ${selected ? 'bg-primary/15 ring-1 ring-primary' : ''}`}
                  title={name}
                >
                  <I className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 items-center">
          <div className="flex items-center justify-between border rounded-md px-3 py-2">
            <Label className="text-xs">Włączony</Label>
            <Switch checked={!!banner.enabled} onCheckedChange={(v) => set('enabled', v)} />
          </div>
          <div className="flex items-center justify-between border rounded-md px-3 py-2">
            <Label className="text-xs">Zamykalny</Label>
            <Switch checked={!!banner.dismissible} onCheckedChange={(v) => set('dismissible', v)} />
          </div>
          <div className="flex items-center justify-between border rounded-md px-3 py-2">
            <Label className="text-xs">Nowa karta</Label>
            <Switch checked={!!banner.open_in_new_tab} onCheckedChange={(v) => set('open_in_new_tab', v)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Kolor akcentu (opcjonalny)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={banner.accent_color || '#3b82f6'}
              onChange={(e) => set('accent_color', e.target.value)}
              className="w-16 h-9 p-1"
            />
            <Button variant="ghost" size="sm" onClick={() => set('accent_color', null)}>Wyczyść</Button>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <Label>Widoczność dla</Label>
          <Select value={banner.audience_type} onValueChange={(v) => set('audience_type', v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy zalogowani</SelectItem>
              <SelectItem value="missing_profile_fields">Użytkownicy z brakującymi polami profilu</SelectItem>
              <SelectItem value="role">Wybrane role</SelectItem>
              <SelectItem value="specific_users">Konkretni użytkownicy (ID)</SelectItem>
            </SelectContent>
          </Select>

          {banner.audience_type === 'missing_profile_fields' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {PROFILE_FIELDS.map((key) => (
                <label key={key} className="flex items-center gap-2 border rounded px-2 py-1.5 cursor-pointer hover:bg-accent text-sm">
                  <Checkbox
                    checked={(banner.required_fields || []).includes(key)}
                    onCheckedChange={(checked) => {
                      const cur = banner.required_fields || [];
                      set('required_fields', checked ? [...cur, key] : cur.filter((k) => k !== key));
                    }}
                  />
                  {FIELD_LABELS[key]}
                </label>
              ))}
            </div>
          )}

          {banner.audience_type === 'role' && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 border rounded px-2 py-1.5 cursor-pointer hover:bg-accent text-sm capitalize">
                  <Checkbox
                    checked={(banner.target_roles || []).includes(r)}
                    onCheckedChange={(checked) => {
                      const cur = banner.target_roles || [];
                      set('target_roles', checked ? [...cur, r] : cur.filter((k) => k !== r));
                    }}
                  />
                  {r}
                </label>
              ))}
            </div>
          )}

          {banner.audience_type === 'specific_users' && (
            <div className="space-y-1 mt-2">
              <Label className="text-xs">Lista UUID użytkowników (po przecinku)</Label>
              <Textarea
                rows={2}
                value={(banner.target_user_ids || []).join(', ')}
                onChange={(e) => set('target_user_ids', e.target.value.split(/[,\s]+/).map(s => s.trim()).filter(Boolean))}
                placeholder="uuid1, uuid2, ..."
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-xs">Aktywny od (opcjonalnie)</Label>
            <Input type="datetime-local" value={banner.starts_at ? banner.starts_at.slice(0,16) : ''} onChange={(e) => set('starts_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Aktywny do (opcjonalnie)</Label>
            <Input type="datetime-local" value={banner.ends_at ? banner.ends_at.slice(0,16) : ''} onChange={(e) => set('ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Ukryj na ścieżkach (po przecinku)</Label>
          <Input
            value={(banner.hide_on_paths || []).join(', ')}
            onChange={(e) => set('hide_on_paths', e.target.value.split(/[,\s]+/).map(s => s.trim()).filter(Boolean))}
            placeholder="/auth, /install"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Eye className="h-4 w-4" /> Podgląd</Label>
        <div className="border rounded-md p-3 bg-background sticky top-2">
          <BannerCard banner={banner as AppBanner} missing={banner.audience_type === 'missing_profile_fields' ? (banner.required_fields || []) : []} />
        </div>
        <p className="text-xs text-muted-foreground">Podgląd jest poglądowy — w realnym widoku „Brakuje:" pokazuje rzeczywiste braki użytkownika.</p>
      </div>
    </div>
  );
};

export const AppBannersManager: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Partial<AppBanner> | null>(null);
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const { data: banners, isLoading } = useQuery({
    queryKey: ['admin-app-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_banners')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return (data as unknown as AppBanner[]) || [];
    },
  });

  const handleSave = async () => {
    if (!editing) return;
    const err = validateTargetUrl(editing.target_url || '');
    if (err) {
      toast({ title: 'Błąd walidacji', description: err, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload: any = {
      enabled: editing.enabled,
      priority: editing.priority,
      title: editing.title?.trim() || '',
      message: editing.message?.trim() || '',
      button_label: editing.button_label?.trim() || '',
      severity: editing.severity,
      dismissible: editing.dismissible,
      style_variant: editing.style_variant,
      accent_color: editing.accent_color,
      icon_name: editing.icon_name,
      target_url: editing.target_url?.trim() || '/',
      open_in_new_tab: editing.open_in_new_tab,
      audience_type: editing.audience_type,
      required_fields: editing.required_fields || [],
      target_roles: editing.target_roles || [],
      target_user_ids: editing.target_user_ids || [],
      starts_at: editing.starts_at,
      ends_at: editing.ends_at,
      hide_on_paths: editing.hide_on_paths || [],
    };
    const result = editing.id
      ? await supabase.from('app_banners').update(payload).eq('id', editing.id)
      : await supabase.from('app_banners').insert(payload);
    setSaving(false);
    if (result.error) {
      toast({ title: 'Błąd zapisu', description: result.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Zapisano', description: 'Baner został zapisany.' });
    qc.invalidateQueries({ queryKey: ['admin-app-banners'] });
    qc.invalidateQueries({ queryKey: ['app-banners-list'] });
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć ten baner?')) return;
    const { error } = await supabase.from('app_banners').delete().eq('id', id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin-app-banners'] });
    qc.invalidateQueries({ queryKey: ['app-banners-list'] });
    toast({ title: 'Usunięto' });
  };

  const handleToggle = async (b: AppBanner) => {
    const { error } = await supabase.from('app_banners').update({ enabled: !b.enabled }).eq('id', b.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin-app-banners'] });
    qc.invalidateQueries({ queryKey: ['app-banners-list'] });
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    const { data, error } = await supabase.functions.invoke('backfill-profile-countries', { body: {} });
    setBackfilling(false);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Uzupełnianie krajów zakończone',
      description: `Przeskanowano: ${data?.scanned ?? 0}, zgeokodowano: ${data?.geocoded ?? 0}, zaktualizowano: ${data?.updated ?? 0}`,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" /> Banery aplikacji
            </CardTitle>
            <CardDescription>
              Zarządzaj komunikatami pojawiającymi się na górze pulpitu. Każdy baner może mieć dowolny cel (ścieżka wewnętrzna lub URL), audiencję, wygląd i okno czasowe.
            </CardDescription>
          </div>
          <Button onClick={() => setEditing(emptyBanner())} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Nowy baner
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !banners || banners.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Brak banerów. Kliknij „Nowy baner" aby dodać pierwszy.</div>
          ) : (
            <div className="space-y-2">
              {banners.map((b) => {
                const Icon = ICON_MAP[b.icon_name] || Info;
                const audienceLabel = b.audience_type === 'all' ? 'Wszyscy'
                  : b.audience_type === 'missing_profile_fields' ? `Brakujące pola (${(b.required_fields||[]).length})`
                  : b.audience_type === 'role' ? `Role: ${(b.target_roles||[]).join(', ') || '—'}`
                  : `Użytkownicy (${(b.target_user_ids||[]).length})`;
                return (
                  <div key={b.id} className="border rounded-md p-3 flex flex-wrap md:flex-nowrap items-start md:items-center gap-3 hover:bg-accent/40 min-w-0">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 md:mt-0" />
                    <div className="flex-1 min-w-0 w-full md:w-auto">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-medium truncate max-w-full">{b.title || '(bez tytułu)'}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{b.severity}</Badge>
                        <Badge variant="secondary" className="text-xs shrink-0">{audienceLabel}</Badge>
                        <Badge variant="outline" className="text-xs font-mono truncate max-w-[200px] shrink-0">{b.target_url}</Badge>
                        <span className="text-xs text-muted-foreground shrink-0">priorytet: {b.priority}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{b.message}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      <Switch checked={b.enabled} onCheckedChange={() => handleToggle(b)} />
                      <Button size="icon" variant="ghost" onClick={() => setEditing(b)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4 text-primary" /> Uzupełnij brakujące kraje w profilach
          </CardTitle>
          <CardDescription>Wyszukuje profile z miastem ale bez kraju i automatycznie uzupełnia kraj na podstawie geokodowania OpenStreetMap.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleBackfill} disabled={backfilling} variant="secondary" className="gap-2">
            {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
            Uruchom uzupełnianie
          </Button>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edycja banera' : 'Nowy baner'}</DialogTitle>
          </DialogHeader>
          {editing && <BannerEditor banner={editing} onChange={setEditing} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppBannersManager;
