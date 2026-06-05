import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Row { id: string; word: string; created_at: string }

export const NewsHubBannedWordsPanel: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from('news_hub_comment_banned_words' as any) as any)
      .select('id, word, created_at')
      .order('word', { ascending: true });
    setRows((data || []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const add = async () => {
    const words = input.split(/[\n,]+/).map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 2);
    if (!words.length) return;
    setAdding(true);
    const rowsToAdd = words.map((w) => ({ word: w }));
    const { error } = await (supabase.from('news_hub_comment_banned_words' as any) as any)
      .upsert(rowsToAdd, { onConflict: 'word', ignoreDuplicates: true });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Dodano ${words.length} słów`);
    setInput('');
    fetchAll();
  };

  const remove = async (id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
    const { error } = await (supabase.from('news_hub_comment_banned_words' as any) as any).delete().eq('id', id);
    if (error) { toast.error(error.message); fetchAll(); }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Lista zakazanych słów</h2>
        {!loading && <span className="text-xs text-muted-foreground">({rows.length})</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        Komentarze zawierające te słowa trafiają automatycznie do moderacji. Wpisz słowa oddzielone przecinkiem lub nową linią.
      </p>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="np. obrazliwe, slowo1, slowo2"
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <Button onClick={add} disabled={adding || !input.trim()} className="gap-1.5">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Dodaj
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
          {rows.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
              {r.word}
              <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
          {rows.length === 0 && <span className="text-sm text-muted-foreground">Brak słów na liście.</span>}
        </div>
      )}
    </div>
  );
};
