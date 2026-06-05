import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShieldAlert, Check, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface PendingRow {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  flagged_words: string[];
  created_at: string;
  post?: { title: string; slug: string } | null;
  author?: { first_name: string | null; last_name: string | null } | null;
  parent_excerpt?: string | null;
}

export const NewsHubCommentsModerationPanel: React.FC = () => {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from('news_hub_comments' as any) as any)
      .select('id, post_id, user_id, parent_id, content, flagged_words, created_at')
      .eq('is_pending_review', true)
      .order('created_at', { ascending: false });
    const list: PendingRow[] = (data || []) as any;
    if (list.length) {
      const postIds = Array.from(new Set(list.map((r) => r.post_id)));
      const userIds = Array.from(new Set(list.map((r) => r.user_id)));
      const parentIds = Array.from(new Set(list.map((r) => r.parent_id).filter(Boolean) as string[]));
      const [{ data: posts }, { data: profs }, parentsRes] = await Promise.all([
        (supabase.from('news_hub_posts' as any) as any).select('id, title, slug').in('id', postIds),
        (supabase.from('profiles' as any) as any).select('user_id, first_name, last_name').in('user_id', userIds),
        parentIds.length
          ? (supabase.from('news_hub_comments' as any) as any).select('id, content').in('id', parentIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const pmap = new Map<string, any>((posts || []).map((p: any) => [p.id, p]));
      const umap = new Map<string, any>((profs || []).map((p: any) => [p.user_id, p]));
      const parentMap = new Map<string, string>(((parentsRes as any).data || []).map((p: any) => [p.id, p.content]));
      list.forEach((r) => {
        r.post = pmap.get(r.post_id) || null;
        r.author = umap.get(r.user_id) || null;
        r.parent_excerpt = r.parent_id ? (parentMap.get(r.parent_id) || null) : null;
      });
    }
    setRows(list);
    setLoading(false);
  }, []);


  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const ch = supabase
      .channel('news_hub_comments_mod')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_hub_comments' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  const approve = async (id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
    const { error } = await (supabase.from('news_hub_comments' as any) as any)
      .update({ is_pending_review: false, is_hidden: false, review_decision: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error(error.message); fetchAll(); } else toast.success('Zatwierdzono');
  };

  const reject = async (id: string) => {
    if (!confirm('Usunąć komentarz?')) return;
    setRows((rs) => rs.filter((r) => r.id !== id));
    const { error } = await (supabase.from('news_hub_comments' as any) as any).delete().eq('id', id);
    if (error) { toast.error(error.message); fetchAll(); } else toast.success('Usunięto');
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <h2 className="font-semibold">Komentarze do zatwierdzenia</h2>
        {!loading && <Badge variant="outline">{rows.length}</Badge>}
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">Brak zgłoszonych komentarzy.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const author = `${r.author?.first_name || ''} ${r.author?.last_name || ''}`.trim() || 'Użytkownik';
            return (
              <li key={r.id} className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-semibold text-sm">{author}</span>
                  <span className="text-muted-foreground">{format(new Date(r.created_at), "d MMM yyyy 'o' HH:mm", { locale: pl })}</span>
                  {r.post && (
                    <Link to={`/aktualnosci/${r.post.slug}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> {r.post.title}
                    </Link>
                  )}
                  {r.flagged_words?.length > 0 && (
                    <span className="rounded-full bg-destructive/15 text-destructive px-2 py-0.5">
                      {r.flagged_words.join(', ')}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{r.content}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(r.id)} className="gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Zatwierdź
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => reject(r.id)} className="gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Odrzuć
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
