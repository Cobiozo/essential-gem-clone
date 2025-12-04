import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TestimonialEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const TestimonialEditor: React.FC<TestimonialEditorProps> = ({ item, onSave, onCancel }) => {
  const testimonialCell = (item.cells as any[])?.[0] || {};
  const [content, setContent] = useState(testimonialCell.content || '');
  const [author, setAuthor] = useState(testimonialCell.author || '');
  const [role, setRole] = useState(testimonialCell.role || '');
  const [avatar, setAvatar] = useState(testimonialCell.avatar || '');
  
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Style states
  const [textColor, setTextColor] = useState(item.text_color || '');
  const [backgroundColor, setBackgroundColor] = useState(item.background_color || '');
  const [borderRadius, setBorderRadius] = useState(item.border_radius || 8);
  const [borderWidth, setBorderWidth] = useState(item.border_width || 0);
  const [borderColor, setBorderColor] = useState(item.border_color || '');
  const [borderStyle, setBorderStyle] = useState(item.border_style || 'solid');
  const [boxShadow, setBoxShadow] = useState(item.box_shadow || '');
  const [padding, setPadding] = useState(item.padding || 16);
  const [marginTop, setMarginTop] = useState(item.margin_top || 0);
  const [marginBottom, setMarginBottom] = useState(item.margin_bottom || 0);
  
  // Advanced states
  const [hoverScale, setHoverScale] = useState(item.hover_scale || 1);
  const [hoverOpacity, setHoverOpacity] = useState(item.hover_opacity || 100);
  const [styleClass, setStyleClass] = useState(item.style_class || '');

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

  const updateCell = (updates: any) => {
    const updatedCells = [{
      type: 'testimonial',
      content,
      author,
      role,
      avatar,
      position: 0,
      is_active: true,
      ...updates
    }] as any;
    
    setEditedItem(prev => ({
      ...prev,
      cells: updatedCells
    }));
  };

  const updateItemStyle = (updates: Partial<CMSItem>) => {
    setEditedItem(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    updateCell({ content: newContent });
  };

  const handleAuthorChange = (newAuthor: string) => {
    setAuthor(newAuthor);
    updateCell({ author: newAuthor });
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    updateCell({ role: newRole });
  };

  const handleAvatarChange = (newAvatar: string) => {
    setAvatar(newAvatar);
    updateCell({ avatar: newAvatar });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja referencji
          {isSaving && <span className="text-xs text-muted-foreground">(zapisywanie...)</span>}
          {justSaved && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </h3>
        <div className="flex gap-2">
          <Button onClick={() => onSave(editedItem)} size="sm">
            Zapisz
          </Button>
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none px-4">
            <TabsTrigger value="content">Treść</TabsTrigger>
            <TabsTrigger value="style">Styl</TabsTrigger>
            <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Treść referencji</Label>
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="To jest najlepsza usługa, z jakiej korzystałem..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Autor</Label>
              <Input
                value={author}
                onChange={(e) => handleAuthorChange(e.target.value)}
                placeholder="Jan Kowalski"
              />
            </div>

            <div className="space-y-2">
              <Label>Rola / Stanowisko</Label>
              <Input
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                placeholder="CEO, Firma XYZ"
              />
            </div>

            <div className="space-y-2">
              <Label>Avatar (URL)</Label>
              <Input
                value={avatar}
                onChange={(e) => handleAvatarChange(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">Podgląd:</p>
              <div className="border rounded-lg p-4 bg-background">
                <p className="text-sm italic mb-4">"{content || 'Treść referencji...'}"</p>
                <div className="flex items-center gap-3">
                  {avatar && (
                    <img src={avatar} alt={author} className="w-12 h-12 rounded-full object-cover" />
                  )}
                  <div>
                    <div className="font-semibold">{author || 'Autor'}</div>
                    {role && <div className="text-sm text-muted-foreground">{role}</div>}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Kolor tekstu</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={textColor || '#000000'}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    updateItemStyle({ text_color: e.target.value });
                  }}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    updateItemStyle({ text_color: e.target.value });
                  }}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kolor tła</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={backgroundColor || '#ffffff'}
                  onChange={(e) => {
                    setBackgroundColor(e.target.value);
                    updateItemStyle({ background_color: e.target.value });
                  }}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => {
                    setBackgroundColor(e.target.value);
                    updateItemStyle({ background_color: e.target.value });
                  }}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zaokrąglenie rogów: {borderRadius}px</Label>
              <Slider
                value={[borderRadius]}
                onValueChange={([v]) => {
                  setBorderRadius(v);
                  updateItemStyle({ border_radius: v });
                }}
                min={0}
                max={32}
                step={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Grubość ramki: {borderWidth}px</Label>
              <Slider
                value={[borderWidth]}
                onValueChange={([v]) => {
                  setBorderWidth(v);
                  updateItemStyle({ border_width: v });
                }}
                min={0}
                max={8}
                step={1}
              />
            </div>

            {borderWidth > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Kolor ramki</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={borderColor || '#000000'}
                      onChange={(e) => {
                        setBorderColor(e.target.value);
                        updateItemStyle({ border_color: e.target.value });
                      }}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={borderColor}
                      onChange={(e) => {
                        setBorderColor(e.target.value);
                        updateItemStyle({ border_color: e.target.value });
                      }}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Styl ramki</Label>
                  <Select
                    value={borderStyle}
                    onValueChange={(v) => {
                      setBorderStyle(v);
                      updateItemStyle({ border_style: v });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Ciągła</SelectItem>
                      <SelectItem value="dashed">Kreskowana</SelectItem>
                      <SelectItem value="dotted">Kropkowana</SelectItem>
                      <SelectItem value="double">Podwójna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Cień</Label>
              <Select
                value={boxShadow || 'none'}
                onValueChange={(v) => {
                  setBoxShadow(v);
                  updateItemStyle({ box_shadow: v });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak</SelectItem>
                  <SelectItem value="0 1px 2px 0 rgba(0,0,0,0.05)">Bardzo mały</SelectItem>
                  <SelectItem value="0 1px 3px 0 rgba(0,0,0,0.1)">Mały</SelectItem>
                  <SelectItem value="0 4px 6px -1px rgba(0,0,0,0.1)">Średni</SelectItem>
                  <SelectItem value="0 10px 15px -3px rgba(0,0,0,0.1)">Duży</SelectItem>
                  <SelectItem value="0 20px 25px -5px rgba(0,0,0,0.1)">Bardzo duży</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Padding: {padding}px</Label>
              <Slider
                value={[padding]}
                onValueChange={([v]) => {
                  setPadding(v);
                  updateItemStyle({ padding: v });
                }}
                min={0}
                max={60}
                step={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Margines górny: {marginTop}px</Label>
              <Slider
                value={[marginTop]}
                onValueChange={([v]) => {
                  setMarginTop(v);
                  updateItemStyle({ margin_top: v });
                }}
                min={0}
                max={100}
                step={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Margines dolny: {marginBottom}px</Label>
              <Slider
                value={[marginBottom]}
                onValueChange={([v]) => {
                  setMarginBottom(v);
                  updateItemStyle({ margin_bottom: v });
                }}
                min={0}
                max={100}
                step={4}
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Skala przy najechaniu: {hoverScale}x</Label>
              <Slider
                value={[hoverScale * 100]}
                onValueChange={([v]) => {
                  const scale = v / 100;
                  setHoverScale(scale);
                  updateItemStyle({ hover_scale: scale });
                }}
                min={100}
                max={110}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Przezroczystość przy najechaniu: {hoverOpacity}%</Label>
              <Slider
                value={[hoverOpacity]}
                onValueChange={([v]) => {
                  setHoverOpacity(v);
                  updateItemStyle({ hover_opacity: v });
                }}
                min={50}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Własna klasa CSS</Label>
              <Input
                value={styleClass}
                onChange={(e) => {
                  setStyleClass(e.target.value);
                  updateItemStyle({ style_class: e.target.value });
                }}
                placeholder="my-custom-class"
              />
              <p className="text-xs text-muted-foreground">
                Dodatkowe klasy CSS do zastosowania
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
