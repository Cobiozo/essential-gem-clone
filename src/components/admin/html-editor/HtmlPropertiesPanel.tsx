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
  Bold, Trash2, Copy, X, FileImage, Settings, Wand2, Play
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { IconPicker } from '@/components/cms/IconPicker';
import { MediaUpload } from '@/components/MediaUpload';

interface HtmlPropertiesPanelProps {
  element: ParsedElement | null;
  onUpdate: (updates: Partial<ParsedElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}

export const HtmlPropertiesPanel: React.FC<HtmlPropertiesPanelProps> = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('content');

  if (!element) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-4 text-center">
        <div>
          <Box className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Kliknij element w podglądzie, aby go edytować</p>
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
  
  const removeStyle = (key: string) => {
    const newStyles = { ...element.styles };
    delete newStyles[key];
    onUpdate({ styles: newStyles });
  };
  
  const CollapsibleSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = 
    ({ title, icon, children, defaultOpen = true }) => (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded-lg transition-colors">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-3 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );

  // Handle media upload
  const handleMediaUpload = (url: string, type: string) => {
    if (element.tagName === 'img') {
      updateAttribute('src', url);
    } else if (element.tagName === 'video') {
      updateAttribute('src', url);
    } else {
      // For containers - set as background
      updateStyle('backgroundImage', `url(${url})`);
      updateStyle('backgroundSize', 'cover');
      updateStyle('backgroundPosition', 'center');
    }
  };

  // Handle icon selection
  const handleIconSelect = (iconName: string | null) => {
    if (iconName) {
      updateAttribute('data-lucide', iconName);
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between bg-muted/30">
        <div>
          <h3 className="font-semibold text-sm">Edytuj element</h3>
          <p className="text-xs text-muted-foreground">&lt;{element.tagName}&gt;</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Actions */}
      <div className="p-2 border-b flex gap-1">
        <Button variant="outline" size="sm" onClick={onDuplicate} className="flex-1">
          <Copy className="w-3 h-3 mr-1" /> Duplikuj
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} className="flex-1">
          <Trash2 className="w-3 h-3 mr-1" /> Usuń
        </Button>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-4 h-9 rounded-none border-b">
          <TabsTrigger value="content" className="text-xs">
            <Type className="w-3.5 h-3.5 mr-1" />
            Treść
          </TabsTrigger>
          <TabsTrigger value="styles" className="text-xs">
            <Palette className="w-3.5 h-3.5 mr-1" />
            Style
          </TabsTrigger>
          <TabsTrigger value="media" className="text-xs">
            <FileImage className="w-3.5 h-3.5 mr-1" />
            Media
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">
            <Settings className="w-3.5 h-3.5 mr-1" />
            Zaaw.
          </TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1">
          {/* Content Tab */}
          <TabsContent value="content" className="m-0 p-2 space-y-1">
            {/* Text Content */}
            {(elementType === 'heading' || elementType === 'text' || elementType === 'button' || elementType === 'link') && (
              <CollapsibleSection title="Tekst" icon={<Type className="w-4 h-4" />}>
                <div className="space-y-2">
                  <Label className="text-xs">Treść</Label>
                  <Textarea
                    value={element.textContent}
                    onChange={(e) => onUpdate({ textContent: e.target.value })}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </CollapsibleSection>
            )}
            
            {/* Link properties */}
            {elementType === 'link' && (
              <CollapsibleSection title="Link" icon={<Link className="w-4 h-4" />}>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">URL</Label>
                    <Input
                      value={element.attributes.href || ''}
                      onChange={(e) => updateAttribute('href', e.target.value)}
                      placeholder="https://..."
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Otwórz w</Label>
                    <Select 
                      value={element.attributes.target || '_self'} 
                      onValueChange={(v) => updateAttribute('target', v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_self">Ta sama karta</SelectItem>
                        <SelectItem value="_blank">Nowa karta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleSection>
            )}
            
            {/* Icon */}
            {(element.tagName === 'i' || element.attributes['data-lucide']) && (
              <CollapsibleSection title="Ikona" icon={<Wand2 className="w-4 h-4" />}>
                <div className="space-y-2">
                  <Label className="text-xs">Ikona Lucide</Label>
                  <IconPicker
                    value={element.attributes['data-lucide'] || null}
                    onChange={handleIconSelect}
                    trigger={
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        {element.attributes['data-lucide'] || 'Wybierz ikonę'}
                      </Button>
                    }
                  />
                </div>
              </CollapsibleSection>
            )}
            
            {/* Button specific */}
            {elementType === 'button' && (
              <CollapsibleSection title="Przycisk" icon={<Play className="w-4 h-4" />}>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Typ</Label>
                    <Select 
                      value={element.attributes.type || 'button'} 
                      onValueChange={(v) => updateAttribute('type', v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="button">Button</SelectItem>
                        <SelectItem value="submit">Submit</SelectItem>
                        <SelectItem value="reset">Reset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleSection>
            )}
          </TabsContent>
          
          {/* Styles Tab */}
          <TabsContent value="styles" className="m-0 p-2 space-y-1">
            {/* Typography */}
            <CollapsibleSection title="Typografia" icon={<Bold className="w-4 h-4" />}>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Rozmiar fontu</Label>
                  <Input
                    value={element.styles.fontSize || ''}
                    onChange={(e) => updateStyle('fontSize', e.target.value)}
                    placeholder="16px"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Grubość fontu</Label>
                  <Select 
                    value={element.styles.fontWeight || ''} 
                    onValueChange={(v) => updateStyle('fontWeight', v)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Lekki (300)</SelectItem>
                      <SelectItem value="400">Normalny (400)</SelectItem>
                      <SelectItem value="500">Średni (500)</SelectItem>
                      <SelectItem value="600">Pogrubiony (600)</SelectItem>
                      <SelectItem value="700">Gruby (700)</SelectItem>
                      <SelectItem value="800">Bardzo gruby (800)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Wyrównanie tekstu</Label>
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
                        onClick={() => updateStyle('textAlign', value)}
                      >
                        {icon}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Wysokość linii</Label>
                  <Input
                    value={element.styles.lineHeight || ''}
                    onChange={(e) => updateStyle('lineHeight', e.target.value)}
                    placeholder="1.5"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Odstęp liter</Label>
                  <Input
                    value={element.styles.letterSpacing || ''}
                    onChange={(e) => updateStyle('letterSpacing', e.target.value)}
                    placeholder="0px"
                    className="text-sm"
                  />
                </div>
              </div>
            </CollapsibleSection>
            
            {/* Colors */}
            <CollapsibleSection title="Kolory" icon={<Palette className="w-4 h-4" />}>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Kolor tekstu</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={element.styles.color || '#000000'}
                      onChange={(e) => updateStyle('color', e.target.value)}
                      className="w-12 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      value={element.styles.color || ''}
                      onChange={(e) => updateStyle('color', e.target.value)}
                      placeholder="#000000"
                      className="flex-1 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Kolor tła</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={element.styles.backgroundColor || '#ffffff'}
                      onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                      className="w-12 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      value={element.styles.backgroundColor || ''}
                      onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                      placeholder="transparent"
                      className="flex-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </CollapsibleSection>
            
            {/* Spacing */}
            <CollapsibleSection title="Odstępy" icon={<Box className="w-4 h-4" />}>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Padding</Label>
                  <Input
                    value={element.styles.padding || ''}
                    onChange={(e) => updateStyle('padding', e.target.value)}
                    placeholder="10px"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Margin</Label>
                  <Input
                    value={element.styles.margin || ''}
                    onChange={(e) => updateStyle('margin', e.target.value)}
                    placeholder="0px"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Border radius</Label>
                  <Input
                    value={element.styles.borderRadius || ''}
                    onChange={(e) => updateStyle('borderRadius', e.target.value)}
                    placeholder="0px"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Border</Label>
                  <Input
                    value={element.styles.border || ''}
                    onChange={(e) => updateStyle('border', e.target.value)}
                    placeholder="1px solid #ccc"
                    className="text-sm"
                  />
                </div>
              </div>
            </CollapsibleSection>
          </TabsContent>
          
          {/* Media Tab */}
          <TabsContent value="media" className="m-0 p-2 space-y-1">
            {/* Image properties */}
            {elementType === 'image' && (
              <CollapsibleSection title="Obrazek" icon={<Image className="w-4 h-4" />}>
                <div className="space-y-3">
                  <MediaUpload
                    onMediaUploaded={handleMediaUpload}
                    currentMediaUrl={element.attributes.src}
                    allowedTypes={['image']}
                    compact
                  />
                  <div className="space-y-2">
                    <Label className="text-xs">Alt tekst</Label>
                    <Input
                      value={element.attributes.alt || ''}
                      onChange={(e) => updateAttribute('alt', e.target.value)}
                      placeholder="Opis obrazka"
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Szerokość</Label>
                      <Input
                        value={element.styles.width || ''}
                        onChange={(e) => updateStyle('width', e.target.value)}
                        placeholder="auto"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Wysokość</Label>
                      <Input
                        value={element.styles.height || ''}
                        onChange={(e) => updateStyle('height', e.target.value)}
                        placeholder="auto"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Object Fit</Label>
                    <Select 
                      value={element.styles.objectFit || 'cover'} 
                      onValueChange={(v) => updateStyle('objectFit', v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="contain">Contain</SelectItem>
                        <SelectItem value="fill">Fill</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleSection>
            )}
            
            {/* Video */}
            {element.tagName === 'video' && (
              <CollapsibleSection title="Wideo" icon={<Play className="w-4 h-4" />}>
                <div className="space-y-3">
                  <MediaUpload
                    onMediaUploaded={handleMediaUpload}
                    currentMediaUrl={element.attributes.src}
                    allowedTypes={['video']}
                    compact
                  />
                  <div className="space-y-2">
                    <Label className="text-xs">Autoplay</Label>
                    <Select 
                      value={element.attributes.autoplay ? 'true' : 'false'} 
                      onValueChange={(v) => updateAttribute('autoplay', v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Tak</SelectItem>
                        <SelectItem value="false">Nie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleSection>
            )}
            
            {/* Container background */}
            {elementType === 'container' && (
              <CollapsibleSection title="Tło kontenera" icon={<Image className="w-4 h-4" />}>
                <div className="space-y-3">
                  <Label className="text-xs">Obrazek tła</Label>
                  <MediaUpload
                    onMediaUploaded={handleMediaUpload}
                    currentMediaUrl={element.styles.backgroundImage?.replace(/url\(['"]?([^'"]+)['"]?\)/, '$1')}
                    allowedTypes={['image']}
                    compact
                  />
                  <div className="space-y-2">
                    <Label className="text-xs">Rozmiar tła</Label>
                    <Select 
                      value={element.styles.backgroundSize || 'cover'} 
                      onValueChange={(v) => updateStyle('backgroundSize', v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="contain">Contain</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="100% 100%">Rozciągnięte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Pozycja tła</Label>
                    <Select 
                      value={element.styles.backgroundPosition || 'center'} 
                      onValueChange={(v) => updateStyle('backgroundPosition', v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="center">Środek</SelectItem>
                        <SelectItem value="top">Góra</SelectItem>
                        <SelectItem value="bottom">Dół</SelectItem>
                        <SelectItem value="left">Lewo</SelectItem>
                        <SelectItem value="right">Prawo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Gradient tła</Label>
                    <Input
                      value={element.styles.background || ''}
                      onChange={(e) => updateStyle('background', e.target.value)}
                      placeholder="linear-gradient(135deg, #667eea, #764ba2)"
                      className="text-sm"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            )}
          </TabsContent>
          
          {/* Advanced Tab */}
          <TabsContent value="advanced" className="m-0 p-2 space-y-1">
            {/* Dimensions */}
            <CollapsibleSection title="Wymiary" icon={<Box className="w-4 h-4" />}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Szerokość</Label>
                    <Input
                      value={element.styles.width || ''}
                      onChange={(e) => updateStyle('width', e.target.value)}
                      placeholder="auto"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Wysokość</Label>
                    <Input
                      value={element.styles.height || ''}
                      onChange={(e) => updateStyle('height', e.target.value)}
                      placeholder="auto"
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Min szerokość</Label>
                    <Input
                      value={element.styles.minWidth || ''}
                      onChange={(e) => updateStyle('minWidth', e.target.value)}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Max szerokość</Label>
                    <Input
                      value={element.styles.maxWidth || ''}
                      onChange={(e) => updateStyle('maxWidth', e.target.value)}
                      placeholder="none"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </CollapsibleSection>
            
            {/* Effects */}
            <CollapsibleSection title="Efekty" icon={<Wand2 className="w-4 h-4" />}>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Cień</Label>
                  <Input
                    value={element.styles.boxShadow || ''}
                    onChange={(e) => updateStyle('boxShadow', e.target.value)}
                    placeholder="0 4px 6px rgba(0,0,0,0.1)"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Przezroczystość</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[parseFloat(element.styles.opacity || '1') * 100]}
                      onValueChange={([v]) => updateStyle('opacity', (v / 100).toString())}
                      min={0}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-xs w-10 text-right">
                      {Math.round(parseFloat(element.styles.opacity || '1') * 100)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Transformacja</Label>
                  <Input
                    value={element.styles.transform || ''}
                    onChange={(e) => updateStyle('transform', e.target.value)}
                    placeholder="rotate(0deg) scale(1)"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Przejście (transition)</Label>
                  <Input
                    value={element.styles.transition || ''}
                    onChange={(e) => updateStyle('transition', e.target.value)}
                    placeholder="all 0.3s ease"
                    className="text-sm"
                  />
                </div>
              </div>
            </CollapsibleSection>
            
            {/* CSS Classes */}
            <CollapsibleSection title="Klasy CSS" icon={<Settings className="w-4 h-4" />}>
              <div className="space-y-2">
                <Label className="text-xs">Klasy Tailwind/CSS</Label>
                <Textarea
                  value={element.attributes.class || ''}
                  onChange={(e) => updateAttribute('class', e.target.value)}
                  placeholder="flex items-center gap-4..."
                  rows={3}
                  className="text-sm font-mono"
                />
              </div>
            </CollapsibleSection>
            
            {/* Custom ID */}
            <CollapsibleSection title="Identyfikatory" icon={<Settings className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">ID elementu</Label>
                  <Input
                    value={element.attributes.id || ''}
                    onChange={(e) => updateAttribute('id', e.target.value)}
                    placeholder="my-element"
                    className="text-sm font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Data atrybuty</Label>
                  <Input
                    value={element.attributes['data-custom'] || ''}
                    onChange={(e) => updateAttribute('data-custom', e.target.value)}
                    placeholder="custom-value"
                    className="text-sm font-mono"
                  />
                </div>
              </div>
            </CollapsibleSection>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
