import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNewsHubCategories, slugify } from '@/hooks/useNewsHub';
import type { NewsHubPost, NewsHubPostType, NewsHubBentoSize } from '@/types/newsHub';
import { POST_TYPE_LABELS } from '@/types/newsHub';

interface Props {
  draft: Partial<NewsHubPost>;
  update: (patch: Partial<NewsHubPost>) => void;
  tagsText: string;
  setTagsText: (s: string) => void;
}

export const MetaControls: React.FC<Props> = ({ draft, update, tagsText, setTagsText }) => {
  const { categories } = useNewsHubCategories();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Typ</Label>
          <Select value={draft.type} onValueChange={(v) => update({ type: v as NewsHubPostType })}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(POST_TYPE_LABELS) as NewsHubPostType[]).map((t) => (
                <SelectItem key={t} value={t}>{POST_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Kategoria</Label>
          <Select value={draft.category_id || 'none'} onValueChange={(v) => update({ category_id: v === 'none' ? null : v })}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— brak —</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Slug (URL)</Label>
        <Input value={draft.slug || ''} onChange={(e) => update({ slug: e.target.value })} placeholder={slugify(draft.title || '')} className="h-9 text-xs" />
      </div>

      <div>
        <Label className="text-xs">Tagi (po przecinku)</Label>
        <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="promocja, nowość" className="h-9 text-xs" />
      </div>

      <div>
        <Label className="text-xs">Rozmiar w siatce</Label>
        <Select value={draft.bento_size} onValueChange={(v) => update({ bento_size: v as NewsHubBentoSize })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="s">Mały</SelectItem>
            <SelectItem value="m">Średni</SelectItem>
            <SelectItem value="l">Duży</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-6 pt-2">
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={!!draft.is_pinned} onCheckedChange={(v) => update({ is_pinned: v })} />
          Przypnij
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={draft.is_published !== false} onCheckedChange={(v) => update({ is_published: v })} />
          Opublikowany
        </label>
      </div>
    </div>
  );
};
