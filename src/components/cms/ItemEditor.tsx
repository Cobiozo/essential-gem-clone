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
import { Edit3, Save, X, Plus, Palette, Type, Image, Video, Link2, Eye, EyeOff } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { MediaUpload } from '@/components/MediaUpload';
import { SecureMedia } from '@/components/SecureMedia';

interface Item {
  id?: string;
  section_id: string;
  type: string;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  icon?: string | null;
  position: number;
  is_active: boolean;
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'document' | 'audio' | 'other' | '' | null;
  media_alt_text?: string | null;
  background_color?: string;
  text_color?: string;
  font_size?: number;
  font_weight?: string;
  border_radius?: number;
  padding?: number;
  style_class?: string;
}

interface ItemEditorProps {
  item?: Item;
  sectionId: string;
  onSave: (item: Item) => void;
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
  const [editedItem, setEditedItem] = useState<Item>(
    item || {
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
      style_class: ''
    }
  );

  const [isOpen, setIsOpen] = useState(false);

  const itemTypes = [
    { value: 'button', label: 'Przycisk', icon: '🔘' },
    { value: 'link', label: 'Link', icon: '🔗' },
    { value: 'text', label: 'Tekst', icon: '📝' },
    { value: 'media', label: 'Media', icon: '🖼️' },
    { value: 'card', label: 'Karta', icon: '🃏' },
    { value: 'badge', label: 'Odznaka', icon: '🏷️' }
  ];

  const fontWeights = [
    { value: '300', label: 'Lekka (300)' },
    { value: '400', label: 'Normalna (400)' },
    { value: '500', label: 'Średnia (500)' },
    { value: '600', label: 'Półgruba (600)' },
    { value: '700', label: 'Gruba (700)' }
  ];

  const backgroundPresets = [
    { name: 'Podstawowy', color: 'hsl(var(--primary))' },
    { name: 'Pomocniczy', color: 'hsl(var(--secondary))' },
    { name: 'Akcentowy', color: 'hsl(var(--accent))' },
    { name: 'Przezroczysty', color: 'transparent' },
    { name: 'Biały', color: 'hsl(0 0% 100%)' },
    { name: 'Szary', color: 'hsl(0 0% 90%)' }
  ];

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
      style_class: ''
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
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
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

        <div>
          <Label htmlFor="item-description" className="text-sm font-medium">
            Opis
          </Label>
          <div className="space-y-2 mt-1">
            <Textarea
              id="item-description"
              value={editedItem.description || ''}
              onChange={(e) => setEditedItem({...editedItem, description: e.target.value})}
              placeholder="Opis elementu"
              rows={3}
            />
            <div className="flex justify-end">
              <EmojiPicker 
                onEmojiSelect={addEmojiToDescription}
                trigger={
                  <Button variant="outline" size="sm" type="button">
                    😀 Dodaj emoji do opisu
                  </Button>
                }
              />
            </div>
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

