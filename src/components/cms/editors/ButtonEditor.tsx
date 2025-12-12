import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { IconPicker } from '../IconPicker';
import { AdvancedStyleTab } from './AdvancedStyleTab';
import * as icons from 'lucide-react';

interface ButtonEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

interface Page {
  id: string;
  title: string;
  slug: string;
}

export const ButtonEditor: React.FC<ButtonEditorProps> = ({ item, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));
  const [linkType, setLinkType] = useState<'external' | 'internal' | 'custom'>('external');
  const [pages, setPages] = useState<Page[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [iconSize, setIconSize] = useState((item as any).icon_size || 16);
  const [iconSpacing, setIconSpacing] = useState((item as any).icon_spacing || 8);

  // Fetch pages for internal link selection
  useEffect(() => {
    const fetchPages = async () => {
      const { data } = await supabase
        .from('pages')
        .select('id, title, slug')
        .eq('is_published', true)
        .eq('is_active', true)
        .order('position');
      if (data) setPages(data);
    };
    fetchPages();
  }, []);

  // Determine initial link type based on URL
  useEffect(() => {
    const url = item.url || '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      setLinkType('external');
    } else if (url.startsWith('/page/') && pages.some(p => `/page/${p.slug}` === url)) {
      setLinkType('internal');
    } else if (url.startsWith('/')) {
      setLinkType('custom');
    }
  }, [item.url, pages]);

  // Auto-save on debounced changes
  useEffect(() => {
    const debouncedItemString = JSON.stringify(debouncedItem);
    if (debouncedItem && debouncedItemString !== prevItemRef.current) {
      setIsSaving(true);
      onSave(debouncedItem);
      prevItemRef.current = debouncedItemString;
      
      setTimeout(() => {
        setIsSaving(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }, 300);
    }
  }, [debouncedItem, onSave]);

  const handleLinkTypeChange = (newType: 'external' | 'internal' | 'custom') => {
    setLinkType(newType);
    // Clear URL when changing type
    setEditedItem({ ...editedItem, url: '' });
  };

  const validateUrl = (url: string, type: 'external' | 'internal' | 'custom'): boolean => {
    if (!url) return false;
    if (type === 'external') {
      return url.startsWith('http://') || url.startsWith('https://');
    }
    if (type === 'internal' || type === 'custom') {
      return url.startsWith('/');
    }
    return false;
  };

  const isUrlValid = validateUrl(editedItem.url || '', linkType);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Edytuj Przycisk</h3>
          {isSaving && <span className="text-xs text-muted-foreground">Zapisywanie...</span>}
          {justSaved && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3" />
              <span>Zapisano</span>
            </div>
          )}
        </div>
        <Button onClick={onCancel} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
          <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Tekst przycisku</Label>
            <Input
              value={editedItem.cells?.[0]?.content || editedItem.title || ''}
              onChange={(e) => {
                console.log('🟢 Button text changed to:', e.target.value);
                
                const existingCells = (editedItem.cells || [{ type: 'btn', content: '', url: '' }]) as any[];
                const newCells = [...existingCells];
                newCells[0] = { 
                  ...(newCells[0] || {}), 
                  content: e.target.value, 
                  type: 'btn',
                  url: newCells[0]?.url || '' // Zachowaj URL
                };
                
                console.log('✅ Updated button cells:', newCells);
                setEditedItem({ ...editedItem, title: e.target.value, cells: newCells });
              }}
              placeholder="Nasz sklep"
            />
              </div>

              <div className="space-y-3">
                <Label>Rodzaj linku</Label>
                <RadioGroup value={linkType} onValueChange={handleLinkTypeChange}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="external" id="external" />
                    <Label htmlFor="external" className="font-normal cursor-pointer">
                      Link zewnętrzny (http/https)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="internal" id="internal" />
                    <Label htmlFor="internal" className="font-normal cursor-pointer">
                      Strona wewnętrzna (wybierz z listy)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="font-normal cursor-pointer">
                      Ścieżka niestandardowa (np. /kontakt)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {linkType === 'internal' && (
                <div className="space-y-2">
                  <Label>Wybierz stronę</Label>
                  <Select 
                    value={editedItem.cells?.[0]?.url?.replace('/page/', '') || editedItem.url?.replace('/page/', '') || ''}
                    onValueChange={(slug) => {
                      console.log('🟢 Internal page selected:', slug);
                      
                      const existingCells = (editedItem.cells || [{ type: 'btn', content: '', url: '' }]) as any[];
                      const newCells = [...existingCells];
                      newCells[0] = { 
                        ...(newCells[0] || {}), 
                        url: `/page/${slug}`, 
                        type: 'btn',
                        content: newCells[0]?.content || '' // Zachowaj content
                      };
                      
                      console.log('✅ Updated button cells with internal URL:', newCells);
                      setEditedItem({...editedItem, url: `/page/${slug}`, cells: newCells});
                    }}
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
                  {pages.length === 0 && (
                    <p className="text-xs text-muted-foreground">Brak opublikowanych stron</p>
                  )}
                </div>
              )}

              {linkType === 'external' && (
                <div className="space-y-2">
                  <Label>URL zewnętrzny</Label>
                  <Input 
                    value={editedItem.cells?.[0]?.url || editedItem.url || ''} 
                    onChange={(e) => {
                      console.log('🟢 External URL changed to:', e.target.value);
                      
                      const existingCells = (editedItem.cells || [{ type: 'btn', content: '', url: '' }]) as any[];
                      const newCells = [...existingCells];
                      newCells[0] = { 
                        ...(newCells[0] || {}), 
                        url: e.target.value, 
                        type: 'btn',
                        content: newCells[0]?.content || '' // Zachowaj content
                      };
                      
                      console.log('✅ Updated button cells with external URL:', newCells);
                      setEditedItem({...editedItem, url: e.target.value, cells: newCells});
                    }}
                    placeholder="https://example.com"
                  />
                  {editedItem.url && !isUrlValid && (
                    <p className="text-xs text-destructive">
                      URL musi zaczynać się od http:// lub https://
                    </p>
                  )}
                </div>
              )}

              {linkType === 'custom' && (
                <div className="space-y-2">
                  <Label>Ścieżka niestandardowa</Label>
                  <Input 
                    value={editedItem.cells?.[0]?.url || editedItem.url || ''} 
                    onChange={(e) => {
                      console.log('🟢 Custom path changed to:', e.target.value);
                      
                      const existingCells = (editedItem.cells || [{ type: 'btn', content: '', url: '' }]) as any[];
                      const newCells = [...existingCells];
                      newCells[0] = { 
                        ...(newCells[0] || {}), 
                        url: e.target.value, 
                        type: 'btn',
                        content: newCells[0]?.content || '' // Zachowaj content
                      };
                      
                      console.log('✅ Updated button cells with custom path:', newCells);
                      setEditedItem({...editedItem, url: e.target.value, cells: newCells});
                    }}
                    placeholder="/kontakt"
                  />
                  {editedItem.url && !isUrlValid && (
                    <p className="text-xs text-destructive">
                      Ścieżka musi zaczynać się od /
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Wyrównanie</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">←</Button>
                  <Button variant="outline" size="sm">↔</Button>
                  <Button variant="outline" size="sm">→</Button>
                  <Button variant="outline" size="sm">☰</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ikona</Label>
                <IconPicker
                  value={editedItem.icon}
                  onChange={(iconName) => setEditedItem({ ...editedItem, icon: iconName })}
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      {editedItem.icon ? (
                        <>
                          {(() => {
                            const IconComp = (icons as any)[editedItem.icon];
                            return IconComp ? <IconComp className="w-4 h-4 mr-2" /> : null;
                          })()}
                          <span>{editedItem.icon}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Wybierz ikonę...</span>
                      )}
                    </Button>
                  }
                />
              </div>

              {editedItem.icon && (
                <>
                  <div className="space-y-2">
                    <Label>Pozycja ikony</Label>
                    <Select
                      value={(editedItem as any).icon_position || 'before'}
                      onValueChange={(value) => setEditedItem({ ...editedItem, icon_position: value } as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before">Przed tekstem</SelectItem>
                        <SelectItem value="after">Po tekście</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Rozmiar ikony (px)</Label>
                    <div className="flex gap-2 items-center">
                      <Slider
                        value={[iconSize]}
                        onValueChange={([value]) => {
                          setIconSize(value);
                          setEditedItem({ ...editedItem, icon_size: value } as any);
                        }}
                        min={12}
                        max={64}
                        step={2}
                        className="flex-1"
                      />
                      <span className="text-sm w-12">{iconSize}px</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Odstęp ikony (px)</Label>
                    <div className="flex gap-2 items-center">
                      <Slider
                        value={[iconSpacing]}
                        onValueChange={([value]) => {
                          setIconSpacing(value);
                          setEditedItem({ ...editedItem, icon_spacing: value } as any);
                        }}
                        min={0}
                        max={50}
                        step={2}
                        className="flex-1"
                      />
                      <span className="text-sm w-12">{iconSpacing}px</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="pb-4">
              <AdvancedStyleTab 
                item={editedItem} 
                onUpdate={(updates) => setEditedItem({ ...editedItem, ...updates })} 
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="advanced" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Cel linku</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={(editedItem as any).target === '_blank'}
                    onCheckedChange={(checked) => 
                      setEditedItem({ ...editedItem, target: checked ? '_blank' : '_self' } as any)
                    }
                  />
                  <Label className="font-normal">Otwórz w nowej karcie</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rel Attribute</Label>
                <Input
                  value={(editedItem as any).rel || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, rel: e.target.value } as any)}
                  placeholder="np. nofollow noopener"
                />
                <p className="text-xs text-muted-foreground">
                  Dodaj atrybuty rel dla SEO (np. nofollow, noopener, noreferrer)
                </p>
              </div>

              <div className="space-y-2">
                <Label>ID elementu</Label>
                <Input
                  value={(editedItem as any).html_id || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, html_id: e.target.value } as any)}
                  placeholder="custom-button-id"
                />
                <p className="text-xs text-muted-foreground">
                  Niestandardowy ID HTML dla tego przycisku
                </p>
              </div>

              <div className="space-y-2">
                <Label>ARIA Label</Label>
                <Input
                  value={(editedItem as any).aria_label || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, aria_label: e.target.value } as any)}
                  placeholder="Opis dla czytników ekranu"
                />
                <p className="text-xs text-muted-foreground">
                  Popraw dostępność - etykieta dla technologii asystujących
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};