import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEditingSafe } from '@/contexts/EditingContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { slugify } from '@/hooks/useNewsHub';

import { TextStyleControls } from './editor/StyleControls';
import { CoverControls } from './editor/CoverControls';
import { PageStyleControls } from './editor/PageStyleControls';
import { MediaControls } from './editor/MediaControls';
import { MetaControls } from './editor/MetaControls';
import { BlockListEditor } from './editor/BlockListEditor';
import type { NewsHubPost, NewsHubStyleOverrides } from '@/types/newsHub';
import type { NewsHubBlock } from '@/types/newsHubBlocks';
import { makeBlockId } from '@/types/newsHubBlocks';

interface Props {
  post: NewsHubPost;
  draft: NewsHubPost;
  setDraft: React.Dispatch<React.SetStateAction<NewsHubPost>>;
  onClose: (saved: boolean, newSlug?: string) => void;
}

export const PostInlineEditor: React.FC<Props> = ({ post, draft, setDraft, onClose }) => {
  const { user } = useAuth();
  const { registerEdit } = useEditingSafe();
  const [saving, setSaving] = useState(false);
  const [tagsText, setTagsText] = useState((draft.tags || []).join(', '));

  const dirty = useMemo(() => JSON.stringify(post) !== JSON.stringify(draft) || tagsText !== (post.tags || []).join(', '), [post, draft, tagsText]);

  // Register edit state (blocks silent re-renders / session updates)
  useEffect(() => {
    const release = registerEdit();
    return release;
  }, [registerEdit]);

  // Warn before unload if dirty
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const update = (patch: Partial<NewsHubPost>) => setDraft((d) => ({ ...d, ...patch }));
  const updateStyle = (patch: NewsHubStyleOverrides) => setDraft((d) => ({ ...d, style_overrides: { ...(d.style_overrides || {}), ...patch } }));

  const close = () => {
    if (dirty && !confirm('Porzucić niezapisane zmiany?')) return;
    onClose(false);
  };

  const save = async () => {
    if (!draft.title?.trim()) { toast.error('Tytuł jest wymagany'); return; }
    setSaving(true);
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    const slug = draft.slug?.trim() || slugify(draft.title);
    const payload: any = {
      type: draft.type,
      title: draft.title,
      slug,
      category_id: draft.category_id || null,
      tags,
      cover_url: draft.cover_url || null,
      short_description: draft.short_description || null,
      content: draft.content || null,
      media_url: draft.media_url || null,
      media_metadata: draft.media_metadata || {},
      file_url: draft.file_url || null,
      file_name: draft.file_name || null,
      file_size: draft.file_size || null,
      link_url: draft.link_url || null,
      link_cta: draft.link_cta || null,
      embed_html: draft.embed_html || null,
      is_pinned: !!draft.is_pinned,
      is_published: draft.is_published !== false,
      bento_size: draft.bento_size || 'm',
      style_overrides: draft.style_overrides || {},
      content_blocks: draft.content_blocks || [],
      author_id: draft.author_id || user?.id || null,
    };
    const { error } = await (supabase.from('news_hub_posts' as any) as any).update(payload).eq('id', post.id);
    setSaving(false);
    if (error) { toast.error('Błąd zapisu: ' + error.message); return; }
    toast.success('Zapisano');
    onClose(true, slug);
  };

  const remove = async () => {
    if (!confirm(`Usunąć "${post.title}"? Tej operacji nie można cofnąć.`)) return;
    const { error } = await (supabase.from('news_hub_posts' as any) as any).delete().eq('id', post.id);
    if (error) { toast.error('Błąd: ' + error.message); return; }
    toast.success('Usunięto');
    window.location.href = '/aktualnosci';
  };

  const styles = draft.style_overrides || {};

  return (
    <aside className="fixed top-0 right-0 bottom-0 z-50 w-full md:w-[480px] bg-card border-l border-border shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Edycja postu</div>
          <div className="text-sm font-semibold truncate max-w-[300px]">{draft.title || '(bez tytułu)'}</div>
        </div>
        <button onClick={close} className="rounded-md p-1.5 hover:bg-muted" aria-label="Zamknij">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-4 mx-3 mt-3">
          <TabsTrigger value="content" className="text-xs">Treść</TabsTrigger>
          <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
          <TabsTrigger value="design" className="text-xs">Wygląd</TabsTrigger>
          <TabsTrigger value="meta" className="text-xs">Meta</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <TabsContent value="content" className="m-0 space-y-4">
            <div>
              <Label className="text-xs">Tytuł</Label>
              <Input value={draft.title || ''} onChange={(e) => update({ title: e.target.value })} className="text-base font-bold" />
            </div>
            <TextStyleControls
              label="Styl tytułu"
              value={styles.title}
              onChange={(v) => updateStyle({ title: v })}
              defaultSize={36}
              withWeight
            />

            <div>
              <Label className="text-xs">Krótki opis (lead)</Label>
              <Textarea value={draft.short_description || ''} onChange={(e) => update({ short_description: e.target.value })} rows={3} />
            </div>
            <TextStyleControls
              label="Styl opisu"
              value={styles.shortDescription}
              onChange={(v) => updateStyle({ shortDescription: v })}
              defaultSize={18}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Treść (bloki)</Label>
                {(!draft.content_blocks || draft.content_blocks.length === 0) && draft.content && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      const isHtml = /<\/?(p|div|h[1-6]|ul|ol|li|strong|em|u|s|a|br|img|hr|blockquote|span)\b/i.test(draft.content || '');
                      const block: NewsHubBlock = isHtml
                        ? { id: makeBlockId(), type: 'legacy_html', data: { html: draft.content } }
                        : { id: makeBlockId(), type: 'paragraph', data: { html: `<p>${(draft.content || '').replace(/\n/g, '<br/>')}</p>` } };
                      update({ content_blocks: [block] });
                    }}
                  >
                    Konwertuj starą treść
                  </Button>
                )}
              </div>
              <BlockListEditor
                value={draft.content_blocks || []}
                onChange={(blocks) => update({ content_blocks: blocks })}
              />
            </div>
          </TabsContent>

          <TabsContent value="media" className="m-0 space-y-4">
            <CoverControls
              coverUrl={draft.cover_url}
              onCoverUrl={(url) => update({ cover_url: url })}
              style={styles.cover}
              onStyle={(v) => updateStyle({ cover: v })}
            />
            <MediaControls draft={draft} update={update} />
          </TabsContent>

          <TabsContent value="design" className="m-0 space-y-4">
            <PageStyleControls value={styles.page} onChange={(v) => updateStyle({ page: v })} />
          </TabsContent>

          <TabsContent value="meta" className="m-0">
            <MetaControls draft={draft} update={update} tagsText={tagsText} setTagsText={setTagsText} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="border-t border-border bg-card px-4 py-3 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={remove} className="text-destructive gap-1.5">
          <Trash2 className="h-4 w-4" /> Usuń
        </Button>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-500">Niezapisane</span>}
          <Button variant="outline" size="sm" onClick={close} disabled={saving}>Anuluj</Button>
          <Button size="sm" onClick={save} disabled={saving || !dirty} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Zapisz
          </Button>
        </div>
      </div>
    </aside>
  );
};