      {/* Media Upload */}
      {(editedItem.type === 'media' || editedItem.type === 'card') && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center space-x-2 mb-3">
            <Image className="w-4 h-4" />
            <h4 className="font-medium">Media</h4>
          </div>

          <MediaUpload
            onMediaUploaded={handleMediaUpload}
            currentMediaUrl={editedItem.media_url || undefined}
            currentMediaType={(editedItem.media_type === 'image' || editedItem.media_type === 'video' || editedItem.media_type === 'document' || editedItem.media_type === 'audio' || editedItem.media_type === 'other') ? editedItem.media_type : undefined}
            currentAltText={editedItem.media_alt_text || undefined}
          />

          {editedItem.media_url && (
            <div>
              <Label htmlFor="media-alt" className="text-sm font-medium">
                Tekst alternatywny (ALT)
              </Label>
              <Input
                id="media-alt"
                value={editedItem.media_alt_text || ''}
                onChange={(e) => setEditedItem({...editedItem, media_alt_text: e.target.value})}
                placeholder="Opis obrazu dla czytników ekranu"
                className="mt-1"
              />
            </div>
          )}
        </div>
      )}

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
            max={32}
            step={2}
            className="w-full"
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">
            Zaokrąglenie rogów: {editedItem.border_radius}px
          </Label>
          <Slider
            value={[editedItem.border_radius || 8]}
            onValueChange={([value]) => setEditedItem({...editedItem, border_radius: value})}
            min={0}
            max={24}
            step={2}
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="style-class" className="text-sm font-medium">
            Dodatkowe klasy CSS (opcjonalne)
          </Label>
          <Input
            id="style-class"
            value={editedItem.style_class || ''}
            onChange={(e) => setEditedItem({...editedItem, style_class: e.target.value})}
            placeholder="np. hover:shadow-lg transition-all"
            className="mt-1"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium">Podgląd</h4>
        
        <div className="p-4 border rounded-lg bg-muted/30">
          {editedItem.type === 'button' && (
            <button 
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: editedItem.background_color,
                color: editedItem.text_color,
                fontSize: `${editedItem.font_size}px`,
                fontWeight: editedItem.font_weight,
                borderRadius: `${editedItem.border_radius}px`,
                padding: `${editedItem.padding}px`
              }}
            >
              {editedItem.icon && <span className="mr-2">{editedItem.icon}</span>}
              {editedItem.title || 'Przykładowy przycisk'}
            </button>
          )}

          {editedItem.type === 'text' && (
            <div 
              style={{
                color: editedItem.text_color,
                fontSize: `${editedItem.font_size}px`,
                fontWeight: editedItem.font_weight,
                padding: `${editedItem.padding}px`
              }}
            >
              <h4 className="font-semibold mb-1">
                {editedItem.icon && <span className="mr-2">{editedItem.icon}</span>}
                {editedItem.title || 'Przykładowy tytuł'}
              </h4>
              {editedItem.description && (
                <p className="text-sm opacity-80">{editedItem.description}</p>
              )}
            </div>
          )}

          {editedItem.type === 'card' && (
            <div 
              className="p-4 border rounded-lg"
              style={{
                backgroundColor: editedItem.background_color,
                color: editedItem.text_color,
                borderRadius: `${editedItem.border_radius}px`
              }}
            >
              {editedItem.media_url && (
                <div className="mb-3">
                  <SecureMedia
                    mediaUrl={editedItem.media_url}
                    mediaType={editedItem.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
                    altText={editedItem.media_alt_text || ''}
                    className="w-full max-h-32 object-cover"
                  />
                </div>
              )}
              <h4 className="font-semibold mb-1" style={{ fontSize: `${editedItem.font_size}px` }}>
                {editedItem.icon && <span className="mr-2">{editedItem.icon}</span>}
                {editedItem.title || 'Przykładowy tytuł karty'}
              </h4>
              {editedItem.description && (
                <p className="text-sm opacity-80">{editedItem.description}</p>
              )}
            </div>
          )}
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
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {isNew ? 'Dodaj nowy element' : 'Edytuj element'}
            </DialogTitle>
            <DialogDescription>
              Skonfiguruj wygląd i zawartość elementu sekcji
            </DialogDescription>
          </DialogHeader>
          {editorContent}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={!editedItem.title?.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {isNew ? 'Dodaj element' : 'Zapisz zmiany'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Edit3 className="w-5 h-5" />
          <span>{isNew ? 'Nowy element' : 'Edytuj element'}</span>
        </CardTitle>
        <CardDescription>
          Skonfiguruj wygląd i zawartość elementu sekcji
        </CardDescription>
      </CardHeader>
      <CardContent>
        {editorContent}
        <div className="flex space-x-3 mt-6">
          <Button onClick={handleSave} disabled={!editedItem.title?.trim()}>
            <Save className="w-4 h-4 mr-2" />
            {isNew ? 'Dodaj element' : 'Zapisz zmiany'}
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Anuluj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};