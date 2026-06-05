import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Loader2, MessageSquare, Pencil, Pin, PinOff, Send, Trash2, EyeOff, Eye, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNewsHubComments, canAuthorEditNow, EDIT_WINDOW_MS, type NewsHubComment } from '@/hooks/useNewsHubComments';
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

export const CommentsSection: React.FC<Props> = ({ postId, title = 'Komentarze', inline = false, className }) => {
  const { user, isAdmin } = useAuth();
  const canModerate = isAdmin;
  const { comments, loading, addComment, updateComment, deleteComment } = useNewsHubComments(postId, !!postId);

  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const submit = async () => {
    if (!user) return;
    setPosting(true);
    try {
      const created = await addComment(user.id, text);
      setText('');
      if (created?.is_pending_review) {
        toast.warning('Komentarz zawiera słowa wymagające moderacji i czeka na zatwierdzenie przez administratora.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Nie udało się dodać komentarza');
    } finally { setPosting(false); }
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

  return (
    <section className={cn('rounded-xl border border-border bg-card/40 p-4 md:p-6 space-y-4', className)}>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{title}</h3>
        {!loading && <span className="text-xs text-muted-foreground">({comments.length})</span>}
      </div>

      {/* Compose */}
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

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">Brak komentarzy. Bądź pierwszy!</div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const mine = user?.id === c.user_id;
            const withinWindow = canAuthorEditNow(c);
            const canEdit = (mine && withinWindow) || canModerate;
            const canDelete = (mine && withinWindow) || canModerate;
            const isEditing = editingId === c.id;
            const showPendingBanner = c.is_pending_review && (mine || canModerate);
            return (
              <li key={c.id} className={cn('rounded-lg border border-border bg-background p-3 transition-opacity', c.is_pinned && 'border-primary/50 bg-primary/5', c.is_hidden && !c.is_pending_review && 'opacity-60', c.is_pending_review && 'border-amber-500/60 bg-amber-500/5')}>
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
                      {c.is_pinned && <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5"><Pin className="h-3 w-3" /> Przypięty</span>}
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

                    {!isEditing && (canEdit || canDelete || canModerate) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {canEdit && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => { setEditingId(c.id); setEditText(c.content); }}>
                            <Pencil className="h-3 w-3" /> Edytuj
                          </Button>
                        )}
                        {canModerate && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => updateComment(c.id, { is_pinned: !c.is_pinned })}>
                              {c.is_pinned ? <><PinOff className="h-3 w-3" /> Odepnij</> : <><Pin className="h-3 w-3" /> Przypnij</>}
                            </Button>
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
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
