import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  UserPlus,
  Trash2,
  Users,
  ShieldCheck,
  ShieldX,
  Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

type OverrideMode = 'allowed' | 'denied';

interface Profile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  eq_id: string | null;
  role?: string | null;
}

interface OverrideRow {
  id: string;
  user_id: string;
  mode: OverrideMode;
  note: string | null;
  created_at: string;
  profile?: Profile;
}

export const PaidEventsUserOverrides: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'allowed' | 'denied'>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const [pendingProfile, setPendingProfile] = useState<Profile | null>(null);
  const [pendingMode, setPendingMode] = useState<OverrideMode>('allowed');
  const [pendingNote, setPendingNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOverrides = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('paid_events_visibility_overrides')
      .select('id, user_id, mode, note, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const rows = (data || []) as OverrideRow[];
    if (rows.length === 0) {
      setOverrides([]);
      setLoading(false);
      return;
    }

    const userIds = rows.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email, eq_id, role')
      .in('user_id', userIds);

    const enriched = rows.map((r) => ({
      ...r,
      profile: profiles?.find((p) => p.user_id === r.user_id) as Profile | undefined,
    }));
    setOverrides(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchOverrides();
  }, []);

  const searchUsers = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email, eq_id, role')
      .or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,eq_id.ilike.%${q}%`,
      )
      .limit(10);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
    setSearchResults((data || []) as Profile[]);
    setSearching(false);
  };

  const startAddOverride = (profile: Profile) => {
    if (profile.user_id === user?.id) {
      toast({
        title: 'Nie można',
        description: 'Nie możesz dodać wyjątku dla samego siebie.',
        variant: 'destructive',
      });
      return;
    }
    setPendingProfile(profile);
    setPendingMode('allowed');
    setPendingNote('');
  };

  const cancelPending = () => {
    setPendingProfile(null);
    setPendingNote('');
  };

  const saveOverride = async () => {
    if (!pendingProfile) return;
    setSubmitting(true);

    const payload = {
      user_id: pendingProfile.user_id,
      mode: pendingMode,
      note: pendingNote.trim() || null,
      created_by: user?.id ?? null,
    };

    // Upsert by unique user_id
    const { error } = await supabase
      .from('paid_events_visibility_overrides')
      .upsert(payload, { onConflict: 'user_id' });

    setSubmitting(false);

    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Zapisano wyjątek',
      description: `${pendingProfile.first_name ?? ''} ${pendingProfile.last_name ?? ''} — ${
        pendingMode === 'allowed' ? 'Zezwolono' : 'Zablokowano'
      }`,
    });
    setPendingProfile(null);
    setSearchResults([]);
    setSearchQuery('');
    setPendingNote('');
    queryClient.invalidateQueries({ queryKey: ['paid-events-visibility-override'] });
    fetchOverrides();
  };

  const removeOverride = async (id: string) => {
    const { error } = await supabase
      .from('paid_events_visibility_overrides')
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Usunięto wyjątek' });
    queryClient.invalidateQueries({ queryKey: ['paid-events-visibility-override'] });
    fetchOverrides();
  };

  const toggleMode = async (row: OverrideRow) => {
    const next: OverrideMode = row.mode === 'allowed' ? 'denied' : 'allowed';
    const { error } = await supabase
      .from('paid_events_visibility_overrides')
      .update({ mode: next })
      .eq('id', row.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['paid-events-visibility-override'] });
    fetchOverrides();
  };

  const filtered = overrides.filter((r) => filter === 'all' || r.mode === filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Wyjątki widoczności per użytkownik
        </CardTitle>
        <CardDescription className="space-y-1">
          <span className="block">
            Wyjątek nadpisuje ustawienia widoczności dla roli.
          </span>
          <span className="flex flex-wrap gap-2 text-xs pt-1">
            <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
              <ShieldCheck className="w-3 h-3 mr-1" /> Zezwolono
            </Badge>
            <span>= użytkownik widzi moduł niezależnie od swojej roli.</span>
          </span>
          <span className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400">
              <ShieldX className="w-3 h-3 mr-1" /> Zablokowano
            </Badge>
            <span>= użytkownik nie widzi modułu, nawet jeśli jego rola ma dostęp.</span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Search */}
        <div>
          <Label className="text-sm">Dodaj wyjątek dla użytkownika</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj po imieniu, nazwisku, e-mailu lub EQ ID..."
              onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            />
            <Button onClick={searchUsers} disabled={searching} variant="outline">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y mt-3">
              {searchResults.map((profile) => {
                const existing = overrides.find((o) => o.user_id === profile.user_id);
                return (
                  <div
                    key={profile.user_id}
                    className="flex items-center justify-between p-3 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {profile.first_name} {profile.last_name}
                        {profile.role && (
                          <Badge variant="secondary" className="ml-2 text-[10px] uppercase">
                            {profile.role}
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {profile.email}
                        {profile.eq_id && ` · ${profile.eq_id}`}
                      </p>
                      {existing && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Już istnieje wyjątek (
                          {existing.mode === 'allowed' ? 'Zezwolono' : 'Zablokowano'}). Zostanie nadpisany.
                        </p>
                      )}
                    </div>
                    <Button size="sm" onClick={() => startAddOverride(profile)}>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Dodaj wyjątek
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending edit form */}
        {pendingProfile && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/40">
            <div>
              <p className="font-medium">
                {pendingProfile.first_name} {pendingProfile.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{pendingProfile.email}</p>
            </div>

            <div>
              <Label>Tryb wyjątku</Label>
              <Select
                value={pendingMode}
                onValueChange={(v) => setPendingMode(v as OverrideMode)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowed">
                    Zezwól — użytkownik zobaczy moduł niezależnie od roli
                  </SelectItem>
                  <SelectItem value="denied">
                    Zablokuj — użytkownik nie zobaczy modułu, mimo uprawnień roli
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notatka (opcjonalnie)</Label>
              <Textarea
                value={pendingNote}
                onChange={(e) => setPendingNote(e.target.value)}
                placeholder="Powód nadania / odebrania dostępu"
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelPending} disabled={submitting}>
                Anuluj
              </Button>
              <Button onClick={saveOverride} disabled={submitting}>
                {submitting ? 'Zapisywanie...' : 'Zapisz wyjątek'}
              </Button>
            </div>
          </div>
        )}

        {/* Filter + list */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <p className="text-sm font-medium">
            Aktywne wyjątki ({overrides.length})
          </p>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="allowed">Tylko zezwolone</SelectItem>
              <SelectItem value="denied">Tylko zablokowane</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Brak wyjątków{filter !== 'all' ? ' w tym filtrze' : ''}.
          </p>
        ) : (
          <div className="border rounded-lg divide-y">
            {filtered.map((row) => {
              const allowed = row.mode === 'allowed';
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between p-3 gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">
                        {row.profile?.first_name ?? '—'} {row.profile?.last_name ?? ''}
                      </p>
                      {row.profile?.role && (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {row.profile.role}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          allowed
                            ? 'border-green-500 text-green-600 dark:text-green-400'
                            : 'border-red-500 text-red-600 dark:text-red-400'
                        }
                      >
                        {allowed ? (
                          <>
                            <ShieldCheck className="w-3 h-3 mr-1" /> Zezwolono
                          </>
                        ) : (
                          <>
                            <ShieldX className="w-3 h-3 mr-1" /> Zablokowano
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {row.profile?.email ?? row.user_id}
                      {row.profile?.eq_id && ` · ${row.profile.eq_id}`}
                    </p>
                    {row.note && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="break-words">{row.note}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleMode(row)}
                          >
                            Zmień na {allowed ? 'Zablokuj' : 'Zezwól'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Przełącz tryb wyjątku</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOverride(row.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaidEventsUserOverrides;
