import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Copy, Loader2, Plus, Trash2, RefreshCw, ExternalLink, Eye } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

// Available toggleable elements (whitelist of UI bits a guest may see)
const SCHEMA: { scope: string; label: string; items: { key: string; label: string }[] }[] = [
  {
    scope: 'sidebar', label: 'Pasek boczny',
    items: [
      { key: 'dashboard', label: 'Pulpit główny' },
      { key: 'support', label: 'Wsparcie' },
      { key: 'paidEvents', label: 'Eventy (lista wydarzeń)' },
      { key: 'news', label: 'Aktualności (News Hub)' },
      { key: 'knowledge', label: 'Baza wiedzy publiczna' },
    ],
  },
  {
    scope: 'topbar', label: 'Pasek górny (ikony)',
    items: [
      { key: 'sound', label: 'Wycisz/Włącz dźwięki' },
      { key: 'notifications', label: 'Dzwonek powiadomień' },
      { key: 'language', label: 'Wybór języka' },
      { key: 'theme', label: 'Wybór motywu' },
      { key: 'tutorial', label: 'Samouczek' },
      { key: 'chat', label: 'Czat (ZABLOKOWANE)' },
      { key: 'calendar', label: 'Kalendarz (ZABLOKOWANE)' },
      { key: 'switchClassic', label: 'Tryb klasyczny (ZABLOKOWANE)' },
    ],
  },
  {
    scope: 'avatarMenu', label: 'Menu pod avatarem',
    items: [
      { key: 'home', label: 'Strona główna' },
      { key: 'myAccount', label: 'Moje konto' },
      { key: 'settings', label: 'Ustawienia' },
      { key: 'apiSync', label: 'Synchronizacja API (ZABLOKOWANE)' },
      { key: 'toolPanel', label: 'Panel narzędziowy (ZABLOKOWANE)' },
      { key: 'logout', label: 'Wyloguj' },
    ],
  },
  {
    scope: 'widgets', label: 'Widgety pulpitu',
    items: [
      { key: 'calendar', label: 'Kalendarz wydarzeń' },
      { key: 'calendarLegend', label: '↳ Legenda kolorów pod kalendarzem' },
      { key: 'newsBanner', label: 'Baner aktualności' },
      { key: 'infoBanners', label: 'Banery informacyjne' },
      { key: 'map', label: 'Mapa' },
      { key: 'newsTicker', label: 'Pasek wiadomości (ticker)' },
      { key: 'introVideo', label: 'Wideo powitalne' },
      { key: 'footer', label: 'Sekcja stopki pulpitu (cała)' },
      { key: 'footerQuote', label: '↳ Cytat / misja' },
      { key: 'footerMap', label: '↳ Mapa świata społeczności' },
      { key: 'footerTeam', label: '↳ Zespół Pure Life' },
      { key: 'footerContact', label: '↳ Kontakt' },
      { key: 'footerBottom', label: '↳ Pasek dolny (logo + linki)' },
      { key: 'pwaInstall', label: '↳ Przycisk „Zainstaluj aplikację"' },
    ],
  },
];

// Locked keys — even if admin clicks them, gość never gets them (UI shows them as disabled)
const LOCKED: Record<string, string[]> = {
  topbar: ['chat', 'calendar', 'switchClassic'],
  avatarMenu: ['apiSync', 'toolPanel'],
};

interface InviteLink {
  id: string;
  token: string;
  label: string | null;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
}

interface GuestRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

const guestRegisterUrl = (token: string) => `${window.location.origin}/zaproszenie/${token}`;

