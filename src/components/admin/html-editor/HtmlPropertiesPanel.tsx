import React from 'react';
import { ParsedElement, getElementType } from './types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Type, Link, Image, Box, Palette, AlignLeft, AlignCenter, AlignRight, 
  Bold, Trash2, Copy, MoveUp, MoveDown, X
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Text Content */}
          {(elementType === 'heading' || elementType === 'text' || elementType === 'button' || elementType === 'link') && (
            <CollapsibleSection title="Treść" icon={<Type className="w-4 h-4" />}>
              <div className="space-y-2">
                <Label className="text-xs">Tekst</Label>
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
          
          {/* Image properties */}
          {elementType === 'image' && (
            <CollapsibleSection title="Obrazek" icon={<Image className="w-4 h-4" />}>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Źródło (URL)</Label>
                  <Input
                    value={element.attributes.src || ''}
                    onChange={(e) => updateAttribute('src', e.target.value)}
                    placeholder="https://..."
                    className="text-sm"
                  />
                </div>
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
              </div>
            </CollapsibleSection>
          )}
          
          {/* Typography */}
          <CollapsibleSection title="Typografia" icon={<Bold className="w-4 h-4" />} defaultOpen={false}>
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
            </div>
          </CollapsibleSection>
          
          {/* Colors */}
          <CollapsibleSection title="Kolory" icon={<Palette className="w-4 h-4" />} defaultOpen={false}>
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
          <CollapsibleSection title="Odstępy" icon={<Box className="w-4 h-4" />} defaultOpen={false}>
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
            </div>
          </CollapsibleSection>
          
          {/* CSS Classes */}
          <CollapsibleSection title="Klasy CSS" icon={<Box className="w-4 h-4" />} defaultOpen={false}>
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
        </div>
      </ScrollArea>
    </div>
  );
};
