import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Trash2, UserPlus, Plus } from 'lucide-react';

interface ModeratorRow {
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  modules: Record<string, boolean>;
  granted_at: string;
}

/**
 * Predefiniowana lista modułów panelu admina, do których można przyznać
 * dostęp moderatorowi. Klucze odpowiadają wartościom `value` zakładek
 * w AdminSidebar oraz kluczom stron zewnętrznych (np. `news_hub` →
 * /admin/news-hub).
 *
 * Admin może dodać dodatkowe (własne) klucze przez pole „Dodaj własny moduł".
 */
const PREDEFINED_MODULES: { key: string; label: string; group: string }[] = [
  { key: 'news_hub', label: 'Centrum Aktualności (/admin/news-hub)', group: 'Treści' },
  { key: 'pages', label: 'Strony CMS', group: 'Treści' },
  { key: 'html-pages', label: 'Strony HTML', group: 'Treści' },
  { key: 'events', label: 'Wydarzenia', group: 'Eventy' },
  { key: 'event-registrations', label: 'Rejestracje na wydarzenia', group: 'Eventy' },
  { key: 'paid-events', label: 'Wydarzenia płatne / bilety', group: 'Eventy' },
  { key: 'meeting-guests', label: 'Goście spotkań', group: 'Eventy' },
  { key: 'partner-pages', label: 'Strony partnerskie', group: 'Eventy' },
  { key: 'training', label: 'Szkolenia', group: 'Wiedza' },
  { key: 'knowledge', label: 'Centrum Wiedzy', group: 'Wiedza' },
  { key: 'healthy-knowledge', label: 'Zdrowa Wiedza', group: 'Wiedza' },
  { key: 'media-library', label: 'Biblioteka mediów', group: 'Wiedza' },
  { key: 'daily-signal', label: 'Sygnał dnia', group: 'Komunikacja' },
  { key: 'important-info', label: 'Ważne informacje', group: 'Komunikacja' },
  { key: 'news-ticker', label: 'Pasek aktualności', group: 'Komunikacja' },
  { key: 'support', label: 'Wsparcie / Support', group: 'Komunikacja' },
  { key: 'notifications', label: 'Powiadomienia', group: 'Komunikacja' },
];

export const ModeratorsManagement: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<ModeratorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [customKey, setCustomKey] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1) wszyscy z rolą moderator
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'moderator' as any);

      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) { setRows([]); setLoading(false); return; }

      // 2) uprawnienia
      const { data: perms } = await supabase
        .from('moderator_permissions')
        .select('user_id, modules, granted_at')
        .in('user_id', ids);

      // 3) profile (do wyświetlenia)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);

      const permMap = new Map((perms || []).map((p: any) => [p.user_id, p]));
      const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const list: ModeratorRow[] = ids.map((id) => {
        const p = permMap.get(id) as any;
        const pr = profMap.get(id) as any;
        return {
          user_id: id,
          email: pr?.email || null,
          full_name: pr?.full_name || null,
          modules: (p?.modules || {}) as Record<string, boolean>,
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

  const addModerator = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    try {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile) {
        toast.error('Nie znaleziono użytkownika o tym e-mailu');
        return;
      }
      // dodaj rolę moderator (jeśli jeszcze nie ma)
      await supabase.from('user_roles').insert({
        user_id: profile.id,
        role: 'moderator' as any,
      } as any);
      // utwórz pusty wiersz uprawnień
      await supabase.from('moderator_permissions').upsert({
        user_id: profile.id,
        modules: {},
        granted_by: user?.id || null,
      } as any, { onConflict: 'user_id' });

      toast.success('Moderator dodany. Włącz mu wybrane moduły poniżej.');
      setNewEmail('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Błąd dodawania moderatora');
    }
  };

  const updateModules = async (userId: string, modules: Record<string, boolean>) => {
    try {
      await supabase.from('moderator_permissions').upsert({
        user_id: userId,
        modules,
        granted_by: user?.id || null,
      } as any, { onConflict: 'user_id' });
      setRows((r) => r.map((x) => x.user_id === userId ? { ...x, modules } : x));
    } catch (err: any) {
      toast.error(err.message || 'Błąd zapisu uprawnień');
      fetchData();
    }
  };

  const removeModerator = async (userId: string) => {
    if (!confirm('Na pewno odebrać uprawnienia moderatora?')) return;
    try {
      await supabase.from('moderator_permissions').delete().eq('user_id', userId);
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'moderator' as any);
      toast.success('Usunięto moderatora');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Błąd usuwania');
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-muted-foreground">Brak dostępu.</div>;
  }

  const grouped = PREDEFINED_MODULES.reduce((acc, m) => {
    (acc[m.group] = acc[m.group] || []).push(m);
    return acc;
  }, {} as Record<string, typeof PREDEFINED_MODULES>);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Moderatorzy panelu</h2>
      </div>
      <p className="text-sm text-muted-foreground max-w-2xl">
        Moderator otrzymuje dostęp do panelu admina, ale widzi tylko te moduły, które
        zostały mu jawnie włączone. Akcje krytyczne (zarządzanie kontami, role, klucze
        API, kasowanie danych) pozostają zawsze tylko po stronie administratora.
      </p>

      <Card className="p-4 space-y-3">
        <Label className="font-semibold">Dodaj nowego moderatora (e-mail istniejącego użytkownika)</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addModerator()}
          />
          <Button onClick={addModerator} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Dodaj
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Brak moderatorów. Dodaj pierwszego powyżej.
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <Card key={r.user_id} className="p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold">{r.full_name || '(bez imienia)'}</div>
                  <div className="text-sm text-muted-foreground">{r.email || r.user_id}</div>
                  <Badge variant="secondary" className="mt-1">Moderator</Badge>
                </div>
                <Button variant="destructive" size="sm" onClick={() => removeModerator(r.user_id)} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Usuń
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(grouped).map(([group, items]) => (
                  <div key={group} className="border border-border rounded-lg p-3">
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">{group}</div>
                    <div className="space-y-2">
                      {items.map((m) => {
                        const enabled = !!r.modules[m.key];
                        return (
                          <div key={m.key} className="flex items-center justify-between gap-2">
                            <Label htmlFor={`${r.user_id}-${m.key}`} className="text-sm font-normal cursor-pointer">
                              {m.label}
                            </Label>
                            <Switch
                              id={`${r.user_id}-${m.key}`}
                              checked={enabled}
                              onCheckedChange={(v) => updateModules(r.user_id, { ...r.modules, [m.key]: v })}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom modules */}
              <div className="border border-dashed border-border rounded-lg p-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Dodatkowe moduły (klucz własny)</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Object.entries(r.modules)
                    .filter(([k]) => !PREDEFINED_MODULES.some((p) => p.key === k))
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