const VisibilityEditor: React.FC<{
  value: any;
  onChange: (v: any) => void;
  allowInherit?: boolean;
}> = ({ value, onChange, allowInherit }) => {
  const v = value || {};
  const setScope = (scope: string, key: string, val: boolean | undefined) => {
    const next = JSON.parse(JSON.stringify(v));
    if (scope === 'sidebar') {
      next.sidebar = next.sidebar || { items: {} };
      next.sidebar.items = next.sidebar.items || {};
      if (val === undefined) delete next.sidebar.items[key];
      else next.sidebar.items[key] = val;
    } else {
      next[scope] = next[scope] || {};
      if (val === undefined) delete next[scope][key];
      else next[scope][key] = val;
    }
    onChange(next);
  };
  const getVal = (scope: string, key: string): boolean | undefined => {
    if (scope === 'sidebar') return v.sidebar?.items?.[key];
    return v[scope]?.[key];
  };

  return (
    <div className="space-y-5">
      {SCHEMA.map((s) => (
        <div key={s.scope}>
          <div className="text-sm font-semibold mb-2">{s.label}</div>
          <div className="space-y-2">
            {s.items.map((it) => {
              const locked = LOCKED[s.scope]?.includes(it.key);
              const cur = getVal(s.scope, it.key);
              return (
                <div key={it.key} className="flex items-center justify-between gap-3 py-1">
                  <Label className={`text-sm font-normal ${locked ? 'text-muted-foreground' : ''}`}>
                    {it.label}
                  </Label>
                  <div className="flex items-center gap-2">
                    {allowInherit && (
                      <Button
                        type="button"
                        variant={cur === undefined ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setScope(s.scope, it.key, undefined)}
                      >
                        Dziedzicz
                      </Button>
                    )}
                    <Switch
                      checked={Boolean(cur)}
                      disabled={locked}
                      onCheckedChange={(c) => setScope(s.scope, it.key, c)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <PaidEventsToggles value={value} onChange={onChange} allowInherit={allowInherit} />
    </div>
  );
};

const PaidEventsToggles: React.FC<{
  value: any;
  onChange: (v: any) => void;
  allowInherit?: boolean;
}> = ({ value, onChange, allowInherit }) => {
  const [events, setEvents] = useState<{ id: string; title: string; event_date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('paid_events')
        .select('id, title, event_date')
        .eq('is_active', true)
        .order('event_date', { ascending: false });
      setEvents(data || []);
      setLoading(false);
    })();
  }, []);
  const items = value?.events?.items || {};
  const setOne = (id: string, val: boolean | undefined) => {
    const next = JSON.parse(JSON.stringify(value || {}));
    next.events = next.events || { items: {} };
    next.events.items = next.events.items || {};
    if (val === undefined) delete next.events.items[id];
    else next.events.items[id] = val;
    onChange(next);
  };
  return (
    <div>
      <div className="text-sm font-semibold mb-2">Eventy (whitelist wydarzeń)</div>
      <p className="text-xs text-muted-foreground mb-2">
        Gość zobaczy w „Eventy" tylko zaznaczone tu wydarzenia. Każde wydarzenie należy włączyć osobno.
      </p>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <div className="space-y-2 max-h-72 overflow-auto pr-1">
          {events.length === 0 && <p className="text-xs text-muted-foreground">Brak wydarzeń.</p>}
          {events.map((e) => {
            const cur = items[e.id];
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 py-1 border-b last:border-0">
                <div className="min-w-0">
                  <div className="text-sm truncate">{e.title}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(e.event_date).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  {allowInherit && (
                    <Button
                      type="button"
                      variant={cur === undefined ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setOne(e.id, undefined)}
                    >
                      Dziedzicz
                    </Button>
                  )}
                  <Switch checked={Boolean(cur)} onCheckedChange={(c) => setOne(e.id, c)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const InviteLinksTab: React.FC = () => {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('guest_invite_links')
      .select('*')
      .order('created_at', { ascending: false });
    setLinks((data as InviteLink[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const token = crypto.randomUUID().replace(/-/g, '');
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from('guest_invite_links').insert({
      token,
      label: label.trim() || null,
      max_uses: maxUses ? Number(maxUses) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: u.user?.id,
    });
    if (error) { toast({ title: 'Błąd', description: error.message, variant: 'destructive' }); return; }
    setLabel(''); setMaxUses(''); setExpiresAt('');
    toast({ title: 'Link utworzony' });
    load();
  };

  const toggle = async (l: InviteLink) => {
    await (supabase as any).from('guest_invite_links').update({ is_active: !l.is_active }).eq('id', l.id);
    load();
  };
  const remove = async (l: InviteLink) => {
    if (!confirm('Usunąć ten link zaproszenia?')) return;
    await (supabase as any).from('guest_invite_links').delete().eq('id', l.id);
    load();
  };
  const copy = (l: InviteLink) => {
    const url = guestRegisterUrl(l.token);
    navigator.clipboard.writeText(url);
    toast({ title: 'Skopiowano', description: url });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nowy link zaproszenia</CardTitle>
          <CardDescription>Link prowadzi do /zaproszenie/&lt;token&gt; – gość zakłada konto.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Label>Etykieta (opcjonalnie)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="np. Goście demo" />
          </div>
          <div>
            <Label>Max użyć (puste = bez limitu)</Label>
            <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <div>
            <Label>Wygasa</Label>
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <Button onClick={create}><Plus className="h-4 w-4 mr-1" />Utwórz link</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Aktywne linki</CardTitle>
          <Button variant="ghost" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <div className="space-y-3">
              {links.length === 0 && <p className="text-sm text-muted-foreground">Brak linków.</p>}
              {links.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-3 p-3 border rounded-md">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium">{l.label || '(bez etykiety)'}</div>
                    <div className="text-xs text-muted-foreground break-all">{guestRegisterUrl(l.token)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Użycia: {l.used_count}{l.max_uses ? ` / ${l.max_uses}` : ''}
                      {l.expires_at && <> · Wygasa: {new Date(l.expires_at).toLocaleString()}</>}
                    </div>
                  </div>
                  <Switch checked={l.is_active} onCheckedChange={() => toggle(l)} />
                  <Button variant="outline" size="sm" onClick={() => copy(l)}><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(l)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const GlobalConfigTab: React.FC = () => {
  const [cfg, setCfg] = useState<any>(null);
  const [rowId, setRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('guest_visibility_global').select('*').limit(1).maybeSingle();
      setCfg(data?.config || {});
      setRowId(data?.id ?? null);
    })();
  }, []);
  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (rowId) {
      await (supabase as any).from('guest_visibility_global').update({ config: cfg, updated_by: u.user?.id }).eq('id', rowId);
    } else {
      const { data } = await (supabase as any).from('guest_visibility_global').insert({ config: cfg, updated_by: u.user?.id }).select('id').single();
      setRowId(data?.id ?? null);
    }
    setSaving(false);
    toast({ title: 'Zapisano' });
  };
  if (cfg === null) return <Loader2 className="h-5 w-5 animate-spin" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Konfiguracja globalna gościa</CardTitle>
        <CardDescription>Dotyczy każdego gościa, chyba że konkretne konto ma indywidualne nadpisanie.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <VisibilityEditor value={cfg} onChange={setCfg} />
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Zapisz'}</Button>
          <Button variant="outline" asChild>
            <a href="/dashboard?preview=guest" target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4 mr-1" />Podgląd jako gość <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const GuestUsersTab: React.FC = () => {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<GuestRow | null>(null);
  const [override, setOverride] = useState<any>({});
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data: roles } = await (supabase as any)
      .from('user_roles').select('user_id').eq('role', 'guest');
    const ids = (roles || []).map((r: any) => r.user_id);
    if (ids.length === 0) { setGuests([]); setLoading(false); return; }
    const { data: profs } = await (supabase as any)
      .from('profiles').select('id, email, first_name, last_name, created_at').in('id', ids);
    setGuests((profs as GuestRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openEdit = async (g: GuestRow) => {
    setEditingUser(g);
    const { data } = await (supabase as any).from('guest_visibility_overrides').select('*').eq('user_id', g.id).maybeSingle();
    setOverride(data?.config || {});
    setOverrideId(data?.id || null);
  };

  const saveOverride = async () => {
    if (!editingUser) return;
    const { data: u } = await supabase.auth.getUser();
    if (overrideId) {
      await (supabase as any).from('guest_visibility_overrides').update({ config: override, updated_by: u.user?.id }).eq('id', overrideId);
    } else {
      const { data } = await (supabase as any).from('guest_visibility_overrides').insert({
        user_id: editingUser.id, config: override, updated_by: u.user?.id,
      }).select('id').single();
      setOverrideId(data?.id ?? null);
    }
    toast({ title: 'Zapisano dla gościa' });
  };

  const clearOverride = async () => {
    if (!editingUser || !overrideId) { setOverride({}); return; }
    await (supabase as any).from('guest_visibility_overrides').delete().eq('id', overrideId);
    setOverride({}); setOverrideId(null);
    toast({ title: 'Usunięto indywidualne ustawienia' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goście ({guests.length})</CardTitle>
        <CardDescription>Indywidualne nadpisania widoczności per konto.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <div className="space-y-2">
            {guests.length === 0 && <p className="text-sm text-muted-foreground">Brak gości.</p>}
            {guests.map((g) => (
              <div key={g.id} className="flex items-center justify-between p-2 border rounded-md">
                <div>
                  <div className="font-medium text-sm">{g.first_name} {g.last_name}</div>
                  <div className="text-xs text-muted-foreground">{g.email}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(g)}>Widoczność</Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/dashboard?preview=guest&guestId=${g.id}`} target="_blank" rel="noreferrer">
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Indywidualne ustawienia: {editingUser?.email}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Każdy przełącznik nadpisuje wartość globalną. Użyj „Dziedzicz", by wrócić do ustawień globalnych dla danego elementu.
            </p>
            <VisibilityEditor value={override} onChange={setOverride} allowInherit />
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={clearOverride}>Usuń nadpisania</Button>
              <Button onClick={saveOverride}>Zapisz</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const GuestsManagement: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Goście</h2>
        <p className="text-sm text-muted-foreground">
          Generuj linki zaproszeń i decyduj co widzi gość — globalnie lub per konto.
        </p>
      </div>
      <Tabs defaultValue="invites">
        <TabsList>
          <TabsTrigger value="invites">Linki zaproszeń</TabsTrigger>
          <TabsTrigger value="global">Konfiguracja globalna</TabsTrigger>
          <TabsTrigger value="users">Lista gości</TabsTrigger>
        </TabsList>
        <TabsContent value="invites"><InviteLinksTab /></TabsContent>
        <TabsContent value="global"><GlobalConfigTab /></TabsContent>
        <TabsContent value="users"><GuestUsersTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default GuestsManagement;
