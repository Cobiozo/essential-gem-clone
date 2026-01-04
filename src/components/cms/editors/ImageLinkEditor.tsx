import React, { useState, useEffect } from 'react';
import { CMSItem } from '@/types/cms';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaUpload } from '@/components/MediaUpload';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Link, FileText } from 'lucide-react';

interface ImageLinkEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

interface KnowledgeResource {
  id: string;
  title: string;
  source_url: string | null;
}

interface Page {
  id: string;
  title: string;
  slug: string;
}

export const ImageLinkEditor: React.FC<ImageLinkEditorProps> = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    media_url: item.media_url || '',
    media_alt_text: item.media_alt_text || '',
    link_type: (item.cells as any)?.link_type || 'external',
    link_url: item.url || '',
    resource_id: (item.cells as any)?.resource_id || '',
    page_slug: (item.cells as any)?.page_slug || '',
    open_in_new_tab: (item.cells as any)?.open_in_new_tab ?? true,
    border_radius: item.border_radius || 8,
    max_width: item.max_width || undefined,
  });

  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchResources(), fetchPages()]).finally(() => setLoading(false));
  }, []);

  const fetchResources = async () => {
    const { data } = await supabase
      .from('knowledge_resources')
      .select('id, title, source_url')
      .eq('status', 'active')
      .order('title');
    if (data) setResources(data);
  };

  const fetchPages = async () => {
    const { data } = await supabase
      .from('pages')
      .select('id, title, slug')
      .eq('is_published', true)
      .order('title');
    if (data) setPages(data);
  };

  const handleMediaUploaded = (url: string, type: string, altText?: string) => {
    setFormData(prev => ({
      ...prev,
      media_url: url,
      media_alt_text: altText || prev.media_alt_text
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalUrl = formData.link_url;
    if (formData.link_type === 'internal' && formData.page_slug) {
      finalUrl = `/page/${formData.page_slug}`;
    }

    onSave({
      ...item,
      media_url: formData.media_url,
      media_type: 'image',
      media_alt_text: formData.media_alt_text,
      url: finalUrl,
      border_radius: formData.border_radius,
      max_width: formData.max_width,
      cells: {
        link_type: formData.link_type,
        resource_id: formData.link_type === 'resource' ? formData.resource_id : null,
        page_slug: formData.link_type === 'internal' ? formData.page_slug : null,
        open_in_new_tab: formData.open_in_new_tab,
      } as any
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Obrazek</Label>
          <MediaUpload
            onMediaUploaded={handleMediaUploaded}
            currentMediaUrl={formData.media_url}
            currentMediaType="image"
            currentAltText={formData.media_alt_text}
            allowedTypes={['image']}
          />
        </div>

        <div>
          <Label htmlFor="alt_text">Tekst alternatywny (alt)</Label>
          <Input
            id="alt_text"
            value={formData.media_alt_text}
            onChange={(e) => setFormData(prev => ({ ...prev, media_alt_text: e.target.value }))}
            placeholder="Opis obrazka dla dostępności"
          />
        </div>
      </div>

      <Tabs value={formData.link_type} onValueChange={(v) => setFormData(prev => ({ ...prev, link_type: v }))}>
        <Label className="text-base font-semibold mb-2 block">Typ linku</Label>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="external" className="flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Zewnętrzny
          </TabsTrigger>
          <TabsTrigger value="internal" className="flex items-center gap-1">
            <Link className="h-3 w-3" />
            Wewnętrzny
          </TabsTrigger>
          <TabsTrigger value="resource" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Zasób
          </TabsTrigger>
        </TabsList>

        <TabsContent value="external" className="mt-4">
          <div>
            <Label htmlFor="external_url">URL zewnętrzny</Label>
            <Input
              id="external_url"
              type="url"
              value={formData.link_url}
              onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
        </TabsContent>

        <TabsContent value="internal" className="mt-4">
          <div>
            <Label>Wybierz stronę</Label>
            <Select
              value={formData.page_slug}
              onValueChange={(v) => setFormData(prev => ({ ...prev, page_slug: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz stronę..." />
              </SelectTrigger>
              <SelectContent>
                {pages.map(page => (
                  <SelectItem key={page.id} value={page.slug}>
                    {page.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="resource" className="mt-4">
          <div>
            <Label>Wybierz zasób z Centrum Zasobów</Label>
            <Select
              value={formData.resource_id}
              onValueChange={(v) => setFormData(prev => ({ ...prev, resource_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz zasób..." />
              </SelectTrigger>
              <SelectContent>
                {resources.map(resource => (
                  <SelectItem key={resource.id} value={resource.id}>
                    {resource.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center space-x-2">
        <Switch
          id="new_tab"
          checked={formData.open_in_new_tab}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, open_in_new_tab: checked }))}
        />
        <Label htmlFor="new_tab">Otwórz w nowej karcie</Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="border_radius">Zaokrąglenie (px)</Label>
          <Input
            id="border_radius"
            type="number"
            min="0"
            value={formData.border_radius}
            onChange={(e) => setFormData(prev => ({ ...prev, border_radius: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <Label htmlFor="max_width">Maks. szerokość (px)</Label>
          <Input
            id="max_width"
            type="number"
            min="0"
            value={formData.max_width || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, max_width: e.target.value ? parseInt(e.target.value) : undefined }))}
            placeholder="Auto"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit">Zapisz</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </form>
  );
};
