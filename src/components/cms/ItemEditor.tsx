import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit3, Save, X, Plus, Palette, Type, Image, Video, Link2, Eye, EyeOff, GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { MediaUpload } from '@/components/MediaUpload';
import { SecureMedia } from '@/components/SecureMedia';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ContentCell, CMSItem } from '@/types/cms';

interface ItemEditorProps {
  item?: CMSItem;
  sectionId: string;
  onSave: (item: CMSItem) => void;
  onCancel?: () => void;
  isNew?: boolean;
  trigger?: React.ReactNode;
}

export const ItemEditor: React.FC<ItemEditorProps> = ({
  item,
  sectionId,
  onSave,
  onCancel,
  isNew = false,
  trigger
}) => {
  const [editedItem, setEditedItem] = useState<CMSItem>(
    item || {
      id: '',
      section_id: sectionId,
      type: 'button',
      title: '',
      description: '',
      url: '',
      icon: '',
      position: 1,
      is_active: true,
      media_url: '',
      media_type: '',
      media_alt_text: '',
      background_color: 'hsl(var(--primary))',
      text_color: 'hsl(var(--primary-foreground))',
      font_size: 16,
      font_weight: '400',
      border_radius: 8,
      padding: 12,
      style_class: '',
      cells: [],
      // Extended typography
      font_family: 'inherit',
      line_height: 1.5,
      letter_spacing: 0,
      text_transform: 'none',
      text_align: 'left',
      font_style: 'normal',
      text_decoration: 'none',
      title_formatting: null,
      description_formatting: null
    }
  );

  const [isOpen, setIsOpen] = useState(false);

  const itemTypes = [
    { value: 'button', label: 'Przycisk', icon: '🔘' },
    { value: 'link', label: 'Link', icon: '🔗' },
    { value: 'text', label: 'Tekst', icon: '📝' },
    { value: 'media', label: 'Media', icon: '🖼️' },
    { value: 'card', label: 'Karta', icon: '🃏' },
    { value: 'badge', label: 'Odznaka', icon: '🏷️' },
    { value: 'multi_cell', label: 'Wiele komórek', icon: '📊' }
  ];

  const fontWeights = [
    { value: '300', label: 'Lekka (300)' },
    { value: '400', label: 'Normalna (400)' },
    { value: '500', label: 'Średnia (500)' },
    { value: '600', label: 'Półgruba (600)' },
    { value: '700', label: 'Gruba (700)' },
    { value: '800', label: 'Bardzo gruba (800)' }
  ];

  const fontFamilies = [
    { value: 'inherit', label: 'Domyślna (dziedziczona)' },
    { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
    { value: 'Roboto, sans-serif', label: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap' },
    { value: 'Open Sans, sans-serif', label: 'Open Sans', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap' },
    { value: 'Lato, sans-serif', label: 'Lato', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap' },
    { value: 'Poppins, sans-serif', label: 'Poppins', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap' },
    { value: 'Montserrat, sans-serif', label: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap' },
    { value: 'Nunito, sans-serif', label: 'Nunito', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap' },
    { value: 'Source Sans Pro, sans-serif', label: 'Source Sans Pro', url: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap' },
    { value: 'Playfair Display, serif', label: 'Playfair Display', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap' },
    { value: 'Merriweather, serif', label: 'Merriweather', url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap' },
    { value: 'Lora, serif', label: 'Lora', url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap' },
    { value: 'Georgia, serif', label: 'Georgia (systemowa)' },
    { value: 'Times New Roman, serif', label: 'Times New Roman (systemowa)' },
    { value: 'Arial, sans-serif', label: 'Arial (systemowa)' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica (systemowa)' },
    { value: 'JetBrains Mono, monospace', label: 'JetBrains Mono', url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap' },
    { value: 'Fira Code, monospace', label: 'Fira Code', url: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;700&display=swap' },
    { value: 'Courier New, monospace', label: 'Courier New (systemowa)' }
  ];

  const textTransformOptions = [
    { value: 'none', label: 'Bez zmian' },
    { value: 'uppercase', label: 'WIELKIE LITERY' },
    { value: 'lowercase', label: 'małe litery' },
    { value: 'capitalize', label: 'Pierwsza Wielka' }
  ];

  const textAlignOptions = [
    { value: 'left', label: 'Do lewej' },
    { value: 'center', label: 'Do środka' },
    { value: 'right', label: 'Do prawej' },
    { value: 'justify', label: 'Justuj' }
  ];

  const fontStyleOptions = [
    { value: 'normal', label: 'Normalna' },
    { value: 'italic', label: 'Kursywa' }
  ];

  const textDecorationOptions = [
    { value: 'none', label: 'Brak' },
    { value: 'underline', label: 'Podkreślenie' },
    { value: 'line-through', label: 'Przekreślenie' },
    { value: 'overline', label: 'Nadkreślenie' }
  ];

  const backgroundPresets = [
    { name: 'Podstawowy', color: 'hsl(var(--primary))' },
    { name: 'Pomocniczy', color: 'hsl(var(--secondary))' },
    { name: 'Akcentowy', color: 'hsl(var(--accent))' },
    { name: 'Przezroczysty', color: 'transparent' },
    { name: 'Biały', color: 'hsl(0 0% 100%)' },
    { name: 'Szary', color: 'hsl(0 0% 90%)' }
  ];

  const loadGoogleFont = (fontFamily: string) => {
    const selectedFont = fontFamilies.find(f => f.value === fontFamily);
    if (selectedFont?.url) {
      const existingLink = document.head.querySelector(`link[href="${selectedFont.url}"]`);
      if (!existingLink) {
        const link = document.createElement('link');
        link.href = selectedFont.url;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
    }
  };

  const handleSave = () => {
    onSave(editedItem);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setEditedItem(item || {
      section_id: sectionId,
      type: 'button',
      title: '',
      description: '',
      url: '',
      icon: '',
      position: 1,
      is_active: true,
      media_url: '',
      media_type: '',
      media_alt_text: '',
      background_color: 'hsl(var(--primary))',
      text_color: 'hsl(var(--primary-foreground))',
      font_size: 16,
      font_weight: '400',
      border_radius: 8,
      padding: 12,
      style_class: '',
      cells: [],
      // Extended typography
      font_family: 'inherit',
      line_height: 1.5,
      letter_spacing: 0,
      text_transform: 'none',
      text_align: 'left',
      font_style: 'normal',
      text_decoration: 'none',
      title_formatting: null,
      description_formatting: null
    });
    setIsOpen(false);
    onCancel?.();
  };

  const addEmojiToTitle = (emoji: string) => {
    setEditedItem({
      ...editedItem,
      title: (editedItem.title || '') + emoji
    });
  };

  const addEmojiToDescription = (emoji: string) => {
    setEditedItem({
      ...editedItem,
      description: (editedItem.description || '') + emoji
    });
  };

  const handleMediaUpload = (url: string, type: 'image' | 'video', altText?: string) => {
    setEditedItem({
      ...editedItem,
      media_url: url,
      media_type: type,
      media_alt_text: altText || ''
    });
  };

  const editorContent = (
    <div className="space-y-6 p-1">
      {/* Type Selection */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Typ elementu</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {itemTypes.map((type) => (
            <Button
              key={type.value}
              variant={editedItem.type === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setEditedItem({...editedItem, type: type.value})}
              className="justify-start"
            >
              <span className="mr-2">{type.icon}</span>
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="item-title" className="text-sm font-medium">
            Tytuł
          </Label>
          <div className="flex space-x-2 mt-1">
            <Input
              id="item-title"
              value={editedItem.title || ''}
              onChange={(e) => setEditedItem({...editedItem, title: e.target.value})}
              placeholder="Tytuł elementu"
            />
            <EmojiPicker 
              onEmojiSelect={addEmojiToTitle}
              trigger={
                <Button variant="outline" size="icon" type="button">
                  😀
                </Button>
              }
            />
          </div>
        </div>

        {/* Title Typography Settings */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <Label className="text-sm font-medium mb-3 block">Formatowanie tytułu:</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Rozmiar czcionki tytułu</Label>
              <Select 
                value={(editedItem.title_formatting?.fontSize || editedItem.font_size || 16).toString()}
                onValueChange={(value) => setEditedItem({
                  ...editedItem,
                  title_formatting: {
                    ...editedItem.title_formatting,
                    fontSize: parseInt(value)
                  }
                })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="14">14px</SelectItem>
                  <SelectItem value="16">16px</SelectItem>
                  <SelectItem value="18">18px</SelectItem>
                  <SelectItem value="20">20px</SelectItem>
                  <SelectItem value="24">24px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Grubość tytułu</Label>
              <Select 
                value={editedItem.title_formatting?.fontWeight || editedItem.font_weight || '400'}
                onValueChange={(value) => setEditedItem({
                  ...editedItem,
                  title_formatting: {
                    ...editedItem.title_formatting,
                    fontWeight: value
                  }
                })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {fontWeights.map((weight) => (
                    <SelectItem key={weight.value} value={weight.value}>
                      {weight.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="item-description" className="text-sm font-medium">
            Opis (Rich Text Editor)
          </Label>
          <RichTextEditor
            value={editedItem.description || ''}
            onChange={(value) => setEditedItem({...editedItem, description: value})}
            formatting={editedItem.description_formatting}
            onFormattingChange={(formatting) => setEditedItem({...editedItem, description_formatting: formatting})}
            placeholder="Wprowadź szczegółowy opis elementu..."
            className="mt-1"
          />

          {/* Podgląd edycji */}
          <div className="mt-3 border rounded-lg p-3 bg-muted/20">
            <Label className="text-sm font-medium mb-2 block">Podgląd</Label>
            <article
              className="prose prose-sm max-w-none"
              style={{
                fontSize: `${editedItem.description_formatting?.fontSize || editedItem.font_size || 16}px`,
                fontWeight: editedItem.description_formatting?.fontWeight || editedItem.font_weight || '400',
                fontStyle: editedItem.description_formatting?.fontStyle || 'normal',
                textDecoration: editedItem.description_formatting?.textDecoration || 'none',
                textAlign: (editedItem.description_formatting?.textAlign || editedItem.text_align || 'left') as any,
                color: editedItem.description_formatting?.color || editedItem.text_color || 'inherit',
                fontFamily: editedItem.description_formatting?.fontFamily || editedItem.font_family || 'inherit',
                lineHeight: (editedItem.description_formatting?.lineHeight || editedItem.line_height || 1.5).toString(),
                letterSpacing: `${editedItem.description_formatting?.letterSpacing || editedItem.letter_spacing || 0}px`,
                textTransform: (editedItem.description_formatting?.textTransform || editedItem.text_transform || 'none') as any,
                wordBreak: 'break-word'
              }}
              dangerouslySetInnerHTML={{ __html: editedItem.description || '' }}
            />
          </div>
        </div>

        {(editedItem.type === 'button' || editedItem.type === 'link') && (
          <div>
            <Label htmlFor="item-url" className="text-sm font-medium">
              URL / Link
            </Label>
            <Input
              id="item-url"
              type="url"
              value={editedItem.url || ''}
              onChange={(e) => setEditedItem({...editedItem, url: e.target.value})}
              placeholder="https://example.com"
              className="mt-1"
            />
          </div>
        )}

        <div>
          <Label htmlFor="item-icon" className="text-sm font-medium">
            Ikona (opcjonalna)
          </Label>
          <Input
            id="item-icon"
            value={editedItem.icon || ''}
            onChange={(e) => setEditedItem({...editedItem, icon: e.target.value})}
            placeholder="🏠 lub nazwa ikony Lucide"
            className="mt-1"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="item-active"
            checked={editedItem.is_active}
            onCheckedChange={(checked) => setEditedItem({...editedItem, is_active: checked})}
          />
          <Label htmlFor="item-active" className="text-sm font-medium">
            Element aktywny
          </Label>
          {editedItem.is_active ? (
            <Eye className="w-4 h-4 text-green-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Typography Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Type className="w-4 h-4" />
          <h4 className="font-medium">Typografia</h4>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">
            Rozmiar czcionki: {editedItem.font_size}px
          </Label>
          <Slider
            value={[editedItem.font_size || 16]}
            onValueChange={([value]) => setEditedItem({...editedItem, font_size: value})}
            min={10}
            max={32}
            step={1}
            className="w-full"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Grubość czcionki</Label>
          <Select 
            value={editedItem.font_weight} 
            onValueChange={(value) => setEditedItem({...editedItem, font_weight: value})}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontWeights.map((weight) => (
                <SelectItem key={weight.value} value={weight.value}>
                  {weight.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Rodzina czcionki</Label>
          <Select 
            value={editedItem.font_family || 'inherit'} 
            onValueChange={(value) => {
              setEditedItem({...editedItem, font_family: value});
              loadGoogleFont(value);
            }}
          >
            <SelectTrigger className="mt-1 bg-background border">
              <SelectValue placeholder="Wybierz czcionkę" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50 max-h-60 overflow-y-auto">
              {fontFamilies.map((font) => (
                <SelectItem 
                  key={font.value} 
                  value={font.value}
                  className="hover:bg-accent hover:text-accent-foreground"
                  style={{ fontFamily: font.value !== 'inherit' ? font.value : undefined }}
                >
                  {font.label}
                  {font.url && <span className="text-xs text-muted-foreground ml-2">(Google Fonts)</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="text-color" className="text-sm font-medium">
            Kolor tekstu
          </Label>
          <Input
            id="text-color"
            type="color"
            value={editedItem.text_color?.includes('hsl') ? '#ffffff' : editedItem.text_color}
            onChange={(e) => setEditedItem({...editedItem, text_color: e.target.value})}
            className="mt-1 h-10 w-full"
          />
        </div>
      </div>

      {/* Style Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Palette className="w-4 h-4" />
          <h4 className="font-medium">Wygląd</h4>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Kolor tła</Label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {backgroundPresets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="h-8 text-xs justify-start"
                onClick={() => setEditedItem({...editedItem, background_color: preset.color})}
              >
                <div 
                  className="w-4 h-4 rounded mr-2 border" 
                  style={{ backgroundColor: preset.color === 'transparent' ? 'white' : preset.color }}
                />
                {preset.name}
              </Button>
            ))}
          </div>
          <Input
            type="color"
            value={editedItem.background_color?.includes('hsl') ? '#2D6A4F' : editedItem.background_color}
            onChange={(e) => setEditedItem({...editedItem, background_color: e.target.value})}
            className="w-full h-10"
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">
            Padding: {editedItem.padding}px
          </Label>
          <Slider
            value={[editedItem.padding || 12]}
            onValueChange={([value]) => setEditedItem({...editedItem, padding: value})}
            min={0}
            max={48}
            step={2}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNew ? 'Dodaj nowy element' : 'Edytuj element'}
            </DialogTitle>
            <DialogDescription>
              {isNew ? 'Skonfiguruj nowy element w sekcji' : 'Modyfikuj ustawienia elementu'}
            </DialogDescription>
          </DialogHeader>
          
          {editorContent}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Anuluj
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="w-5 h-5" />
          {isNew ? 'Dodaj nowy element' : 'Edytuj element'}
        </CardTitle>
        <CardDescription>
          {isNew ? 'Skonfiguruj nowy element w sekcji' : 'Modyfikuj ustawienia elementu'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {editorContent}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Anuluj
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Zapisz
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};