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
import { Edit3, Save, X, Plus, Palette, Type, Layout, Eye, EyeOff, Maximize, Settings, Sparkles } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

interface Section {
  id?: string;
  title: string;
  description?: string;
  position: number;
  is_active: boolean;
  background_color?: string;
  text_color?: string;
  font_size?: number;
  alignment?: 'left' | 'center' | 'right';
  padding?: number;
  margin?: number;
  border_radius?: number;
  style_class?: string;
  // Enhanced appearance options
  background_gradient?: string;
  border_width?: number;
  border_color?: string;
  border_style?: 'solid' | 'dashed' | 'dotted' | 'none';
  box_shadow?: string;
  opacity?: number;
  // Size options
  width_type?: 'full' | 'container' | 'custom';
  custom_width?: number;
  height_type?: 'auto' | 'custom';
  custom_height?: number;
  max_width?: number;
  // Typography options
  font_weight?: number;
  line_height?: number;
  letter_spacing?: number;
  text_transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  // Layout options
  display_type?: 'block' | 'flex' | 'grid';
  justify_content?: 'start' | 'center' | 'end' | 'between' | 'around';
  align_items?: 'start' | 'center' | 'end' | 'stretch';
  gap?: number;
}

interface SectionEditorProps {
  section?: Section;
  onSave: (section: Section) => void;
  onCancel?: () => void;
  isNew?: boolean;
  trigger?: React.ReactNode;
}

