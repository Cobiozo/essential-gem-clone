import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Shield, Trash2, UserPlus, Plus, Search, Loader2, Check } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface ProfileLite {
  user_id: string; // auth user id — KLUCZ używany w user_roles i moderator_permissions
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
}

interface ModeratorRow {
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  eq_id?: string | null;
  modules: Record<string, any>;
  granted_at: string;
}

const fullNameOf = (p: { first_name?: string | null; last_name?: string | null }) =>
  [p.first_name, p.last_name].filter(Boolean).join(' ').trim();

// Główne moduły (zakładki admina) + ich podakcje.
// Klucz główny `module` = pełen dostęp (CRUD + publikacja).
// Klucze `module:create|edit|delete|publish|visibility|categories|templates` =
// granularne akcje. Specjalny klucz `module:ids` (tablica string[]) ogranicza
// dostęp do konkretnych ID treści.
interface ModuleDef {
  key: string;
  label: string;
  group: string;
  actions?: string[]; // dostępne pod-akcje (jeśli puste = tylko on/off)
  supportsIds?: boolean;
}

const MODULES: ModuleDef[] = [
  // ===== Strona i wygląd =====
  { key: 'content', label: 'Treść główna', group: 'Strona i wygląd', actions: ['edit'] },
  { key: 'layout', label: 'Układ / Layout', group: 'Strona i wygląd', actions: ['edit'] },
  { key: 'pages', label: 'Strony CMS', group: 'Strona i wygląd', actions: ['create', 'edit', 'delete', 'publish'], supportsIds: true },
  { key: 'html-pages', label: 'Strony HTML', group: 'Strona i wygląd', actions: ['create', 'edit', 'delete'], supportsIds: true },
  { key: 'colors', label: 'Kolory i motywy', group: 'Strona i wygląd', actions: ['edit'] },
  { key: 'settings', label: 'Ustawienia strony', group: 'Strona i wygląd', actions: ['edit'] },
  { key: 'dashboard-footer', label: 'Stopka dashboardu', group: 'Strona i wygląd', actions: ['edit'] },
  { key: 'sidebar-icons', label: 'Ikony paska bocznego', group: 'Strona i wygląd', actions: ['edit'] },

  // ===== Użytkownicy ===== (moduł `moderators` celowo pominięty — tylko admin)
  { key: 'users', label: 'Zarządzanie użytkownikami', group: 'Użytkownicy', actions: ['view', 'edit', 'export'] },
  { key: 'user-stats', label: 'Statystyki użytkowników', group: 'Użytkownicy', actions: ['view', 'export'] },
  { key: 'account', label: 'Konto / profil', group: 'Użytkownicy', actions: ['view', 'edit'] },
  { key: 'leader-panel-management', label: 'Panel Lidera', group: 'Użytkownicy', actions: ['view', 'edit'] },
  { key: 'platform-teams', label: 'Zespoły platformy', group: 'Użytkownicy', actions: ['create', 'edit', 'delete'] },

  // ===== Szkolenia i wiedza =====
  { key: 'training', label: 'Szkolenia / Akademia', group: 'Szkolenia i wiedza', actions: ['create', 'edit', 'delete', 'publish'], supportsIds: true },
  { key: 'certificates', label: 'Certyfikaty', group: 'Szkolenia i wiedza', actions: ['view', 'edit', 'delete'] },
  { key: 'knowledge', label: 'Centrum Wiedzy / Biblioteka', group: 'Szkolenia i wiedza', actions: ['create', 'edit', 'delete', 'publish'], supportsIds: true },
  { key: 'healthy-knowledge', label: 'Baza wiedzy (Zdrowa wiedza)', group: 'Szkolenia i wiedza', actions: ['create', 'edit', 'delete', 'publish'], supportsIds: true },
  { key: 'media-library', label: 'Biblioteka mediów', group: 'Szkolenia i wiedza', actions: ['upload', 'delete'] },

  // ===== Wydarzenia i narzędzia =====
  { key: 'events', label: 'Wydarzenia (eventy)', group: 'Wydarzenia i narzędzia', actions: ['create', 'edit', 'delete', 'publish'], supportsIds: true },
  { key: 'event-registrations', label: 'Rejestracje na wydarzenia', group: 'Wydarzenia i narzędzia', actions: ['view', 'edit', 'delete', 'export'] },
  { key: 'paid-events', label: 'Płatne wydarzenia / bilety', group: 'Wydarzenia i narzędzia', actions: ['create', 'edit', 'delete', 'publish'], supportsIds: true },
  { key: 'meeting-guests', label: 'Goście spotkań', group: 'Wydarzenia i narzędzia', actions: ['view', 'edit'] },
  { key: 'daily-signal', label: 'Sygnał dnia', group: 'Wydarzenia i narzędzia', actions: ['edit'] },
  { key: 'important-info', label: 'Ważne informacje', group: 'Wydarzenia i narzędzia', actions: ['create', 'edit', 'delete'] },
  { key: 'news-ticker', label: 'Pasek informacyjny', group: 'Wydarzenia i narzędzia', actions: ['edit'] },
  { key: 'calculator', label: 'Kalkulator Influencerów', group: 'Wydarzenia i narzędzia', actions: ['edit'] },
  { key: 'specialist-calculator', label: 'Kalkulator Specjalistów', group: 'Wydarzenia i narzędzia', actions: ['edit'] },
  { key: 'partner-pages', label: 'Strony partnerskie', group: 'Wydarzenia i narzędzia', actions: ['create', 'edit', 'delete'], supportsIds: true },
  { key: 'organization-tree', label: 'Struktura organizacji', group: 'Wydarzenia i narzędzia', actions: ['view', 'edit'] },
  { key: 'purebox', label: 'PureBox', group: 'Wydarzenia i narzędzia', actions: ['view', 'edit'] },

  // ===== Treści dodatkowe (poza sidebarem admin) =====
  { key: 'news_hub', label: 'Centrum Aktualności', group: 'Treści dodatkowe', actions: ['create', 'edit', 'delete', 'publish'], supportsIds: true },

  // ===== Komunikacja =====
  { key: 'translations', label: 'Tłumaczenia', group: 'Komunikacja', actions: ['edit'] },
  { key: 'team-contacts', label: 'Kontakty zespołu', group: 'Komunikacja', actions: ['view', 'edit'] },
  { key: 'chat-permissions', label: 'Zarządzanie czatem', group: 'Komunikacja', actions: ['edit'] },
  { key: 'notifications', label: 'Powiadomienia systemowe', group: 'Komunikacja', actions: ['send', 'edit'] },
  { key: 'push-notifications', label: 'Powiadomienia Push', group: 'Komunikacja', actions: ['send', 'edit'] },
  { key: 'emails', label: 'Szablony e-mail', group: 'Komunikacja', actions: ['edit', 'send'] },
  { key: 'email-delivery', label: 'Dostarczalność e-mail', group: 'Komunikacja', actions: ['view', 'export'] },
  { key: 'support', label: 'Wsparcie / Support', group: 'Komunikacja', actions: ['view', 'reply'] },
  { key: 'cookies', label: 'Cookies / Zgody', group: 'Komunikacja', actions: ['edit'] },

  // ===== System =====
  { key: 'system-health', label: 'Alerty systemowe', group: 'System', actions: ['view'] },
  { key: 'activity-log', label: 'Dziennik działań', group: 'System', actions: ['view', 'export'] },
  { key: 'maintenance', label: 'Tryb konserwacji', group: 'System', actions: ['edit'] },
  { key: 'cron-jobs', label: 'Zadania CRON', group: 'System', actions: ['view', 'edit'] },
  { key: 'google-calendar', label: 'Google Calendar', group: 'System', actions: ['view', 'edit'] },
  { key: 'ai-compass', label: 'AI Kompas', group: 'System', actions: ['edit'] },
  { key: 'ai-provider', label: 'Dostawca AI', group: 'System', actions: ['edit'] },
  { key: 'data-cleanup', label: 'Czyszczenie danych', group: 'System', actions: ['view'] },
  { key: 'security', label: 'Bezpieczeństwo', group: 'System', actions: ['view'] },
  { key: 'api-integrations', label: 'API / Integracje', group: 'System', actions: ['view'] },
  { key: 'mobile-bottom-nav', label: 'Mobilny pasek nawigacji', group: 'System', actions: ['edit'] },
  { key: 'intro-video', label: 'Intro wideo', group: 'System', actions: ['edit'] },
];

