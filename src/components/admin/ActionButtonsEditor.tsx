import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { MediaUpload } from '@/components/MediaUpload';
import { Plus, Trash2, GripVertical, ExternalLink, Link, FileText, Download } from 'lucide-react';
import { LessonActionButton } from '@/types/training';

interface ActionButtonsEditorProps {
  buttons: LessonActionButton[];
  onChange: (buttons: LessonActionButton[]) => void;
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

export const ActionButtonsEditor: React.FC<ActionButtonsEditorProps> = ({ buttons, onChange }) => {
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

  const addButton = () => {
    const newButton: LessonActionButton = {
      id: `btn-${Date.now()}`,
      label: 'Nowy przycisk',
      type: 'external',
      url: '',
      open_in_new_tab: true,
    };
    onChange([...buttons, newButton]);
  };

  const removeButton = (id: string) => {
    onChange(buttons.filter(btn => btn.id !== id));
  };

  const updateButton = (id: string, updates: Partial<LessonActionButton>) => {
    onChange(buttons.map(btn => btn.id === id ? { ...btn, ...updates } : btn));
  };

  const handleFileUploaded = (id: string, url: string, _type: string, _altText?: string) => {
    const fileName = url.split('/').pop() || 'plik';
    updateButton(id, { file_url: url, file_name: fileName });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'internal': return <Link className="h-4 w-4" />;
      case 'external': return <ExternalLink className="h-4 w-4" />;
      case 'resource': return <FileText className="h-4 w-4" />;
      case 'file': return <Download className="h-4 w-4" />;
      default: return <ExternalLink className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Przyciski akcji</Label>
        <Button type="button" variant="outline" size="sm" onClick={addButton}>
          <Plus className="h-4 w-4 mr-1" />
          Dodaj przycisk
        </Button>
      </div>

      {buttons.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Brak przycisków akcji. Kliknij "Dodaj przycisk" aby dodać.
        </p>
      ) : (
        <div className="space-y-3">
          {buttons.map((button, index) => (
            <Card key={button.id} className="relative">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <span className="text-sm font-medium">Przycisk {index + 1}</span>
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeButton(button.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tekst przycisku</Label>
                    <Input
                      value={button.label}
                      onChange={(e) => updateButton(button.id, { label: e.target.value })}
                      placeholder="Tekst na przycisku"
                    />
                  </div>
                  <div>
                    <Label>Typ linku</Label>
                    <Select
                      value={button.type}
                      onValueChange={(v) => updateButton(button.id, { type: v as LessonActionButton['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="external">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-3 w-3" />
                            Link zewnętrzny
                          </div>
                        </SelectItem>
                        <SelectItem value="internal">
                          <div className="flex items-center gap-2">
                            <Link className="h-3 w-3" />
                            Link wewnętrzny
                          </div>
                        </SelectItem>
                        <SelectItem value="resource">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            Zasób z Centrum
                          </div>
                        </SelectItem>
                        <SelectItem value="file">
                          <div className="flex items-center gap-2">
                            <Download className="h-3 w-3" />
                            Pobierz plik
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {button.type === 'external' && (
                  <div>
                    <Label>URL zewnętrzny</Label>
                    <Input
                      type="url"
                      value={button.url || ''}
                      onChange={(e) => updateButton(button.id, { url: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                )}

                {button.type === 'internal' && (
                  <div>
                    <Label>Wybierz stronę</Label>
                    <Select
                      value={button.url?.replace('/page/', '') || ''}
                      onValueChange={(v) => updateButton(button.id, { url: `/page/${v}` })}
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
                )}

                {button.type === 'resource' && (
                  <div>
                    <Label>Wybierz zasób</Label>
                    <Select
                      value={button.resource_id || ''}
                      onValueChange={(v) => updateButton(button.id, { resource_id: v })}
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
                )}

                {button.type === 'file' && (
                  <div>
                    <Label>Plik do pobrania</Label>
                    <MediaUpload
                      onMediaUploaded={(url, type, alt) => handleFileUploaded(button.id, url, type, alt)}
                      currentMediaUrl={button.file_url}
                      currentMediaType="document"
                      allowedTypes={['document', 'audio']}
                    />
                    {button.file_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Plik: {button.file_name}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={button.open_in_new_tab ?? true}
                    onCheckedChange={(checked) => updateButton(button.id, { open_in_new_tab: checked })}
                  />
                  <Label className="text-sm">Otwórz w nowej karcie</Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
