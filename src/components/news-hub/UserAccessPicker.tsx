import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  eq_id: string | null;
}

interface Props {
  /** Table where access rows live: news_hub_user_access | news_hub_post_user_access */
  table: 'news_hub_user_access' | 'news_hub_post_user_access';
  /** Optional extra row data on insert (e.g. { post_id }) */
  extraInsert?: Record<string, any>;
  /** SQL filter applied when fetching existing access rows */
  filter?: Record<string, any>;
  label?: string;
  description?: string;
}

export const UserAccessPicker: React.FC<Props> = ({ table, extraInsert = {}, filter = {}, label = 'Dostęp dla użytkowników', description }) => {
  const [rows, setRows] = useState<Array<{ id: string; user_id: string; profile?: Profile }>>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    setLoading(true);
    let q: any = (supabase.from(table as any) as any).select('id, user_id');
    Object.entries(filter).forEach(([k, v]) => { q = q.eq(k, v); });
    const { data } = await q;
    const list = (data || []) as Array<{ id: string; user_id: string }>;
    if (list.length === 0) { setRows([]); setLoading(false); return; }
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email, eq_id')
      .in('user_id', list.map((r) => r.user_id));
    setRows(list.map((r) => ({ ...r, profile: profiles?.find((p) => p.user_id === r.user_id) as any })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [table, JSON.stringify(filter)]);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email, eq_id')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,eq_id.ilike.%${query}%`)
      .limit(10);
    setResults((data || []) as Profile[]);
    setSearching(false);
  };

  const grant = async (userId: string) => {
    const { error } = await (supabase.from(table as any) as any).insert({ user_id: userId, ...extraInsert });
    if (error) {
      if (error.code === '23505') toast.message('Użytkownik już ma dostęp');
      else toast.error('Błąd: ' + error.message);
      return;
    }
    toast.success('Dodano dostęp');
    setQuery(''); setResults([]);
    load();
  };

  const revoke = async (id: string) => {
    await (supabase.from(table as any) as any).delete().eq('id', id);
    toast.success('Usunięto');
    load();
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Szukaj po imieniu, nazwisku, e-mailu lub EQ ID"
            className="pl-8 h-9"
          />
        </div>
        <Button size="sm" onClick={search} disabled={searching} className="gap-1.5">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Szukaj
        </Button>
      </div>

      {results.length > 0 && (
        <div className="rounded-md border border-border divide-y divide-border">
          {results.map((p) => {
            const already = rows.some((r) => r.user_id === p.user_id);
            return (
              <div key={p.user_id} className="flex items-center justify-between p-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email}{p.eq_id ? ` · ${p.eq_id}` : ''}</div>
                </div>
                <Button size="sm" variant="outline" disabled={already} onClick={() => grant(p.user_id)} className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> {already ? 'Dodany' : 'Dodaj'}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
          Z dostępem ({rows.length})
        </div>
        {loading ? (
          <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">Brak dodanych użytkowników</div>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {r.profile ? [r.profile.first_name, r.profile.last_name].filter(Boolean).join(' ') || r.profile.email : r.user_id}
                  </div>
                  {r.profile && <div className="text-xs text-muted-foreground truncate">{r.profile.email}{r.profile.eq_id ? ` · ${r.profile.eq_id}` : ''}</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => revoke(r.id)} className="text-destructive h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
