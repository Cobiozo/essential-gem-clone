import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNewsHubCategories, slugify, uploadNewsHubFile } from '@/hooks/useNewsHub';
import type { NewsHubPost, NewsHubPostType, NewsHubBentoSize } from '@/types/newsHub';
import type { NewsHubBlock } from '@/types/newsHubBlocks';
import { POST_TYPE_LABELS } from '@/types/newsHub';
import { PostVisibilityEditor } from './PostVisibilityEditor';

interface Props {
  open: boolean;
  post: NewsHubPost | null;
  initialBlocks?: NewsHubBlock[];
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: Partial<NewsHubPost> = {
  type: 'announcement',
  title: '',
  slug: '',
  category_id: null,
  tags: [],
  cover_url: null,
  short_description: '',
  content: '',
  media_url: null,
  media_metadata: {},
  file_url: null,
  file_name: null,
  link_url: null,
  link_cta: 'Przejdź',
  embed_html: null,
  is_pinned: false,
  is_published: true,
  bento_size: 'm',
  visibility_mode: 'public',
  visible_to_admin: true,
  visible_to_partner: true,
  visible_to_client: true,
  visible_to_specjalista: true,
};

export const PostFormDialog: React.FC<Props> = ({ open, post, initialBlocks, onClose, onSaved }) => {
  const { user } = useAuth();
  const { categories } = useNewsHubCategories();
  const [form, setForm] = useState<Partial<NewsHubPost>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState('');
  const [galleryText, setGalleryText] = useState('');

  useEffect(() => {
    if (open) {
      const init: Partial<NewsHubPost> = post
        ? post
        : { ...EMPTY, content_blocks: initialBlocks || [] };
      setForm(init);
      setTagsText((init.tags || []).join(', '));
      const gallery = Array.isArray((init as any).media_metadata?.gallery) ? (init as any).media_metadata.gallery : [];
      setGalleryText(gallery.join('\n'));
    }
  }, [open, post, initialBlocks]);

  const update = (patch: Partial<NewsHubPost>) => setForm((f) => ({ ...f, ...patch }));

  const handleUpload = async (file: File, field: 'cover_url' | 'media_url' | 'file_url') => {
    setUploading(field);
    const folder = field === 'cover_url' ? 'covers' : field === 'file_url' ? 'files' : 'media';
    const url = await uploadNewsHubFile(file, folder);
    if (url) {
      const patch: any = { [field]: url };
      if (field === 'file_url') { patch.file_name = file.name; patch.file_size = file.size; }
      update(patch);
      toast.success('Wgrano plik');
    } else {
      toast.error('Błąd uploadu');
    }
    setUploading(null);
  };

  const save = async () => {
    if (!form.title) { toast.error('Tytuł jest wymagany'); return; }
    setSaving(true);
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    const gallery = galleryText.split('\n').map((u) => u.trim()).filter(Boolean);
    const slug = form.slug?.trim() || slugify(form.title);

    const payload: any = {
      type: form.type,
      title: form.title,
      slug,
      category_id: form.category_id || null,
      tags,
      cover_url: form.cover_url || null,
      short_description: form.short_description || null,
      content: form.content || null,
      media_url: form.media_url || null,
      media_metadata: form.type === 'gallery' ? { gallery } : (form.media_metadata || {}),
      file_url: form.file_url || null,
      file_name: form.file_name || null,
      file_size: form.file_size || null,
      link_url: form.link_url || null,
      link_cta: form.link_cta || null,
      embed_html: form.embed_html || null,
      is_pinned: !!form.is_pinned,
      is_published: form.is_published !== false,
      bento_size: form.bento_size || 'm',
      content_blocks: form.content_blocks || [],
      author_id: user?.id || null,
      visibility_mode: form.visibility_mode || 'public',
      visible_to_admin: form.visible_to_admin !== false,
      visible_to_partner: form.visible_to_partner !== false,
      visible_to_client: form.visible_to_client !== false,
      visible_to_specjalista: form.visible_to_specjalista !== false,
    };

    let err: any;
    if (post) {
      const r = await (supabase.from('news_hub_posts' as any) as any).update(payload).eq('id', post.id);
      err = r.error;
    } else {
      const r = await (supabase.from('news_hub_posts' as any) as any).insert(payload);
      err = r.error;
    }
    setSaving(false);
    if (err) {
      toast.error('Błąd zapisu: ' + err.message);
    } else {
      toast.success('Zapisano');
      onSaved();
    }
  };

  const FileUpload: React.FC<{ field: 'cover_url' | 'media_url' | 'file_url'; accept?: string; current?: string | null; label: string }> = ({ field, accept, current, label }) => (
    <div>
      <Label>{label}</Label>
      {current && (
        <div className="flex items-center gap-2 mb-2 text-xs">
          {field !== 'file_url' && <img src={current} alt="" className="h-12 w-12 rounded object-cover" />}
          <span className="truncate flex-1 text-muted-foreground">{current}</span>
          <button onClick={() => update({ [field]: null } as any)} className="text-destructive"><X className="h-4 w-4" /></button>
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-muted">
        {uploading === field ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        <span>Wgraj plik</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, field); }}
        />
      </label>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Edytuj post' : 'Nowy post'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Typ</Label>
              <Select value={form.type} onValueChange={(v) => update({ type: v as NewsHubPostType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(POST_TYPE_LABELS) as NewsHubPostType[]).map((t) => (
                    <SelectItem key={t} value={t}>{POST_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategoria</Label>
              <Select value={form.category_id || 'none'} onValueChange={(v) => update({ category_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— brak —</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tytuł</Label>
            <Input value={form.title || ''} onChange={(e) => update({ title: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Slug (URL)</Label>
              <Input value={form.slug || ''} onChange={(e) => update({ slug: e.target.value })} placeholder={slugify(form.title || '')} />
            </div>
            <div>
              <Label>Rozmiar w siatce</Label>
              <Select value={form.bento_size} onValueChange={(v) => update({ bento_size: v as NewsHubBentoSize })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="s">Mały</SelectItem>
                  <SelectItem value="m">Średni</SelectItem>
                  <SelectItem value="l">Duży</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Krótki opis</Label>
            <Textarea value={form.short_description || ''} onChange={(e) => update({ short_description: e.target.value })} rows={2} />
          </div>

          <FileUpload field="cover_url" accept="image/*" current={form.cover_url} label="Okładka (opcjonalnie)" />

          {/* Type-specific */}
          {(form.type === 'announcement' || form.type === 'article') && (
            <div>
              <Label>Treść (Markdown / tekst)</Label>
              <Textarea value={form.content || ''} onChange={(e) => update({ content: e.target.value })} rows={10} />
            </div>
          )}

          {form.type === 'video' && (
            <div>
              <Label>URL wideo (YouTube/Vimeo/MP4)</Label>
              <Input value={form.media_url || ''} onChange={(e) => update({ media_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
              <p className="text-xs text-muted-foreground mt-1">lub wgraj plik MP4 poniżej</p>
              <FileUpload field="media_url" accept="video/*" current={null} label="" />
            </div>
          )}

          {form.type === 'gallery' && (
            <div>
              <Label>Zdjęcia (jeden URL w linii)</Label>
              <Textarea value={galleryText} onChange={(e) => setGalleryText(e.target.value)} rows={6} placeholder="https://...\nhttps://..." />
              <p className="text-xs text-muted-foreground mt-1">Wgraj zdjęcia w sekcji okładki i wklej URLe tutaj.</p>
            </div>
          )}

          {form.type === 'file' && (
            <FileUpload field="file_url" current={form.file_url} label="Plik do pobrania" />
          )}

          {form.type === 'link' && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>URL linku</Label>
                <Input value={form.link_url || ''} onChange={(e) => update({ link_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Tekst przycisku (CTA)</Label>
                <Input value={form.link_cta || ''} onChange={(e) => update({ link_cta: e.target.value })} placeholder="Dowiedz się więcej" />
              </div>
            </div>
          )}

          {form.type === 'embed' && (
            <div>
              <Label>Kod HTML embed (iframe, social itp.)</Label>
              <Textarea value={form.embed_html || ''} onChange={(e) => update({ embed_html: e.target.value })} rows={6} className="font-mono text-xs" />
            </div>
          )}

          <div>
            <Label>Tagi (oddzielone przecinkami)</Label>
            <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="tag1, tag2" />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.is_pinned} onCheckedChange={(v) => update({ is_pinned: v })} />
              Przypnij
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.is_published !== false} onCheckedChange={(v) => update({ is_published: v })} />
              Opublikowany
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Anuluj</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Zapisz
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
