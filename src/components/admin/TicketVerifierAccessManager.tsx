import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, Search, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface AccessRow {
  user_id: string;
  is_enabled: boolean;
  granted_at: string;
  profile?: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    eq_id: string | null;
  } | null;
}

export const TicketVerifierAccessManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ticket_verifier_access')
      .select('user_id, is_enabled, granted_at')
      .order('granted_at', { ascending: false });
    if (error) {
      toast({ title: 'Błąd ładowania', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const list = data || [];
    if (list.length > 0) {
      const ids = list.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id')
        .in('user_id', ids);
      setRows(list.map(r => ({ ...r, profile: profiles?.find(p => p.user_id === r.user_id) || null })));
    } else {
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = async () => {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email, eq_id')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,eq_id.ilike.%${q}%`)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const grant = async (userId: string) => {
    const { error } = await supabase
      .from('ticket_verifier_access')
      .upsert({ user_id: userId, is_enabled: true, granted_by: user?.id || null }, { onConflict: 'user_id' });
    if (error) {
      toast({ title: 'Błąd nadawania dostępu', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Dostęp nadany' });
    setSearch('');
    setSearchResults([]);
    fetchData();
  };

  const revoke = async (userId: string) => {
    const { error } = await supabase.from('ticket_verifier_access').delete().eq('user_id', userId);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Dostęp odebrany' });
    fetchData();
  };

  const grantedIds = new Set(rows.map(r => r.user_id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Weryfikatorzy biletów
        </CardTitle>
        <CardDescription>
          Wybrani użytkownicy zobaczą w pasku bocznym pulpitu zakładkę „Weryfikacja biletów"
          i będą mogli wykonywać check-in / check-out tak samo jak admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search & grant */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Szukaj: imię, nazwisko, e-mail, EQID..."
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching || !search.trim()}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Szukaj'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 rounded-md border border-border/50 p-2">
              {searchResults.map(p => {
                const granted = grantedIds.has(p.user_id);
                return (
                  <div key={p.user_id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.email} {p.eq_id ? `• ${p.eq_id}` : ''}</div>
                    </div>
                    {granted ? (
                      <Badge variant="secondary">Już ma dostęp</Badge>
                    ) : (
                      <Button size="sm" onClick={() => grant(p.user_id)}>
                        <UserPlus className="w-4 h-4 mr-1" /> Nadaj
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Granted list */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Aktywni weryfikatorzy ({rows.length})</div>
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Brak nadanych dostępów. Wyszukaj użytkownika powyżej i kliknij „Nadaj".
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.user_id} className="flex items-center gap-3 p-3 rounded-md border bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {[r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(' ') || '—'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.profile?.email || '—'} {r.profile?.eq_id ? `• ${r.profile.eq_id}` : ''}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => revoke(r.user_id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketVerifierAccessManager;
