import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { icons } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit3, Save, X, Plus, Palette, Type, Layout, Eye, EyeOff, Maximize, Settings, Sparkles, Image, Star } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { MediaUpload } from '../MediaUpload';
import { RichTextEditor } from '@/components/RichTextEditor';

interface Section {
  id?: string;
  title: string;
  description?: string;
  position: number;
  is_active: boolean;
  background_color?: string | null;
  text_color?: string | null;
  font_size?: number | null;
  alignment?: string | null;
  padding?: number | null;
  margin?: number | null;
  border_radius?: number | null;
  style_class?: string | null;
  // Enhanced appearance options
  background_gradient?: string | null;
  border_width?: number | null;
  border_color?: string | null;
  border_style?: string | null;
  box_shadow?: string | null;
  opacity?: number | null;
  // Size options
  width_type?: string | null;
  custom_width?: number | null;
  height_type?: string | null;
  custom_height?: number | null;
  max_width?: number | null;
  // Typography options
  font_weight?: number | null;
  line_height?: number | null;
  letter_spacing?: number | null;
  text_transform?: string | null;
  font_family?: string | null;
  font_style?: string | null;
  text_decoration?: string | null;
  // Separate typography formatting
  title_formatting?: any | null;
  description_formatting?: any | null;
  // Layout options
  display_type?: string | null;
  justify_content?: string | null;
  align_items?: string | null;
  gap?: number | null;
  // New enhanced options
  section_margin_top?: number | null;
  section_margin_bottom?: number | null;
  background_image?: string | null;
  background_image_opacity?: number | null;
  background_image_position?: string | null;
  background_image_size?: string | null;
  icon_name?: string | null;
  icon_position?: string | null;
  icon_size?: number | null;
  icon_color?: string | null;
  show_icon?: boolean | null;
  content_direction?: string | null;
  content_wrap?: string | null;
  min_height?: number | null;
  overflow_behavior?: string | null;
  // Hover states
  hover_background_color?: string | null;
  hover_background_gradient?: string | null;
  hover_text_color?: string | null;
  hover_border_color?: string | null;
  hover_box_shadow?: string | null;
  hover_opacity?: number | null;
  hover_scale?: number | null;
  hover_transition_duration?: number | null;
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
      font_family: 'inherit',
      font_style: 'normal',
      text_decoration: 'none',
      title_formatting: null,
      description_formatting: null,
      // Layout defaults
      display_type: 'block',
      justify_content: 'start',
      align_items: 'start',
      gap: 16,
      // New enhanced defaults
      section_margin_top: 24,
      section_margin_bottom: 24,
      background_image: '',
      background_image_opacity: 100,
      background_image_position: 'center',
      background_image_size: 'cover',
      icon_name: '',
      icon_position: 'left',
      icon_size: 24,
      icon_color: 'hsl(var(--foreground))',
      show_icon: false,
      content_direction: 'column',
      content_wrap: 'nowrap',
      min_height: 0,
      overflow_behavior: 'visible',
      // Hover states defaults
      hover_background_color: '',
      hover_background_gradient: '',
      hover_text_color: '',
      hover_border_color: '', 
      hover_box_shadow: '',
      hover_opacity: 100,
      hover_scale: 1.0,
      hover_transition_duration: 300
    }
  );

  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalSection, setOriginalSection] = useState<Section | null>(null);

  // Track changes to detect unsaved changes
  useEffect(() => {
    if (!originalSection) {
      setOriginalSection(section || null);
    } else {
      const hasChanges = JSON.stringify(editedSection) !== JSON.stringify(originalSection);
      setHasUnsavedChanges(hasChanges);
    }
  }, [editedSection, originalSection, section]);

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
    { value: 'grid', label: 'Grid' },
    { value: 'inline-block', label: 'Inline Block' },
    { value: 'inline-flex', label: 'Inline Flex' },
    { value: 'table', label: 'Tabela' },
    { value: 'table-cell', label: 'Komórka tabeli' },
    { value: 'flow-root', label: 'Flow Root' }
  ];

  const contentDirectionOptions = [
    { value: 'row', label: 'Poziomo' },
    { value: 'column', label: 'Pionowo' },
    { value: 'row-reverse', label: 'Poziomo odwrócone' },
    { value: 'column-reverse', label: 'Pionowo odwrócone' }
  ];

  const contentWrapOptions = [
    { value: 'nowrap', label: 'Bez zawijania' },
    { value: 'wrap', label: 'Zawijaj' },
    { value: 'wrap-reverse', label: 'Zawijaj odwrócone' }
  ];

  const backgroundPositionOptions = [
    { value: 'center', label: 'Centrum' },
    { value: 'top', label: 'Góra' },
    { value: 'bottom', label: 'Dół' },
    { value: 'left', label: 'Lewo' },
    { value: 'right', label: 'Prawo' },
    { value: 'top left', label: 'Góra lewo' },
    { value: 'top right', label: 'Góra prawo' },
    { value: 'bottom left', label: 'Dół lewo' },
    { value: 'bottom right', label: 'Dół prawo' }
  ];

  const backgroundSizeOptions = [
    { value: 'cover', label: 'Pokryj' },
    { value: 'contain', label: 'Zawrzyj' },
    { value: 'auto', label: 'Auto' },
    { value: '100%', label: '100%' },
    { value: '100% 100%', label: 'Rozciągnij' }
  ];

  const iconPositionOptions = [
    { value: 'left', label: 'Lewo' },
    { value: 'right', label: 'Prawo' },
    { value: 'top', label: 'Góra' },
    { value: 'bottom', label: 'Dół' }
  ];

  const overflowOptions = [
    { value: 'visible', label: 'Widoczny' },
    { value: 'hidden', label: 'Ukryty' },
    { value: 'scroll', label: 'Przewijanie' },
    { value: 'auto', label: 'Auto' }
  ];

  // Popular Lucide icon names
  const popularIcons = [
    'Home', 'User', 'Settings', 'Mail', 'Phone', 'MapPin', 'Calendar', 'Clock',
    'Heart', 'Star', 'ThumbsUp', 'MessageCircle', 'Share2', 'Download', 'Upload',
    'Search', 'Filter', 'Edit', 'Trash2', 'Plus', 'Minus', 'Check', 'X',
    'ChevronLeft', 'ChevronRight', 'ChevronUp', 'ChevronDown', 'ArrowLeft', 'ArrowRight',
    'Eye', 'EyeOff', 'Lock', 'Unlock', 'Shield', 'AlertCircle', 'Info', 'HelpCircle'
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

  const handleSave = () => {
    // Clean up numeric fields to ensure they're valid for database
    const cleanedSection = {
      ...editedSection,
      // Ensure numeric fields are properly converted or set to null
      hover_opacity: editedSection.hover_opacity !== null && editedSection.hover_opacity !== undefined 
        ? Math.round(Number(editedSection.hover_opacity)) 
        : null,
      hover_scale: editedSection.hover_scale !== null && editedSection.hover_scale !== undefined 
        ? Number(editedSection.hover_scale) 
        : null,
      hover_transition_duration: editedSection.hover_transition_duration !== null && editedSection.hover_transition_duration !== undefined 
        ? Math.round(Number(editedSection.hover_transition_duration)) 
        : null,
      // Clean empty strings to null for text fields
      hover_background_color: editedSection.hover_background_color?.trim() || null,
      hover_background_gradient: editedSection.hover_background_gradient?.trim() || null,
      hover_text_color: editedSection.hover_text_color?.trim() || null,
      hover_border_color: editedSection.hover_border_color?.trim() || null,
      hover_box_shadow: editedSection.hover_box_shadow?.trim() || null,
    };
    
    onSave(cleanedSection);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
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
      font_family: 'inherit',
      font_style: 'normal',
      text_decoration: 'none',
      title_formatting: null,
      description_formatting: null,
      // Layout defaults
      display_type: 'block',
      justify_content: 'start',
      align_items: 'start',
      gap: 16,
      // New enhanced defaults
      section_margin_top: 24,
      section_margin_bottom: 24,
      background_image: '',
      background_image_opacity: 100,
      background_image_position: 'center',
      background_image_size: 'cover',
      icon_name: '',
      icon_position: 'left',
      icon_size: 24,
      icon_color: 'hsl(var(--foreground))',
      show_icon: false,
      content_direction: 'column',
      content_wrap: 'nowrap',
      min_height: 0,
      overflow_behavior: 'visible',
      // Hover states defaults
      hover_background_color: '',
      hover_background_gradient: '',
      hover_text_color: '',
      hover_border_color: '',
      hover_box_shadow: '',
      hover_opacity: 100,
      hover_scale: 1.0,
      hover_transition_duration: 300
    });
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setIsOpen(false);
    onCancel?.();
  };

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

  const addEmoji = (emoji: string) => {
    setEditedSection({
      ...editedSection,
      title: editedSection.title + emoji
    });
  };

  const editorContent = (
    <div className="space-y-6">
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

        {/* Title Typography Settings */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <Label className="text-sm font-medium mb-3 block">Formatowanie tytułu:</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Rozmiar czcionki tytułu</Label>
              <Select 
                value={(editedSection.title_formatting?.fontSize || editedSection.font_size || 16).toString()}
                onValueChange={(value) => setEditedSection({
                  ...editedSection,
                  title_formatting: {
                    ...editedSection.title_formatting,
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
                  <SelectItem value="28">28px</SelectItem>
                  <SelectItem value="32">32px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Grubość tytułu</Label>
              <Select 
                value={(editedSection.title_formatting?.fontWeight || editedSection.font_weight || 400).toString()}
                onValueChange={(value) => setEditedSection({
                  ...editedSection,
                  title_formatting: {
                    ...editedSection.title_formatting,
                    fontWeight: parseInt(value)
                  }
                })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {fontWeightOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="section-description" className="text-sm font-medium">
            Opis sekcji (Rich Text Editor)
          </Label>
          <RichTextEditor
            value={editedSection.description || ''}
            onChange={(value) => setEditedSection({...editedSection, description: value})}
            formatting={editedSection.description_formatting}
            onFormattingChange={(formatting) => setEditedSection({...editedSection, description_formatting: formatting})}
            placeholder="Wprowadź szczegółowy opis sekcji..."
            className="mt-1"
          />

          {/* Podgląd edycji - renderuje końcowy efekt */}
          <div className="mt-3 border rounded-lg p-3 bg-muted/20">
            <Label className="text-sm font-medium mb-2 block">Podgląd</Label>
            <article
              className="prose prose-sm max-w-none"
              style={{
                fontSize: `${editedSection.description_formatting?.fontSize || editedSection.font_size || 16}px`,
                fontWeight: (editedSection.description_formatting?.fontWeight || editedSection.font_weight || 400) as any,
                fontStyle: (editedSection.description_formatting?.fontStyle || editedSection.font_style || 'normal') as any,
                textDecoration: (editedSection.description_formatting?.textDecoration || editedSection.text_decoration || 'none') as any,
                textAlign: (editedSection.description_formatting?.textAlign || editedSection.alignment || 'left') as any,
                color: editedSection.description_formatting?.color || editedSection.text_color || 'inherit',
                fontFamily: editedSection.description_formatting?.fontFamily || editedSection.font_family || 'inherit',
                lineHeight: (editedSection.description_formatting?.lineHeight || editedSection.line_height || 1.5) as any,
                letterSpacing: `${editedSection.description_formatting?.letterSpacing || editedSection.letter_spacing || 0}px`,
                textTransform: (editedSection.description_formatting?.textTransform || editedSection.text_transform || 'none') as any,
                wordBreak: 'break-word'
              }}
              dangerouslySetInnerHTML={{ __html: editedSection.description || '' }}
            />
          </div>
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

      {/* Section Spacing Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Layout className="w-4 h-4" />
          <h4 className="font-medium">Odstępy między sekcjami</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Odstęp górny: {editedSection.section_margin_top}px
            </Label>
            <Slider
              value={[editedSection.section_margin_top || 24]}
              onValueChange={([value]) => setEditedSection({...editedSection, section_margin_top: value})}
              min={0}
              max={100}
              step={4}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Odstęp dolny: {editedSection.section_margin_bottom}px
            </Label>
            <Slider
              value={[editedSection.section_margin_bottom || 24]}
              onValueChange={([value]) => setEditedSection({...editedSection, section_margin_bottom: value})}
              min={0}
              max={100}
              step={4}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Icons Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Star className="w-4 h-4" />
          <h4 className="font-medium">Ikony</h4>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-icon"
            checked={editedSection.show_icon || false}
            onCheckedChange={(checked) => setEditedSection({...editedSection, show_icon: checked})}
          />
          <Label htmlFor="show-icon" className="text-sm font-medium">
            Pokaż ikonę
          </Label>
        </div>

        {editedSection.show_icon && (
          <>
            <div>
              <Label className="text-sm font-medium mb-2 block">Wybierz ikonę</Label>
              <Select 
                value={editedSection.icon_name || ''} 
                onValueChange={(value) => setEditedSection({...editedSection, icon_name: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz ikonę" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {popularIcons.map((iconName) => {
                    const IconComponent = (icons as any)[iconName];
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center space-x-2">
                          {IconComponent && <IconComponent size={16} />}
                          <span>{iconName}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Pozycja ikony</Label>
                <Select 
                  value={editedSection.icon_position || 'left'} 
                  onValueChange={(value) => setEditedSection({...editedSection, icon_position: value})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconPositionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Rozmiar: {editedSection.icon_size}px
                </Label>
                <Slider
                  value={[editedSection.icon_size || 24]}
                  onValueChange={([value]) => setEditedSection({...editedSection, icon_size: value})}
                  min={12}
                  max={48}
                  step={2}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="icon-color" className="text-sm font-medium">
                  Kolor ikony
                </Label>
                <Input
                  id="icon-color"
                  type="color"
                  value={editedSection.icon_color?.includes('hsl') ? '#000000' : editedSection.icon_color}
                  onChange={(e) => setEditedSection({...editedSection, icon_color: e.target.value})}
                  className="mt-1 h-10 w-full"
                />
              </div>
            </div>
          </>
        )}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Rodzina czcionki</Label>
            <Select 
              value={editedSection.font_family || 'inherit'} 
              onValueChange={(value) => {
                setEditedSection({...editedSection, font_family: value});
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
            <Label className="text-sm font-medium">Styl czcionki</Label>
            <Select 
              value={editedSection.font_style || 'normal'} 
              onValueChange={(value) => setEditedSection({...editedSection, font_style: value})}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontStyleOptions.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Dekoracja tekstu</Label>
          <Select 
            value={editedSection.text_decoration || 'none'} 
            onValueChange={(value) => setEditedSection({...editedSection, text_decoration: value})}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {textDecorationOptions.map((decoration) => (
                <SelectItem key={decoration.value} value={decoration.value}>
                  {decoration.label}
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
            value={editedSection.text_color?.includes('hsl') ? '#333333' : editedSection.text_color}
            onChange={(e) => setEditedSection({...editedSection, text_color: e.target.value})}
            className="mt-1 h-10 w-full"
          />
        </div>
      </div>

      {/* Enhanced Layout Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Layout className="w-4 h-4" />
          <h4 className="font-medium">Zaawansowany układ</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Kierunek zawartości</Label>
            <Select 
              value={editedSection.content_direction || 'column'} 
              onValueChange={(value) => setEditedSection({...editedSection, content_direction: value})}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contentDirectionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Zawijanie zawartości</Label>
            <Select 
              value={editedSection.content_wrap || 'nowrap'} 
              onValueChange={(value) => setEditedSection({...editedSection, content_wrap: value})}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contentWrapOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
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
              Minimalna wysokość: {editedSection.min_height}px
            </Label>
            <Slider
              value={[editedSection.min_height || 0]}
              onValueChange={([value]) => setEditedSection({...editedSection, min_height: value})}
              min={0}
              max={500}
              step={10}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Zachowanie przepełnienia</Label>
            <Select 
              value={editedSection.overflow_behavior || 'visible'} 
              onValueChange={(value) => setEditedSection({...editedSection, overflow_behavior: value})}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {overflowOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

        {/* Background Image Section */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Obraz tła</Label>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Prześlij obraz z dysku lub podaj URL
              </Label>
              <div className="space-y-2">
                <MediaUpload
                  onMediaUploaded={(url, type) => {
                    if (type === 'image') {
                      setEditedSection({...editedSection, background_image: url});
                    }
                  }}
                  currentMediaUrl={editedSection.background_image}
                  currentMediaType={editedSection.background_image ? 'image' : undefined}
                />
                <Input
                  placeholder="Lub podaj URL obrazu (https://example.com/image.jpg)"
                  value={editedSection.background_image || ''}
                  onChange={(e) => setEditedSection({...editedSection, background_image: e.target.value})}
                  className="mt-2"
                />
              </div>
            </div>
            
            {editedSection.background_image && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Pozycja obrazu</Label>
                    <Select 
                      value={editedSection.background_image_position || 'center'} 
                      onValueChange={(value) => setEditedSection({...editedSection, background_image_position: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {backgroundPositionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Rozmiar obrazu</Label>
                    <Select 
                      value={editedSection.background_image_size || 'cover'} 
                      onValueChange={(value) => setEditedSection({...editedSection, background_image_size: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {backgroundSizeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Przezroczystość obrazu: {editedSection.background_image_opacity}%
                  </Label>
                  <Slider
                    value={[editedSection.background_image_opacity || 100]}
                    onValueChange={([value]) => setEditedSection({...editedSection, background_image_opacity: value})}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </>
            )}
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

      {/* Hover States */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-4 h-4" />
          <h4 className="font-medium">Efekty najechania (Hover)</h4>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className="text-sm font-medium">Kolor tła po najechaniu</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {backgroundPresets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs justify-start"
                  onClick={() => setEditedSection({...editedSection, hover_background_color: preset.color})}
                  style={{ backgroundColor: preset.color !== 'transparent' && preset.color !== 'hsl(var(--background))' ? preset.color : undefined }}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            <Input
              value={editedSection.hover_background_color || ''}
              onChange={(e) => setEditedSection({...editedSection, hover_background_color: e.target.value})}
              placeholder="hex, rgb, hsl, lub transparent"
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Gradient tła po najechaniu</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {gradientPresets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs justify-start"
                  onClick={() => setEditedSection({...editedSection, hover_background_gradient: preset.gradient})}
                  style={{ backgroundImage: preset.gradient || 'none' }}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            <Input
              value={editedSection.hover_background_gradient || ''}
              onChange={(e) => setEditedSection({...editedSection, hover_background_gradient: e.target.value})}
              placeholder="linear-gradient(...)"
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Kolor tekstu po najechaniu</Label>
              <Input
                value={editedSection.hover_text_color || ''}
                onChange={(e) => setEditedSection({...editedSection, hover_text_color: e.target.value})}
                placeholder="hex, rgb, hsl"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Kolor obramowania po najechaniu</Label>
              <Input
                value={editedSection.hover_border_color || ''}
                onChange={(e) => setEditedSection({...editedSection, hover_border_color: e.target.value})}
                placeholder="hex, rgb, hsl"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Cień po najechaniu</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {shadowPresets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setEditedSection({...editedSection, hover_box_shadow: preset.shadow})}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            <Input
              value={editedSection.hover_box_shadow || ''}
              onChange={(e) => setEditedSection({...editedSection, hover_box_shadow: e.target.value})}
              placeholder="0 10px 25px rgba(0,0,0,0.1)"
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Przezroczystość: {editedSection.hover_opacity}%
              </Label>
              <Slider
                value={[editedSection.hover_opacity || 100]}
                onValueChange={([value]) => setEditedSection({...editedSection, hover_opacity: value})}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Powiększenie: {((editedSection.hover_scale || 1) * 100).toFixed(0)}%
              </Label>
              <Slider
                value={[editedSection.hover_scale || 1]}
                onValueChange={([value]) => setEditedSection({...editedSection, hover_scale: value})}
                min={0.8}
                max={1.2}
                step={0.05}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Czas tranzycji: {editedSection.hover_transition_duration}ms
              </Label>
              <Slider
                value={[editedSection.hover_transition_duration || 300]}
                onValueChange={([value]) => setEditedSection({...editedSection, hover_transition_duration: value})}
                min={100}
                max={1000}
                step={50}
                className="w-full"
              />
            </div>
          </div>
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
            fontFamily: editedSection.font_family || 'inherit',
            fontStyle: editedSection.font_style || 'normal',
            textDecoration: editedSection.text_decoration || 'none',
            lineHeight: editedSection.line_height,
            letterSpacing: `${editedSection.letter_spacing}px`,
            textAlign: (editedSection.alignment || 'left') as React.CSSProperties['textAlign'],
            textTransform: (editedSection.text_transform || 'none') as React.CSSProperties['textTransform'],
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
          <h3 className="font-semibold mb-2" dangerouslySetInnerHTML={{ __html: editedSection.title || 'Przykładowy tytuł' }} />
          {editedSection.description && (
            <div className="text-sm opacity-80" dangerouslySetInnerHTML={{ __html: editedSection.description }} />
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
      <>
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open && hasUnsavedChanges) {
            setShowConfirmDialog(true);
          } else if (!open) {
            setIsOpen(false);
          } else {
            setIsOpen(open);
          }
        }}>
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

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Niezapisane zmiany</AlertDialogTitle>
              <AlertDialogDescription>
                Masz niezapisane zmiany. Czy na pewno chcesz zamknąć edytor? Wszystkie zmiany zostaną utracone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
                Zostań w edytorze
              </AlertDialogCancel>
              <AlertDialogAction onClick={resetAndClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Zamknij bez zapisywania
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
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