export const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  onSave,
  onCancel,
  isNew = false,
  trigger
}) => {
  const [editedSection, setEditedSection] = useState<Section>(
    section || {
      title: '',
      description: '',
      position: 1,
      is_active: true,
      background_color: 'hsl(var(--background))',
      text_color: 'hsl(var(--foreground))',
      font_size: 16,
      alignment: 'left',
      padding: 16,
      margin: 8,
      border_radius: 8,
      style_class: '',
      // Enhanced appearance defaults
      background_gradient: '',
      border_width: 0,
      border_color: 'hsl(var(--border))',
      border_style: 'solid',
      box_shadow: 'none',
      opacity: 100,
      // Size defaults
      width_type: 'full',
      custom_width: 600,
      height_type: 'auto',
      custom_height: 200,
      max_width: 1200,
      // Typography defaults
      font_weight: 400,
      line_height: 1.5,
      letter_spacing: 0,
      text_transform: 'none',
      // Layout defaults
      display_type: 'block',
      justify_content: 'start',
      align_items: 'start',
      gap: 16
    }
  );

  const [isOpen, setIsOpen] = useState(false);

  const alignmentOptions = [
    { value: 'left', label: 'Do lewej' },
    { value: 'center', label: 'Do środka' },
    { value: 'right', label: 'Do prawej' }
  ];

  const backgroundPresets = [
    { name: 'Domyślne', color: 'hsl(var(--background))' },
    { name: 'Białe', color: 'hsl(0 0% 100%)' },
    { name: 'Szare', color: 'hsl(0 0% 95%)' },
    { name: 'Podstawowe', color: 'hsl(var(--primary))' },
    { name: 'Akcentowe', color: 'hsl(var(--accent))' },
    { name: 'Przezroczyste', color: 'transparent' }
  ];

  const gradientPresets = [
    { name: 'Brak', gradient: '' },
    { name: 'Podstawowy', gradient: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-foreground)))' },
    { name: 'Akcentowy', gradient: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent-foreground)))' },
    { name: 'Zachód słońca', gradient: 'linear-gradient(135deg, #ff6b6b, #feca57)' },
    { name: 'Ocean', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { name: 'Las', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)' }
  ];

  const shadowPresets = [
    { name: 'Brak', shadow: 'none' },
    { name: 'Subtelny', shadow: '0 1px 3px 0 hsl(0 0% 0% / 0.1)' },
    { name: 'Średni', shadow: '0 4px 6px -1px hsl(0 0% 0% / 0.1)' },
    { name: 'Duży', shadow: '0 10px 15px -3px hsl(0 0% 0% / 0.1)' },
    { name: 'Świecący', shadow: '0 0 20px hsl(var(--primary) / 0.3)' }
  ];

  const borderStyleOptions = [
    { value: 'none', label: 'Brak' },
    { value: 'solid', label: 'Pełna' },
    { value: 'dashed', label: 'Przerywana' },
    { value: 'dotted', label: 'Kropkowana' }
  ];

  const displayOptions = [
    { value: 'block', label: 'Blok' },
    { value: 'flex', label: 'Flex' },
    { value: 'grid', label: 'Grid' }
  ];

  const justifyOptions = [
    { value: 'start', label: 'Start' },
    { value: 'center', label: 'Centrum' },
    { value: 'end', label: 'Koniec' },
    { value: 'between', label: 'Rozłożone' },
    { value: 'around', label: 'Wokół' }
  ];

  const alignOptions = [
    { value: 'start', label: 'Start' },
    { value: 'center', label: 'Centrum' },
    { value: 'end', label: 'Koniec' },
    { value: 'stretch', label: 'Rozciągnij' }
  ];

  const fontWeightOptions = [
    { value: 300, label: 'Cienka (300)' },
    { value: 400, label: 'Normalna (400)' },
    { value: 500, label: 'Średnia (500)' },
    { value: 600, label: 'Pogrubiona (600)' },
    { value: 700, label: 'Gruba (700)' },
    { value: 800, label: 'Bardzo gruba (800)' }
  ];

  const textTransformOptions = [
    { value: 'none', label: 'Bez zmian' },
    { value: 'uppercase', label: 'WIELKIE LITERY' },
    { value: 'lowercase', label: 'małe litery' },
    { value: 'capitalize', label: 'Pierwsza Wielka' }
  ];

  const handleSave = () => {
    onSave(editedSection);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setEditedSection(section || {
      title: '',
      description: '',
      position: 1,
      is_active: true,
      background_color: 'hsl(var(--background))',
      text_color: 'hsl(var(--foreground))',
      font_size: 16,
      alignment: 'left',
      padding: 16,
      margin: 8,
      border_radius: 8,
      style_class: '',
      // Enhanced appearance defaults
      background_gradient: '',
      border_width: 0,
      border_color: 'hsl(var(--border))',
      border_style: 'solid',
      box_shadow: 'none',
      opacity: 100,
      // Size defaults
      width_type: 'full',
      custom_width: 600,
      height_type: 'auto',
      custom_height: 200,
      max_width: 1200,
      // Typography defaults
      font_weight: 400,
      line_height: 1.5,
      letter_spacing: 0,
      text_transform: 'none',
      // Layout defaults
      display_type: 'block',
      justify_content: 'start',
      align_items: 'start',
      gap: 16
    });
    setIsOpen(false);
    onCancel?.();
  };

  const addEmoji = (emoji: string) => {
    setEditedSection({
      ...editedSection,
      title: editedSection.title + emoji
    });
  };

  const editorContent = (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="section-title" className="text-sm font-medium">
            Tytuł sekcji
          </Label>
          <div className="flex space-x-2 mt-1">
            <Input
              id="section-title"
              value={editedSection.title}
              onChange={(e) => setEditedSection({...editedSection, title: e.target.value})}
              placeholder="Nazwa sekcji"
            />
            <EmojiPicker 
              onEmojiSelect={addEmoji}
              trigger={
                <Button variant="outline" size="icon" type="button">
                  😀
                </Button>
              }
            />
          </div>
        </div>

        <div>
          <Label htmlFor="section-description" className="text-sm font-medium">
            Opis sekcji (opcjonalny)
          </Label>
          <Textarea
            id="section-description"
            value={editedSection.description || ''}
            onChange={(e) => setEditedSection({...editedSection, description: e.target.value})}
            placeholder="Krótki opis sekcji"
            rows={3}
            className="mt-1"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="section-active"
            checked={editedSection.is_active}
            onCheckedChange={(checked) => setEditedSection({...editedSection, is_active: checked})}
          />
          <Label htmlFor="section-active" className="text-sm font-medium">
            Sekcja aktywna
          </Label>
          {editedSection.is_active ? (
            <Eye className="w-4 h-4 text-green-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Size & Layout Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Maximize className="w-4 h-4" />
          <h4 className="font-medium">Rozmiar i układ</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Szerokość</Label>
            <Select 
              value={editedSection.width_type} 
              onValueChange={(value: 'full' | 'container' | 'custom') => 
                setEditedSection({...editedSection, width_type: value})
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Pełna szerokość</SelectItem>
                <SelectItem value="container">Kontener</SelectItem>
                <SelectItem value="custom">Niestandardowa</SelectItem>
              </SelectContent>
            </Select>
            {editedSection.width_type === 'custom' && (
              <div className="mt-2">
                <Label className="text-sm font-medium mb-2 block">
                  Szerokość: {editedSection.custom_width}px
                </Label>
                <Slider
                  value={[editedSection.custom_width || 600]}
                  onValueChange={([value]) => setEditedSection({...editedSection, custom_width: value})}
                  min={200}
                  max={1400}
                  step={50}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium">Wysokość</Label>
            <Select 
              value={editedSection.height_type} 
              onValueChange={(value: 'auto' | 'custom') => 
                setEditedSection({...editedSection, height_type: value})
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatyczna</SelectItem>
                <SelectItem value="custom">Niestandardowa</SelectItem>
              </SelectContent>
            </Select>
            {editedSection.height_type === 'custom' && (
              <div className="mt-2">
                <Label className="text-sm font-medium mb-2 block">
                  Wysokość: {editedSection.custom_height}px
                </Label>
                <Slider
                  value={[editedSection.custom_height || 200]}
                  onValueChange={([value]) => setEditedSection({...editedSection, custom_height: value})}
                  min={100}
                  max={800}
                  step={50}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">
            Maksymalna szerokość: {editedSection.max_width}px
          </Label>
          <Slider
            value={[editedSection.max_width || 1200]}
            onValueChange={([value]) => setEditedSection({...editedSection, max_width: value})}
            min={400}
            max={1600}
            step={50}
            className="w-full"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Typ wyświetlania</Label>
          <Select 
            value={editedSection.display_type} 
            onValueChange={(value: 'block' | 'flex' | 'grid') => 
              setEditedSection({...editedSection, display_type: value})
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {displayOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(editedSection.display_type === 'flex' || editedSection.display_type === 'grid') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Wyrównanie poziome</Label>
              <Select 
                value={editedSection.justify_content} 
                onValueChange={(value: 'start' | 'center' | 'end' | 'between' | 'around') => 
                  setEditedSection({...editedSection, justify_content: value})
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {justifyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Wyrównanie pionowe</Label>
              <Select 
                value={editedSection.align_items} 
                onValueChange={(value: 'start' | 'center' | 'end' | 'stretch') => 
                  setEditedSection({...editedSection, align_items: value})
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {alignOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {(editedSection.display_type === 'flex' || editedSection.display_type === 'grid') && (
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Odstępy między elementami: {editedSection.gap}px
            </Label>
            <Slider
              value={[editedSection.gap || 16]}
              onValueChange={([value]) => setEditedSection({...editedSection, gap: value})}
              min={0}
              max={64}
              step={4}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Enhanced Typography Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Type className="w-4 h-4" />
          <h4 className="font-medium">Typografia</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Rozmiar czcionki: {editedSection.font_size}px
            </Label>
            <Slider
              value={[editedSection.font_size || 16]}
              onValueChange={([value]) => setEditedSection({...editedSection, font_size: value})}
              min={12}
              max={48}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Grubość czcionki</Label>
            <Select 
              value={editedSection.font_weight?.toString()} 
              onValueChange={(value) => 
                setEditedSection({...editedSection, font_weight: parseInt(value)})
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontWeightOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Wysokość linii: {editedSection.line_height}
            </Label>
            <Slider
              value={[editedSection.line_height || 1.5]}
              onValueChange={([value]) => setEditedSection({...editedSection, line_height: value})}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Odstępy między literami: {editedSection.letter_spacing}px
            </Label>
            <Slider
              value={[editedSection.letter_spacing || 0]}
              onValueChange={([value]) => setEditedSection({...editedSection, letter_spacing: value})}
              min={-2}
              max={8}
              step={0.5}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Wyrównanie tekstu</Label>
            <Select 
              value={editedSection.alignment} 
              onValueChange={(value: 'left' | 'center' | 'right') => 
                setEditedSection({...editedSection, alignment: value})
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {alignmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Transformacja tekstu</Label>
            <Select 
              value={editedSection.text_transform} 
              onValueChange={(value: 'none' | 'uppercase' | 'lowercase' | 'capitalize') => 
                setEditedSection({...editedSection, text_transform: value})
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {textTransformOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="text-color" className="text-sm font-medium">
            Kolor tekstu
          </Label>
          <Input
            id="text-color"
            type="color"
            value={editedSection.text_color?.includes('hsl') ? '#333333' : editedSection.text_color}
            onChange={(e) => setEditedSection({...editedSection, text_color: e.target.value})}
            className="mt-1 h-10 w-full"
          />
        </div>
      </div>

      {/* Enhanced Style Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Palette className="w-4 h-4" />
          <h4 className="font-medium">Wygląd i styl</h4>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Kolor tła</Label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {backgroundPresets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="h-8 text-xs justify-start"
                onClick={() => setEditedSection({...editedSection, background_color: preset.color})}
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
            value={editedSection.background_color?.includes('hsl') ? '#f5f5f5' : editedSection.background_color}
            onChange={(e) => setEditedSection({...editedSection, background_color: e.target.value})}
            className="w-full h-10"
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Gradient tła</Label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {gradientPresets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="h-8 text-xs justify-start"
                onClick={() => setEditedSection({...editedSection, background_gradient: preset.gradient})}
              >
                <div 
                  className="w-4 h-4 rounded mr-2 border" 
                  style={{ background: preset.gradient || '#f5f5f5' }}
                />
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Padding: {editedSection.padding}px
            </Label>
            <Slider
              value={[editedSection.padding || 16]}
              onValueChange={([value]) => setEditedSection({...editedSection, padding: value})}
              min={0}
              max={64}
              step={4}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Margin: {editedSection.margin}px
            </Label>
            <Slider
              value={[editedSection.margin || 8]}
              onValueChange={([value]) => setEditedSection({...editedSection, margin: value})}
              min={0}
              max={32}
              step={4}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Zaokrąglenie rogów: {editedSection.border_radius}px
            </Label>
            <Slider
              value={[editedSection.border_radius || 8]}
              onValueChange={([value]) => setEditedSection({...editedSection, border_radius: value})}
              min={0}
              max={50}
              step={2}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Przezroczystość: {editedSection.opacity}%
            </Label>
            <Slider
              value={[editedSection.opacity || 100]}
              onValueChange={([value]) => setEditedSection({...editedSection, opacity: value})}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Border & Shadow Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Settings className="w-4 h-4" />
          <h4 className="font-medium">Obramowanie i cień</h4>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium">Styl obramowania</Label>
            <Select 
              value={editedSection.border_style} 
              onValueChange={(value: 'solid' | 'dashed' | 'dotted' | 'none') => 
                setEditedSection({...editedSection, border_style: value})
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {borderStyleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Grubość: {editedSection.border_width}px
            </Label>
            <Slider
              value={[editedSection.border_width || 0]}
              onValueChange={([value]) => setEditedSection({...editedSection, border_width: value})}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="border-color" className="text-sm font-medium">
              Kolor obramowania
            </Label>
            <Input
              id="border-color"
              type="color"
              value={editedSection.border_color?.includes('hsl') ? '#cccccc' : editedSection.border_color}
              onChange={(e) => setEditedSection({...editedSection, border_color: e.target.value})}
              className="mt-1 h-10 w-full"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Cień</Label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {shadowPresets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setEditedSection({...editedSection, box_shadow: preset.shadow})}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="style-class" className="text-sm font-medium">
            Dodatkowe klasy CSS (opcjonalne)
          </Label>
          <Input
            id="style-class"
            value={editedSection.style_class || ''}
            onChange={(e) => setEditedSection({...editedSection, style_class: e.target.value})}
            placeholder="np. shadow-lg border-2"
            className="mt-1"
          />
        </div>
      </div>

      {/* Enhanced Preview */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-4 h-4" />
          <h4 className="font-medium">Podgląd</h4>
        </div>
        
        <div 
          className="p-4 border rounded-lg"
          style={{
            backgroundColor: editedSection.background_gradient ? 'transparent' : editedSection.background_color,
            backgroundImage: editedSection.background_gradient || 'none',
            color: editedSection.text_color,
            fontSize: `${editedSection.font_size}px`,
            fontWeight: editedSection.font_weight,
            lineHeight: editedSection.line_height,
            letterSpacing: `${editedSection.letter_spacing}px`,
            textAlign: editedSection.alignment,
            textTransform: editedSection.text_transform,
            padding: `${editedSection.padding}px`,
            margin: `${editedSection.margin}px`,
            borderRadius: `${editedSection.border_radius}px`,
            borderWidth: `${editedSection.border_width}px`,
            borderStyle: editedSection.border_style,
            borderColor: editedSection.border_color,
            boxShadow: editedSection.box_shadow,
            opacity: (editedSection.opacity || 100) / 100,
            display: editedSection.display_type,
            justifyContent: editedSection.display_type !== 'block' ? editedSection.justify_content : undefined,
            alignItems: editedSection.display_type !== 'block' ? editedSection.align_items : undefined,
            gap: editedSection.display_type !== 'block' ? `${editedSection.gap}px` : undefined,
            width: editedSection.width_type === 'custom' ? `${editedSection.custom_width}px` : editedSection.width_type === 'container' ? '100%' : '100%',
            height: editedSection.height_type === 'custom' ? `${editedSection.custom_height}px` : 'auto',
            maxWidth: `${editedSection.max_width}px`,
          }}
        >
          <h3 className="font-semibold mb-2">{editedSection.title || 'Przykładowy tytuł'}</h3>
          {editedSection.description && (
            <p className="text-sm opacity-80">{editedSection.description}</p>
          )}
          {editedSection.display_type !== 'block' && (
            <div className="mt-2 text-xs opacity-60">
              Przykładowa zawartość dla layoutu {editedSection.display_type}
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
        <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] sm:max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>
              {isNew ? 'Dodaj nową sekcję' : 'Edytuj sekcję'}
            </DialogTitle>
            <DialogDescription>
              Skonfiguruj wygląd i zawartość sekcji
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6">
            {editorContent}
          </div>
          <DialogFooter className="p-6 pt-2 shrink-0 border-t bg-background/80 backdrop-blur-sm">
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={!editedSection.title.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {isNew ? 'Utwórz sekcję' : 'Zapisz zmiany'}
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
          <span>{isNew ? 'Nowa sekcja' : 'Edytuj sekcję'}</span>
        </CardTitle>
        <CardDescription>
          Skonfiguruj wygląd i zawartość sekcji
        </CardDescription>
      </CardHeader>
      <CardContent>
        {editorContent}
        <div className="flex space-x-3 mt-6">
          <Button onClick={handleSave} disabled={!editedSection.title.trim()}>
            <Save className="w-4 h-4 mr-2" />
            {isNew ? 'Utwórz sekcję' : 'Zapisz zmiany'}
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