const ACTION_LABELS: Record<string, string> = {
  create: 'Tworzenie',
  edit: 'Edycja',
  delete: 'Usuwanie',
  publish: 'Publikacja',
  view: 'Podgląd',
  upload: 'Wgrywanie',
  reply: 'Odpowiadanie',
  send: 'Wysyłanie',
  visibility: 'Widoczność',
  categories: 'Kategorie',
  templates: 'Szablony',
  export: 'Eksport',
  manage: 'Zarządzanie',
};

export const ModeratorsManagement: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<ModeratorRow[]>([]);
  const [loading, setLoading] = useState(true);

  // search
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [searchResults, setSearchResults] = useState<ProfileLite[]>([]);
  const [searching, setSearching] = useState(false);

  // custom key per row
  const [customKey, setCustomKey] = useState<Record<string, string>>({});
  // ids text per row+module
  const [idsText, setIdsText] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: roles } = await supabase
        .from('user_roles').select('user_id').eq('role', 'moderator' as any);

      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) { setRows([]); setLoading(false); return; }

      const [{ data: perms }, { data: profiles }] = await Promise.all([
        supabase.from('moderator_permissions').select('user_id, modules, granted_at').in('user_id', ids),
        // WAŻNE: w profiles auth user id jest w kolumnie `user_id`, nie `id`
        supabase.from('profiles').select('user_id, first_name, last_name, email, eq_id').in('user_id', ids),
      ]);

      const permMap = new Map((perms || []).map((p: any) => [p.user_id, p]));
      const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const list: ModeratorRow[] = ids.map((id) => {
        const p = permMap.get(id) as any;
        const pr = profMap.get(id) as any;
        return {
          user_id: id,
          email: pr?.email || null,
          full_name: pr ? (fullNameOf(pr) || null) : null,
          eq_id: pr?.eq_id || null,
          modules: (p?.modules || {}) as Record<string, any>,
          granted_at: p?.granted_at || new Date().toISOString(),
        };
      });
      setRows(list);
    } catch (err: any) {
      console.error(err);
      toast.error('Nie udało się pobrać listy moderatorów');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Live search — szuka po first_name, last_name, email i eq_id.
  // Dodatkowo obsługujemy wpisanie "Imię Nazwisko" (rozbijając na słowa).
  useEffect(() => {
    const q = debouncedSearch.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    let cancelled = false;
    (async () => {
      setSearching(true);
      const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
      const orParts: string[] = [];
      const like = `%${q}%`;
      orParts.push(`first_name.ilike.${like}`);
      orParts.push(`last_name.ilike.${like}`);
      orParts.push(`email.ilike.${like}`);
      orParts.push(`eq_id.ilike.${like}`);
      // Imię + nazwisko (lub odwrotnie)
      if (tokens.length >= 2) {
        const [a, b] = tokens;
        orParts.push(`and(first_name.ilike.%${a}%,last_name.ilike.%${b}%)`);
        orParts.push(`and(first_name.ilike.%${b}%,last_name.ilike.%${a}%)`);
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id')
        .or(orParts.join(','))
        .limit(20);
      if (cancelled) return;
      if (error) {
        console.error('[ModeratorsManagement] search error:', error);
        toast.error('Błąd wyszukiwania: ' + error.message);
        setSearchResults([]);
      } else {
        const existingIds = new Set(rows.map((r) => r.user_id));
        setSearchResults(((data as any[]) || []).filter((p) => p.user_id && !existingIds.has(p.user_id)));
      }
      setSearching(false);
    })();
    return () => { cancelled = true; };
  }, [debouncedSearch, rows]);

  const callEdge = async (action: 'add' | 'update_modules' | 'remove', payload: any) => {
    const { data, error } = await supabase.functions.invoke('admin-set-moderator', {
      body: { action, ...payload },
    });
    if (error) {
      // Funkcja invoke często zwraca generyczny "Failed to send a request to the Edge Function"
      // — spróbuj wyciągnąć szczegół z odpowiedzi HTTP.
      let detail = error.message || 'Błąd wywołania funkcji';
      try {
        const ctx: any = (error as any)?.context;
        if (ctx?.json) {
          const body = await ctx.json();
          if (body?.error) detail = body.error;
          if (body?.code === 'expired') detail = 'Sesja wygasła. Zaloguj się ponownie i spróbuj zapisać uprawnienia.';
        } else if (ctx?.text) {
          const txt = await ctx.text();
          if (txt) detail = txt;
        }
      } catch { /* ignore */ }
      if (/invalid token/i.test(detail)) {
        detail = 'Nie udało się zweryfikować sesji administratora. Odśwież stronę lub zaloguj się ponownie.';
      }
      throw new Error(detail);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };


  const addModerator = async (profile: ProfileLite) => {
    try {
      await callEdge('add', { user_id: profile.user_id, modules: {} });
      const label = fullNameOf(profile) || profile.email || profile.eq_id || 'użytkownik';
      toast.success(`Dodano moderatora: ${label}`);
      setSearchTerm('');
      setSearchResults([]);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Błąd dodawania moderatora');
    }
  };

  const updateModules = async (userId: string, modules: Record<string, any>) => {
    // Normalize: remove keys with `false` / empty arrays so JSON stays clean.
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(modules)) {
      if (v === true) cleaned[k] = true;
      else if (Array.isArray(v) && v.length > 0) cleaned[k] = v;
    }
    // optimistic
    setRows((r) => r.map((x) => x.user_id === userId ? { ...x, modules: cleaned } : x));
    try {
      await callEdge('update_modules', { user_id: userId, modules: cleaned });
      toast.success('Zapisano uprawnienia');
    } catch (err: any) {
      toast.error(err.message || 'Błąd zapisu uprawnień');
      fetchData();
    }
  };

  const removeModerator = async (userId: string) => {
    if (!confirm('Na pewno odebrać uprawnienia moderatora?')) return;
    try {
      await callEdge('remove', { user_id: userId });
      toast.success('Usunięto moderatora');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Błąd usuwania');
    }
  };

  const grouped = useMemo(() => {
    return MODULES.reduce((acc, m) => {
      (acc[m.group] = acc[m.group] || []).push(m);
      return acc;
    }, {} as Record<string, ModuleDef[]>);
  }, []);

  if (!isAdmin) {
    return <div className="p-6 text-muted-foreground">Brak dostępu – tylko administrator.</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Moderatorzy panelu CMS</h2>
      </div>
      <p className="text-sm text-muted-foreground max-w-3xl">
        Moderator otrzymuje przycisk „Panel CMS" w menu i przed wejściem musi podać to samo hasło,
        co administrator. Widzi tylko te moduły (lub konkretne akcje / treści), które mu jawnie włączysz.
        Akcje krytyczne (zarządzanie kontami, role, klucze API, kasowanie danych) pozostają zawsze tylko dla administratora.
      </p>

      {/* SEARCH */}
      <Card className="p-4 space-y-3">
        <Label className="font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Wyszukaj użytkownika (imię, nazwisko, EQ ID lub e-mail)
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Wpisz min. 2 znaki..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {searching && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Szukam...
          </div>
        )}
        {!searching && debouncedSearch.length >= 2 && searchResults.length === 0 && (
          <div className="text-xs text-muted-foreground">Brak wyników lub wszyscy znalezieni są już moderatorami.</div>
        )}
        {searchResults.length > 0 && (
          <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto">
            {searchResults.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between p-3 hover:bg-muted/40">
                <div className="min-w-0">
                  <div className="font-medium truncate">{fullNameOf(p) || '(bez imienia)'}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.email} {p.eq_id ? ` · EQ ID: ${p.eq_id}` : ''}
                  </div>
                </div>
                <Button size="sm" onClick={() => addModerator(p)} className="gap-1 shrink-0">
                  <Check className="h-3 w-3" /> Ustaw moderatorem
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Ładowanie...</div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Brak moderatorów. Wyszukaj użytkownika powyżej i nadaj rolę.
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <Card key={r.user_id} className="p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <div className="font-semibold">{r.full_name || '(bez imienia)'}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {r.email || r.user_id} {r.eq_id ? `· EQ ID: ${r.eq_id}` : ''}
                  </div>
                  <Badge variant="secondary" className="mt-1">Moderator</Badge>
                </div>
                <Button variant="destructive" size="sm" onClick={() => removeModerator(r.user_id)} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Usuń moderatora
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(grouped).map(([group, items]) => (
                  <div key={group} className="border border-border rounded-lg p-3 space-y-3">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{group}</div>
                    {items.map((m) => {
                      const enabled = r.modules[m.key] === true;
                      const idsKey = `${m.key}:ids`;
                      const currentIds: string[] = Array.isArray(r.modules[idsKey]) ? r.modules[idsKey] : [];
                      const idsTextValue = idsText[`${r.user_id}-${m.key}`] ?? currentIds.join('\n');

                      return (
                        <div key={m.key} className="border-l-2 border-border pl-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-sm font-medium cursor-pointer">
                              {m.label}
                            </Label>
                            <Switch
                              checked={enabled}
                              onCheckedChange={(v) => updateModules(r.user_id, { ...r.modules, [m.key]: v })}
                            />
                          </div>

                          {/* Pod-akcje (widoczne nawet bez ogólnego dostępu) */}
                          {m.actions && m.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {m.actions.map((a) => {
                                const subKey = `${m.key}:${a}`;
                                const subEnabled = r.modules[subKey] === true;
                                return (
                                  <label key={subKey} className={`flex items-center gap-1 text-xs px-2 py-1 rounded border cursor-pointer ${subEnabled || enabled ? 'border-primary/60 bg-primary/10' : 'border-border'}`}>
                                    <input
                                      type="checkbox"
                                      checked={subEnabled}
                                      disabled={enabled}
                                      onChange={(e) => updateModules(r.user_id, { ...r.modules, [subKey]: e.target.checked })}
                                      className="h-3 w-3"
                                    />
                                    {ACTION_LABELS[a] || a}
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Whitelist konkretnych ID */}
                          {m.supportsIds && (enabled || (m.actions || []).some((a) => r.modules[`${m.key}:${a}`])) && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                Konkretne treści (ID-y, po jednym w linii). Puste = wszystkie.
                              </Label>
                              <Textarea
                                placeholder="np. 0a1b2c3d-..."
                                value={idsTextValue}
                                onChange={(e) => setIdsText({ ...idsText, [`${r.user_id}-${m.key}`]: e.target.value })}
                                onBlur={() => {
                                  const list = (idsText[`${r.user_id}-${m.key}`] ?? '')
                                    .split('\n').map((s) => s.trim()).filter(Boolean);
                                  const next = { ...r.modules };
                                  if (list.length === 0) delete next[idsKey];
                                  else next[idsKey] = list;
                                  updateModules(r.user_id, next);
                                }}
                                className="text-xs font-mono"
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Custom modules */}
              <div className="border border-dashed border-border rounded-lg p-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Dodatkowe moduły (klucz własny)</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Object.entries(r.modules)
                    .filter(([k, v]) => !MODULES.some((p) => k === p.key || k.startsWith(`${p.key}:`)) && typeof v === 'boolean')
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 bg-muted px-2 py-1 rounded">
                        <span className="text-xs font-mono">{k}</span>
                        <Switch
                          checked={!!v}
                          onCheckedChange={(nv) => updateModules(r.user_id, { ...r.modules, [k]: nv })}
                        />
                        <button
                          className="text-xs text-destructive"
                          onClick={() => {
                            const next = { ...r.modules };
                            delete next[k];
                            updateModules(r.user_id, next);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="np. custom-module-key"
                    value={customKey[r.user_id] || ''}
                    onChange={(e) => setCustomKey({ ...customKey, [r.user_id]: e.target.value })}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const k = (customKey[r.user_id] || '').trim();
                      if (!k) return;
                      updateModules(r.user_id, { ...r.modules, [k]: true });
                      setCustomKey({ ...customKey, [r.user_id]: '' });
                    }}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" /> Dodaj
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
