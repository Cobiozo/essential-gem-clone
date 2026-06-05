import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Loader2, MessageSquare, Pencil, Pin, PinOff, Send, Trash2, EyeOff, Eye, ShieldAlert, ThumbsUp, ThumbsDown, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNewsHubComments, canAuthorEditNow, type NewsHubComment } from '@/hooks/useNewsHubComments';
import { cn } from '@/lib/utils';

interface Props {
  postId: string;
  title?: string;
  inline?: boolean;
  className?: string;
}

const fullName = (c?: NewsHubComment['author']) => {
  if (!c) return 'Użytkownik';
  const n = `${c.first_name || ''} ${c.last_name || ''}`.trim();
  return n || 'Użytkownik';
};

const initials = (c?: NewsHubComment['author']) => {
  const n = fullName(c);
  const parts = n.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
};

export const CommentsSection: React.FC<Props> = ({ postId, title = 'Komentarze', className }) => {
  const { user, isAdmin } = useAuth();
  const canModerate = isAdmin;
  const { comments, loading, addComment, updateComment, deleteComment, react } = useNewsHubComments(postId, !!postId);

  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyPosting, setReplyPosting] = useState(false);

  const { roots, repliesByParent } = useMemo(() => {
    const roots: NewsHubComment[] = [];
    const repliesByParent = new Map<string, NewsHubComment[]>();
    comments.forEach((c) => {
      if (c.parent_id) {
        const arr = repliesByParent.get(c.parent_id) || [];
        arr.push(c);
        repliesByParent.set(c.parent_id, arr);
      } else {
        roots.push(c);
      }
    });
    // replies oldest-first for natural reading
    repliesByParent.forEach((arr) => arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    return { roots, repliesByParent };
  }, [comments]);

  const submit = async () => {
    if (!user) return;
    setPosting(true);
    try {
      const created = await addComment(user.id, text, null);
      setText('');
      if (created?.is_pending_review) {
        toast.warning('Komentarz zawiera słowa wymagające moderacji i czeka na zatwierdzenie przez administratora.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Nie udało się dodać komentarza');
    } finally { setPosting(false); }
  };

  const submitReply = async (parentId: string) => {
    if (!user) return;
    setReplyPosting(true);
    try {
      const created = await addComment(user.id, replyText, parentId);
      setReplyText('');
      setReplyingTo(null);
      if (created?.is_pending_review) {
        toast.warning('Odpowiedź zawiera słowa wymagające moderacji i czeka na zatwierdzenie.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Nie udało się dodać odpowiedzi');
    } finally { setReplyPosting(false); }
  };

  const saveEdit = async (id: string) => {
    try {
      await updateComment(id, { content: editText });
      setEditingId(null);
      setEditText('');
    } catch (e: any) { toast.error(e.message || 'Błąd edycji'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Usunąć komentarz?')) return;
    try { await deleteComment(id); } catch (e: any) { toast.error(e.message || 'Błąd'); }
  };

  const onReact = async (id: string, value: 1 | -1) => {
    try { await react(id, value); } catch (e: any) { toast.error(e.message || 'Błąd reakcji'); }
  };

  const renderComment = (c: NewsHubComment, isReply = false) => {
    const mine = user?.id === c.user_id;
    const withinWindow = canAuthorEditNow(c);
    const canEdit = (mine && withinWindow) || canModerate;
    const canDelete = (mine && withinWindow) || canModerate;
    const isEditing = editingId === c.id;
    const showPendingBanner = c.is_pending_review && (mine || canModerate);
    const reactionsDisabled = !user || c.is_pending_review || c.is_hidden;

    return (
      <li key={c.id} className={cn(
        'rounded-lg border border-border bg-background p-3 transition-opacity',
        c.is_pinned && !isReply && 'border-primary/50 bg-primary/5',
        c.is_hidden && !c.is_pending_review && 'opacity-60',
        c.is_pending_review && 'border-amber-500/60 bg-amber-500/5'
      )}>
        <div className="flex items-start gap-3">
          {c.author?.avatar_url ? (
            <img src={c.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted text-xs flex items-center justify-center font-semibold shrink-0">{initials(c.author)}</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span className="font-semibold text-sm text-foreground">{fullName(c.author)}</span>
              <span className="text-muted-foreground">{format(new Date(c.created_at), "d MMM yyyy 'o' HH:mm", { locale: pl })}</span>
              {c.is_pinned && !isReply && <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5"><Pin className="h-3 w-3" /> Przypięty</span>}
              {c.is_hidden && !c.is_pending_review && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Ukryty</span>}
            </div>

            {showPendingBanner && (
              <div className="mt-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Oczekuje na zatwierdzenie przez administratora{c.flagged_words?.length ? ` · wykryto: ${c.flagged_words.join(', ')}` : ''}.
              </div>
            )}

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} maxLength={2000} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(c.id)}>Zapisz</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditText(''); }}>Anuluj</Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm whitespace-pre-wrap break-words">{c.content}</p>
            )}

            {!isEditing && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <Button
                  size="sm" variant="ghost"
                  disabled={reactionsDisabled}
                  className={cn('h-7 px-2 text-xs gap-1', c.reactions.mine === 1 && 'text-primary')}
                  onClick={() => onReact(c.id, 1)}
                  aria-label="Lubię to"
                >
                  <ThumbsUp className="h-3.5 w-3.5" /> {c.reactions.up}
                </Button>
                <Button
                  size="sm" variant="ghost"
                  disabled={reactionsDisabled}
                  className={cn('h-7 px-2 text-xs gap-1', c.reactions.mine === -1 && 'text-destructive')}
                  onClick={() => onReact(c.id, -1)}
                  aria-label="Nie lubię"
                >
                  <ThumbsDown className="h-3.5 w-3.5" /> {c.reactions.down}
                </Button>

                {!isReply && user && !c.is_hidden && !c.is_pending_review && (
                  <Button
                    size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
                    onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyText(''); }}
                  >
                    <Reply className="h-3.5 w-3.5" /> Odpowiedz
                  </Button>
                )}

                {canEdit && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => { setEditingId(c.id); setEditText(c.content); }}>
                    <Pencil className="h-3 w-3" /> Edytuj
                  </Button>
                )}
                {canModerate && (
                  <>
                    {!isReply && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => updateComment(c.id, { is_pinned: !c.is_pinned })}>
                        {c.is_pinned ? <><PinOff className="h-3 w-3" /> Odepnij</> : <><Pin className="h-3 w-3" /> Przypnij</>}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => updateComment(c.id, { is_hidden: !c.is_hidden })}>
                      {c.is_hidden ? <><Eye className="h-3 w-3" /> Pokaż</> : <><EyeOff className="h-3 w-3" /> Ukryj</>}
                    </Button>
                    {c.is_pending_review && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-emerald-600" onClick={() => updateComment(c.id, { is_pending_review: false, is_hidden: false, review_decision: 'approved' })}>
                        Zatwierdź
                      </Button>
                    )}
                  </>
                )}
                {canDelete && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-destructive" onClick={() => remove(c.id)}>
                    <Trash2 className="h-3 w-3" /> Usuń
                  </Button>
                )}
              </div>
            )}

            {!isReply && replyingTo === c.id && user && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Napisz odpowiedź..."
                  rows={2}
                  maxLength={2000}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{replyText.length}/2000</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyText(''); }}>Anuluj</Button>
                    <Button size="sm" onClick={() => submitReply(c.id)} disabled={replyPosting || replyText.trim().length < 2} className="gap-1.5">
                      {replyPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Wyślij
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!isReply && repliesByParent.get(c.id)?.length ? (
              <ul className="mt-3 ml-2 sm:ml-6 border-l-2 border-border pl-3 space-y-2">
                {repliesByParent.get(c.id)!.map((r) => renderComment(r, true))}
              </ul>
            ) : null}
          </div>
        </div>
      </li>
    );
  };

  return (
    <section className={cn('rounded-xl border border-border bg-card/40 p-4 md:p-6 space-y-4', className)}>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{title}</h3>
        {!loading && <span className="text-xs text-muted-foreground">({comments.length})</span>}
      </div>

      {user ? (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Napisz komentarz..."
            rows={3}
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{text.length}/2000</span>
            <Button onClick={submit} disabled={posting || text.trim().length < 2} size="sm" className="gap-1.5">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Opublikuj
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground text-center">
          <Link to="/auth" className="text-primary hover:underline">Zaloguj się</Link>, aby dodać komentarz.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : roots.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">Brak komentarzy. Bądź pierwszy!</div>
      ) : (
        <ul className="space-y-3">
          {roots.map((c) => renderComment(c, false))}
        </ul>
      )}
    </section>
  );
};
