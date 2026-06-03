import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Pin, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNewsHubPosts } from '@/hooks/useNewsHub';
import { PostFormDialog } from '@/components/news-hub/PostFormDialog';
import { TemplatePicker } from '@/components/news-hub/editor/TemplatePicker';
import { GridLayoutSwitcher } from '@/components/news-hub/GridLayoutSwitcher';
import { useNewsHubSettings } from '@/hooks/useNewsHubSettings';
import { NewsHubModuleVisibilityPanel } from '@/components/news-hub/NewsHubModuleVisibilityPanel';
import type { NewsHubPost } from '@/types/newsHub';
import type { NewsHubBlock } from '@/types/newsHubBlocks';
import { POST_TYPE_LABELS } from '@/types/newsHub';
import { format } from 'date-fns';

import { useModeratorAccess } from '@/hooks/useModeratorAccess';

const NewsHubAdminPage: React.FC = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { can, loading: modLoading } = useModeratorAccess();
  const { posts, loading, refresh } = useNewsHubPosts({ adminMode: true });
  const [editing, setEditing] = useState<NewsHubPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [initialBlocks, setInitialBlocks] = useState<NewsHubBlock[] | undefined>(undefined);
  const { adminLayout, saveAdminLayout } = useNewsHubSettings();

  if (authLoading || modLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin && !can('news_hub')) return <Navigate to="/dashboard" replace />;

  const togglePinned = async (p: NewsHubPost) => {
    await (supabase.from('news_hub_posts' as any) as any).update({ is_pinned: !p.is_pinned }).eq('id', p.id);
    toast.success(p.is_pinned ? 'Odpięto' : 'Przypięto');
    refresh();
  };
  const togglePublished = async (p: NewsHubPost) => {
    await (supabase.from('news_hub_posts' as any) as any).update({ is_published: !p.is_published }).eq('id', p.id);
    toast.success(p.is_published ? 'Zdezaktywowano' : 'Opublikowano');
    refresh();
  };
  const remove = async (p: NewsHubPost) => {
    if (!confirm(`Usunąć "${p.title}"?`)) return;
    await (supabase.from('news_hub_posts' as any) as any).delete().eq('id', p.id);
    toast.success('Usunięto');
    refresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/aktualnosci" className="inline-flex items-center gap-2 text-sm hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> Powrót
            </Link>
            <h1 className="text-xl font-bold">Zarządzanie aktualnościami</h1>
          </div>
          <Button onClick={() => { setEditing(null); setInitialBlocks(undefined); setShowTemplatePicker(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nowy post
          </Button>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-4">
        <NewsHubModuleVisibilityPanel />

        <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Domyślny układ listy</div>
            <div className="text-xs text-muted-foreground">Użytkownicy mogą tymczasowo przełączyć układ, ale ten jest domyślny.</div>
          </div>
          <GridLayoutSwitcher value={adminLayout} onChange={(v) => { saveAdminLayout(v); toast.success('Zapisano układ'); }} />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Brak postów. Dodaj pierwszy!</div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Tytuł</th>
                  <th className="text-left p-3">Typ</th>
                  <th className="text-left p-3">Kategoria</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/40">
                    <td className="p-3 font-medium">
                      {p.is_pinned && <Pin className="h-3 w-3 inline mr-1 text-primary" />}
                      {p.title}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">{POST_TYPE_LABELS[p.type]}</Badge>
                    </td>
                    <td className="p-3">{p.category?.name || '—'}</td>
                    <td className="p-3 text-muted-foreground">{format(new Date(p.published_at), 'dd.MM.yyyy HH:mm')}</td>
                    <td className="p-3">
                      {p.is_published ? <Badge className="bg-green-600">Opublikowany</Badge> : <Badge variant="outline">Szkic</Badge>}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => togglePinned(p)} title="Przypnij/odepnij">
                          <Pin className={`h-4 w-4 ${p.is_pinned ? 'text-primary' : ''}`} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => togglePublished(p)} title="Opublikuj/ukryj">
                          {p.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setShowForm(true); }} title="Edytuj">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(p)} title="Usuń" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <TemplatePicker
        open={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onPick={(blocks) => {
          setInitialBlocks(blocks);
          setShowTemplatePicker(false);
          setShowForm(true);
        }}
      />

      <PostFormDialog
        open={showForm}
        post={editing}
        initialBlocks={initialBlocks}
        onClose={() => { setShowForm(false); setEditing(null); setInitialBlocks(undefined); }}
        onSaved={() => { setShowForm(false); setEditing(null); setInitialBlocks(undefined); refresh(); }}
      />
    </div>
  );
};

export default NewsHubAdminPage;
