import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, UserCheck, Users } from 'lucide-react';
import { AppBanner, BannerCard, FIELD_LABELS } from '@/components/banners/AppBanners';
import { matchBanner } from '@/components/banners/bannerMatching';

const ROLES = ['admin','partner','specjalista','klient','lider','guest'];
const FIELDS = Object.keys(FIELD_LABELS);

interface Props {
  banners: AppBanner[];
}

export const BannerSimulator: React.FC<Props> = ({ banners }) => {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'manual' | 'real'>('manual');

  // Manual sim state
  const [simRole, setSimRole] = useState<string>('klient');
  // Fields the user IS MISSING (i.e. empty in their profile)
  const [missingFields, setMissingFields] = useState<string[]>([...FIELDS]);
  const [simPath, setSimPath] = useState<string>('/dashboard');
  const [simUserId, setSimUserId] = useState<string>('');

  // Real user search
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: foundUsers } = useQuery({
    queryKey: ['banner-sim-user-search', search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
        .limit(8);
      return (data as any[]) || [];
    },
    enabled: mode === 'real' && enabled && search.length >= 2,
  });

  const { data: realCtx } = useQuery({
    queryKey: ['banner-sim-real-ctx', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const [{ data: prof }, { data: roleRow }] = await Promise.all([
        supabase.from('profiles').select('user_id,first_name,last_name,eq_id,street_address,postal_code,city,country,phone_number,email').eq('user_id', selectedUserId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', selectedUserId).maybeSingle(),
      ]);
      return {
        userId: selectedUserId,
        role: (roleRow as any)?.role || null,
        profile: prof as any,
      };
    },
    enabled: mode === 'real' && !!selectedUserId,
  });

  // Build profile object based on missingFields toggles (manual mode)
  const manualProfile = useMemo(() => {
    const p: Record<string, string | null> = {};
    for (const f of FIELDS) {
      p[f] = missingFields.includes(f) ? null : 'simulated';
    }
    return p;
  }, [missingFields]);

  const ctx = useMemo(() => {
    if (mode === 'real' && realCtx) {
      return {
        userId: realCtx.userId,
        role: realCtx.role,
        profile: realCtx.profile,
        pathname: simPath || '/dashboard',
      };
    }
    return {
      userId: simUserId || null,
      role: simRole === 'guest' ? null : simRole,
      profile: manualProfile,
      pathname: simPath || '/dashboard',
    };
  }, [mode, realCtx, simRole, manualProfile, simPath, simUserId]);

  const results = useMemo(() => {
    return banners.map((b) => ({ banner: b, match: matchBanner(b, ctx) }));
  }, [banners, ctx]);

  const visibleCount = results.filter((r) => r.match.visible).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 text-primary" /> Symulator audiencji
          </CardTitle>
          <CardDescription className="break-words">
            Sprawdź, którym użytkownikom (rola, brakujące pola, ścieżka) wyświetli się dany baner.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{enabled ? 'Włączony' : 'Wyłączony'}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => setMode('manual')}>Symulacja ręczna</Button>
            <Button size="sm" variant={mode === 'real' ? 'default' : 'outline'} onClick={() => setMode('real')} className="gap-1">
              <Users className="h-3.5 w-3.5" /> Realny użytkownik
            </Button>
          </div>

          {mode === 'manual' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Rola</Label>
                  <Select value={simRole} onValueChange={setSimRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ścieżka</Label>
                  <Input value={simPath} onChange={(e) => setSimPath(e.target.value)} placeholder="/dashboard" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">User ID (opcjonalnie, dla audiencji „konkretni użytkownicy")</Label>
                  <Input value={simUserId} onChange={(e) => setSimUserId(e.target.value)} placeholder="uuid" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Brakujące pola profilu (zaznacz = puste w profilu)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mt-1.5">
                  {FIELDS.map((f) => (
                    <label key={f} className="flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer hover:bg-accent">
                      <Checkbox
                        checked={missingFields.includes(f)}
                        onCheckedChange={(c) => {
                          setMissingFields((cur) => c ? [...cur, f] : cur.filter((x) => x !== f));
                        }}
                      />
                      {FIELD_LABELS[f]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Szukaj użytkownika (email / imię / nazwisko)</Label>
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="min. 2 znaki..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ścieżka</Label>
                  <Input value={simPath} onChange={(e) => setSimPath(e.target.value)} placeholder="/dashboard" />
                </div>
              </div>
              {foundUsers && foundUsers.length > 0 && (
                <div className="border rounded-md divide-y max-h-40 overflow-auto">
                  {foundUsers.map((u: any) => (
                    <button
                      key={u.user_id}
                      type="button"
                      onClick={() => setSelectedUserId(u.user_id)}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent ${selectedUserId === u.user_id ? 'bg-primary/15' : ''}`}
                    >
                      <span className="font-medium">{u.first_name} {u.last_name}</span> · <span className="text-muted-foreground">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {realCtx && (
                <div className="text-xs text-muted-foreground border rounded-md p-2 bg-muted/40">
                  <div>ID: <code>{realCtx.userId}</code></div>
                  <div>Rola: <span className="font-medium">{realCtx.role || '—'}</span></div>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Wynik dla tej audiencji</Label>
              <span className="text-xs text-muted-foreground">Wyświetlonych: <strong>{visibleCount}</strong> / {results.length}</span>
            </div>
            <div className="space-y-2">
              {results.map(({ banner, match }) => (
                <div key={banner.id} className={`border rounded-md p-2 ${match.visible ? '' : 'opacity-50'}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {match.visible ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-sm font-medium truncate">{banner.title}</span>
                    <Badge variant={match.visible ? 'default' : 'outline'} className="text-[10px]">
                      {match.visible ? 'Widoczny' : (match.reason || 'Ukryty')}
                    </Badge>
                  </div>
                  {match.visible && (
                    <BannerCard banner={banner} missing={match.missing || []} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default BannerSimulator;
