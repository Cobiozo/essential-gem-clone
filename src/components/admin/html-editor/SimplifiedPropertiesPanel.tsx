import React, { useState } from 'react';
import { ParsedElement, getElementType } from './types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Type, Link, Image, Box, Palette, AlignLeft, AlignCenter, AlignRight, 
  Trash2, Copy, X, FileImage, Settings, ChevronDown, ChevronUp,
  Columns2, Columns3, Video, Maximize2, Move
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { IconPicker } from '@/components/cms/IconPicker';
import { MediaUpload } from '@/components/MediaUpload';
import { DebouncedStyleInput, normalizeStyleValue } from './DebouncedStyleInput';
import { VisualSpacingEditor } from './VisualSpacingEditor';
import { StylePresets, borderRadiusPresets, boxShadowPresets, fontWeightPresets, gapPresets } from './StylePresets';
import { cn } from '@/lib/utils';

interface SimplifiedPropertiesPanelProps {
  element: ParsedElement | null;
  onUpdate: (updates: Partial<ParsedElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  onInsertChild?: (parentId: string, childHtml: string) => void;
}

// Collapsible section component
const Section: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  defaultOpen?: boolean 
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2.5 hover:bg-muted/50 rounded-lg transition-colors">
        <span className="p-1.5 rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="font-medium text-sm flex-1 text-left">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-3 pt-1 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const SimplifiedPropertiesPanel: React.FC<SimplifiedPropertiesPanelProps> = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onClose,
  onInsertChild
}) => {
  const [activeTab, setActiveTab] = useState('style');
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!element) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-4 text-center">
        <div>
          <Box className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Kliknij element aby go edytować</p>
        </div>
      </div>
    );
  }
  
  const elementType = getElementType(element.tagName);
  
  const updateAttribute = (key: string, value: string) => {
    onUpdate({
      attributes: { ...element.attributes, [key]: value }
    });
  };
  
  const updateStyle = (key: string, value: string) => {
    onUpdate({
      styles: { ...element.styles, [key]: value }
    });
  };

  // Handle media upload
  const handleMediaUpload = (url: string, type: string) => {
    if (element.tagName === 'img') {
      updateAttribute('src', url);
    } else if (element.tagName === 'video') {
      updateAttribute('src', url);
    } else {
      onUpdate({
        styles: {
          ...element.styles,
          backgroundImage: `url(${url})`,
          backgroundSize: element.styles.backgroundSize || 'cover',
          backgroundPosition: element.styles.backgroundPosition || 'center',
          backgroundRepeat: element.styles.backgroundRepeat || 'no-repeat'
        }
      });
    }
  };

  // Parse dimension value (e.g., "100px" -> 100)
  const parseDimension = (value: string | undefined): number => {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // Check if value is percentage
  const isPercentage = (value: string | undefined): boolean => {
    return value?.includes('%') || false;
  };
  
  return (
    <div className="h-full flex flex-col bg-background border-l overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
            {element.tagName}
          </span>
          <span className="text-sm text-muted-foreground">
            {elementType === 'container' ? 'Kontener' : 
             elementType === 'heading' ? 'Nagłówek' :
             elementType === 'text' ? 'Tekst' :
             elementType === 'image' ? 'Obrazek' :
             elementType === 'button' ? 'Przycisk' :
             elementType === 'link' ? 'Link' : 'Element'}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Quick Actions */}
      <div className="p-2 border-b flex gap-1.5 shrink-0">
        <Button variant="outline" size="sm" onClick={onDuplicate} className="flex-1 h-8">
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Duplikuj
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} className="flex-1 h-8">
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Usuń
        </Button>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full grid grid-cols-3 h-10 rounded-none border-b shrink-0 bg-muted/30">
          <TabsTrigger value="style" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Palette className="w-3.5 h-3.5" />
            Wygląd
          </TabsTrigger>
          <TabsTrigger value="spacing" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Move className="w-3.5 h-3.5" />
            Odstępy
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Type className="w-3.5 h-3.5" />
            Treść
          </TabsTrigger>
        </TabsList>
        
        {/* Style Tab - Visual controls */}
        <TabsContent value="style" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              
              {/* Size Section */}
              <Section title="Rozmiar" icon={<Maximize2 className="w-4 h-4" />}>
                <div className="space-y-4">
                  {/* Width with slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Szerokość</Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        {element.styles.width || 'auto'}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Slider
                        value={[isPercentage(element.styles.width) ? parseDimension(element.styles.width) : 100]}
                        onValueChange={([v]) => updateStyle('width', `${v}%`)}
                        min={10}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <Button 
                        variant={!element.styles.width || element.styles.width === 'auto' ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => updateStyle('width', 'auto')}
                      >
                        Auto
                      </Button>
                    </div>
                    <DebouncedStyleInput
                      value={element.styles.width || ''}
                      onFinalChange={(v) => updateStyle('width', normalizeStyleValue('width', v))}
                      normalizeValue={(v) => normalizeStyleValue('width', v)}
                      placeholder="np. 100%, 400px, auto"
                      className="h-8"
                    />
                  </div>
                  
                  {/* Height */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Wysokość</Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        {element.styles.height || 'auto'}
                      </span>
                    </div>
                    <DebouncedStyleInput
                      value={element.styles.height || ''}
                      onFinalChange={(v) => updateStyle('height', normalizeStyleValue('height', v))}
                      normalizeValue={(v) => normalizeStyleValue('height', v)}
                      placeholder="np. auto, 200px, 100vh"
                      className="h-8"
                    />
                  </div>
                  
                  {/* Max width */}
                  <div className="space-y-2">
                    <Label className="text-xs">Maks. szerokość</Label>
                    <DebouncedStyleInput
                      value={element.styles.maxWidth || ''}
                      onFinalChange={(v) => updateStyle('maxWidth', normalizeStyleValue('maxWidth', v))}
                      normalizeValue={(v) => normalizeStyleValue('maxWidth', v)}
                      placeholder="np. 1200px, 100%"
                      className="h-8"
                    />
                  </div>
                </div>
              </Section>
              
              {/* Colors Section */}
              <Section title="Kolory" icon={<Palette className="w-4 h-4" />}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Background color */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tło</Label>
                      <div className="flex gap-1.5">
                        <Input
                          type="color"
                          value={element.styles.backgroundColor || '#ffffff'}
                          onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                          className="w-10 h-8 p-1 cursor-pointer"
                        />
                        <DebouncedStyleInput
                          value={element.styles.backgroundColor || ''}
                          onFinalChange={(v) => updateStyle('backgroundColor', v)}
                          placeholder="#fff"
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                    </div>
                    
                    {/* Text color */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tekst</Label>
                      <div className="flex gap-1.5">
                        <Input
                          type="color"
                          value={element.styles.color || '#000000'}
                          onChange={(e) => updateStyle('color', e.target.value)}
                          className="w-10 h-8 p-1 cursor-pointer"
                        />
                        <DebouncedStyleInput
                          value={element.styles.color || ''}
                          onFinalChange={(v) => updateStyle('color', v)}
                          placeholder="#000"
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick transparent button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => updateStyle('backgroundColor', 'transparent')}
                  >
                    Ustaw tło jako przezroczyste
                  </Button>
                </div>
              </Section>
              
              {/* Appearance Section */}
              <Section title="Efekty" icon={<Box className="w-4 h-4" />}>
                <div className="space-y-4">
                  {/* Border Radius Presets */}
                  <StylePresets
                    label="Zaokrąglenie rogów"
                    options={borderRadiusPresets}
                    currentValue={element.styles.borderRadius}
                    onSelect={(v) => updateStyle('borderRadius', v)}
                    columns={6}
                  />
                  
                  {/* Box Shadow Presets */}
                  <StylePresets
                    label="Cień"
                    options={boxShadowPresets}
                    currentValue={element.styles.boxShadow}
                    onSelect={(v) => updateStyle('boxShadow', v)}
                    columns={5}
                  />
                  
                  {/* Opacity Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Przezroczystość</Label>
                      <span className="text-xs text-muted-foreground">
                        {Math.round((parseFloat(element.styles.opacity || '1')) * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[parseFloat(element.styles.opacity || '1') * 100]}
                      onValueChange={([v]) => updateStyle('opacity', String(v / 100))}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                  
                  {/* Border */}
                  <div className="space-y-2">
                    <Label className="text-xs">Obramowanie</Label>
                    <DebouncedStyleInput
                      value={element.styles.border || ''}
                      onFinalChange={(v) => updateStyle('border', v)}
                      placeholder="np. 1px solid #ccc"
                      className="h-8"
                    />
                  </div>
                </div>
              </Section>
              
              {/* Quick Layouts for containers */}
              {elementType === 'container' && (
                <Section title="Układ kolumn" icon={<Columns2 className="w-4 h-4" />}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-1.5">
                      <Button
                        variant={element.styles.display !== 'grid' && element.styles.display !== 'flex' ? 'default' : 'outline'}
                        size="sm"
                        className="h-9"
                        onClick={() => onUpdate({
                          styles: {
                            ...element.styles,
                            display: 'block',
                            gridTemplateColumns: undefined,
                            gap: undefined
                          }
                        })}
                      >
                        1
                      </Button>
                      <Button
                        variant={element.styles.gridTemplateColumns === 'repeat(2, 1fr)' ? 'default' : 'outline'}
                        size="sm"
                        className="h-9 gap-0.5"
                        onClick={() => onUpdate({
                          styles: {
                            ...element.styles,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: element.styles.gap || '1rem'
                          }
                        })}
                      >
                        <Columns2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={element.styles.gridTemplateColumns === 'repeat(3, 1fr)' ? 'default' : 'outline'}
                        size="sm"
                        className="h-9 gap-0.5"
                        onClick={() => onUpdate({
                          styles: {
                            ...element.styles,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: element.styles.gap || '1rem'
                          }
                        })}
                      >
                        <Columns3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={element.styles.gridTemplateColumns === 'repeat(4, 1fr)' ? 'default' : 'outline'}
                        size="sm"
                        className="h-9"
                        onClick={() => onUpdate({
                          styles: {
                            ...element.styles,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: element.styles.gap || '1rem'
                          }
                        })}
                      >
                        4
                      </Button>
                    </div>
                    
                    {/* Gap presets */}
                    {(element.styles.display === 'grid' || element.styles.display === 'flex') && (
                      <StylePresets
                        label="Odstęp między elementami"
                        options={gapPresets}
                        currentValue={element.styles.gap}
                        onSelect={(v) => updateStyle('gap', v)}
                        columns={5}
                      />
                    )}
                  </div>
                </Section>
              )}
              
              {/* Media for images */}
              {elementType === 'image' && (
                <Section title="Obrazek" icon={<Image className="w-4 h-4" />}>
                  <div className="space-y-3">
                    <MediaUpload
                      onMediaUploaded={handleMediaUpload}
                      currentMediaUrl={element.attributes.src}
                      allowedTypes={['image']}
                      compact
                    />
                    <div className="space-y-2">
                      <Label className="text-xs">Opis (alt)</Label>
                      <DebouncedStyleInput
                        value={element.attributes.alt || ''}
                        onFinalChange={(v) => updateAttribute('alt', v)}
                        placeholder="Opis obrazka dla dostępności"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Dopasowanie</Label>
                      <div className="grid grid-cols-4 gap-1">
                        {['cover', 'contain', 'fill', 'none'].map((fit) => (
                          <Button
                            key={fit}
                            variant={element.styles.objectFit === fit ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => updateStyle('objectFit', fit)}
                          >
                            {fit === 'cover' ? 'Wypełnij' : 
                             fit === 'contain' ? 'Dopasuj' : 
                             fit === 'fill' ? 'Rozciągnij' : 'Brak'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Section>
              )}
              
              {/* Video for video elements */}
              {element.tagName === 'video' && (
                <Section title="Wideo" icon={<Video className="w-4 h-4" />}>
                  <MediaUpload
                    onMediaUploaded={handleMediaUpload}
                    currentMediaUrl={element.attributes.src}
                    allowedTypes={['video']}
                    compact
                  />
                </Section>
              )}
              
              {/* Background for containers */}
              {elementType === 'container' && (
                <Section title="Tło obrazkowe" icon={<FileImage className="w-4 h-4" />} defaultOpen={false}>
                  <div className="space-y-3">
                    <MediaUpload
                      onMediaUploaded={handleMediaUpload}
                      currentMediaUrl={element.styles.backgroundImage?.replace(/url\(['"]?|['"]?\)/g, '')}
                      allowedTypes={['image']}
                      compact
                    />
                    {element.styles.backgroundImage && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs">Rozmiar tła</Label>
                          <div className="grid grid-cols-3 gap-1">
                            {['cover', 'contain', 'auto'].map((size) => (
                              <Button
                                key={size}
                                variant={element.styles.backgroundSize === size ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => updateStyle('backgroundSize', size)}
                              >
                                {size === 'cover' ? 'Wypełnij' : size === 'contain' ? 'Dopasuj' : 'Auto'}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() => updateStyle('backgroundImage', '')}
                        >
                          Usuń tło obrazkowe
                        </Button>
                      </>
                    )}
                  </div>
                </Section>
              )}
              
              {/* Advanced Section (collapsed) */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2.5 hover:bg-muted/50 rounded-lg transition-colors mt-2 border border-dashed">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground flex-1 text-left">Zaawansowane opcje</span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="px-2 pb-3 pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Position</Label>
                      <Select 
                        value={element.styles.position || ''} 
                        onValueChange={(v) => updateStyle('position', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="static">Static</SelectItem>
                          <SelectItem value="relative">Relative</SelectItem>
                          <SelectItem value="absolute">Absolute</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Z-index</Label>
                      <DebouncedStyleInput
                        value={element.styles.zIndex || ''}
                        onFinalChange={(v) => updateStyle('zIndex', v)}
                        placeholder="auto"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Overflow</Label>
                    <div className="grid grid-cols-4 gap-1">
                      {['visible', 'hidden', 'scroll', 'auto'].map((ov) => (
                        <Button
                          key={ov}
                          variant={element.styles.overflow === ov ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => updateStyle('overflow', ov)}
                        >
                          {ov}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Klasa CSS</Label>
                    <DebouncedStyleInput
                      value={element.attributes.class || ''}
                      onFinalChange={(v) => updateAttribute('class', v)}
                      placeholder="np. my-custom-class"
                      className="h-8"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </TabsContent>
        
        {/* Spacing Tab */}
        <TabsContent value="spacing" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <VisualSpacingEditor
                styles={element.styles}
                onStyleChange={updateStyle}
              />
            </div>
          </ScrollArea>
        </TabsContent>
        
        {/* Content Tab */}
        <TabsContent value="content" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Text Content */}
              {(elementType === 'heading' || elementType === 'text' || elementType === 'button' || elementType === 'link') && (
                <div className="space-y-2">
                  <Label className="text-xs">Treść tekstowa</Label>
                  <Textarea
                    value={element.textContent}
                    onChange={(e) => onUpdate({ textContent: e.target.value })}
                    rows={4}
                    className="text-sm"
                    placeholder="Wpisz tekst..."
                  />
                </div>
              )}
              
              {/* Typography */}
              {(elementType === 'heading' || elementType === 'text' || elementType === 'button' || elementType === 'link') && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Rozmiar tekstu</Label>
                    <div className="flex gap-2">
                      <DebouncedStyleInput
                        value={element.styles.fontSize || ''}
                        onFinalChange={(v) => updateStyle('fontSize', normalizeStyleValue('fontSize', v))}
                        normalizeValue={(v) => normalizeStyleValue('fontSize', v)}
                        placeholder="np. 16px, 1.5rem"
                        className="flex-1 h-8"
                      />
                    </div>
                  </div>
                  
                  <StylePresets
                    label="Grubość tekstu"
                    options={fontWeightPresets}
                    currentValue={element.styles.fontWeight}
                    onSelect={(v) => updateStyle('fontWeight', v)}
                    columns={5}
                  />
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Wyrównanie</Label>
                    <div className="flex gap-1">
                      {[
                        { value: 'left', icon: <AlignLeft className="w-4 h-4" /> },
                        { value: 'center', icon: <AlignCenter className="w-4 h-4" /> },
                        { value: 'right', icon: <AlignRight className="w-4 h-4" /> },
                      ].map(({ value, icon }) => (
                        <Button
                          key={value}
                          variant={element.styles.textAlign === value ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 h-8"
                          onClick={() => updateStyle('textAlign', value)}
                        >
                          {icon}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {/* Link URL */}
              {elementType === 'link' && (
                <div className="space-y-2">
                  <Label className="text-xs">Adres URL</Label>
                  <DebouncedStyleInput
                    value={element.attributes.href || ''}
                    onFinalChange={(v) => updateAttribute('href', v)}
                    placeholder="https://..."
                    className="h-8"
                  />
                  <div className="flex gap-1">
                    <Button
                      variant={element.attributes.target !== '_blank' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => updateAttribute('target', '_self')}
                    >
                      Ta sama karta
                    </Button>
                    <Button
                      variant={element.attributes.target === '_blank' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => updateAttribute('target', '_blank')}
                    >
                      Nowa karta
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Icon picker */}
              {(element.tagName === 'i' || element.attributes['data-lucide']) && (
                <div className="space-y-2">
                  <Label className="text-xs">Ikona</Label>
                  <IconPicker
                    value={element.attributes['data-lucide'] || null}
                    onChange={(name) => name && updateAttribute('data-lucide', name)}
                    trigger={
                      <Button variant="outline" size="sm" className="w-full justify-start h-8">
                        {element.attributes['data-lucide'] || 'Wybierz ikonę...'}
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
