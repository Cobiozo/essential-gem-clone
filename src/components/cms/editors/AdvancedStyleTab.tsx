import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AdvancedStyleTabProps {
  item: any;
  onUpdate: (updates: Partial<any>) => void;
  showDimensions?: boolean;
  showTypography?: boolean;
  showColors?: boolean;
  showBorder?: boolean;
  showSpacing?: boolean;
  showEffects?: boolean;
  showAnimation?: boolean;
  showAdvanced?: boolean;
}

const CollapsibleSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full flex justify-between items-center p-3 h-auto">
          <span className="font-medium text-sm">{title}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-3 pt-0 space-y-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const AdvancedStyleTab: React.FC<AdvancedStyleTabProps> = ({ 
  item, 
  onUpdate,
  showDimensions = true,
  showTypography = true,
  showColors = true,
  showBorder = true,
  showSpacing = true,
  showEffects = true,
  showAnimation = true,
  showAdvanced = true,
}) => {
  return (
    <div className="space-y-3">
      {/* Dimensions */}
      {showDimensions && (
        <CollapsibleSection title="📐 Wymiary" defaultOpen>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Szerokość</Label>
              <Select
                value={item.width_type || 'auto'}
                onValueChange={(value) => onUpdate({ width_type: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="full">100%</SelectItem>
                  <SelectItem value="fit">Dopasuj</SelectItem>
                  <SelectItem value="custom">Własna</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {item.width_type === 'custom' && (
              <div className="space-y-2">
                <Label className="text-xs">Szerokość (px)</Label>
                <Input
                  type="number"
                  value={item.custom_width || ''}
                  onChange={(e) => onUpdate({ custom_width: parseInt(e.target.value) || null })}
                  placeholder="200"
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Wysokość</Label>
              <Select
                value={item.height_type || 'auto'}
                onValueChange={(value) => onUpdate({ height_type: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="full">100%</SelectItem>
                  <SelectItem value="custom">Własna</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {item.height_type === 'custom' && (
              <div className="space-y-2">
                <Label className="text-xs">Wysokość (px)</Label>
                <Input
                  type="number"
                  value={item.custom_height || ''}
                  onChange={(e) => onUpdate({ custom_height: parseInt(e.target.value) || null })}
                  placeholder="50"
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Max szerokość (px)</Label>
              <Input
                type="number"
                value={item.max_width || ''}
                onChange={(e) => onUpdate({ max_width: parseInt(e.target.value) || null })}
                placeholder="Brak limitu"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Max wysokość (px)</Label>
              <Input
                type="number"
                value={item.max_height || ''}
                onChange={(e) => onUpdate({ max_height: parseInt(e.target.value) || null })}
                placeholder="Brak limitu"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Min szerokość (px)</Label>
              <Input
                type="number"
                value={item.min_width || ''}
                onChange={(e) => onUpdate({ min_width: parseInt(e.target.value) || null })}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Min wysokość (px)</Label>
              <Input
                type="number"
                value={item.min_height || ''}
                onChange={(e) => onUpdate({ min_height: parseInt(e.target.value) || null })}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Colors & Background */}
      {showColors && (
        <CollapsibleSection title="🎨 Kolory i tło" defaultOpen>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Kolor tekstu</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={item.text_color || '#000000'}
                  onChange={(e) => onUpdate({ text_color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  type="text"
                  value={item.text_color || ''}
                  onChange={(e) => onUpdate({ text_color: e.target.value })}
                  placeholder="#000000 lub hsl(...)"
                  className="flex-1 h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Kolor tła</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={item.background_color || '#ffffff'}
                  onChange={(e) => onUpdate({ background_color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  type="text"
                  value={item.background_color || ''}
                  onChange={(e) => onUpdate({ background_color: e.target.value })}
                  placeholder="#ffffff lub hsl(...)"
                  className="flex-1 h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Gradient tła</Label>
              <Input
                type="text"
                value={item.background_gradient || ''}
                onChange={(e) => onUpdate({ background_gradient: e.target.value })}
                placeholder="linear-gradient(90deg, #ff0000, #0000ff)"
                className="h-8 text-xs"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-[10px] h-6 px-2"
                  onClick={() => onUpdate({ background_gradient: 'linear-gradient(90deg, #667eea, #764ba2)' })}
                >
                  Fiolet
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-[10px] h-6 px-2"
                  onClick={() => onUpdate({ background_gradient: 'linear-gradient(90deg, #11998e, #38ef7d)' })}
                >
                  Zielony
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-[10px] h-6 px-2"
                  onClick={() => onUpdate({ background_gradient: 'linear-gradient(90deg, #ee0979, #ff6a00)' })}
                >
                  Ogień
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-[10px] h-6 px-2"
                  onClick={() => onUpdate({ background_gradient: 'linear-gradient(90deg, #2193b0, #6dd5ed)' })}
                >
                  Ocean
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-[10px] h-6 px-2"
                  onClick={() => onUpdate({ background_gradient: '' })}
                >
                  Usuń
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Przezroczystość (%)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.opacity ?? 100]}
                  onValueChange={([value]) => onUpdate({ opacity: value })}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.opacity ?? 100}%</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Typography */}
      {showTypography && (
        <CollapsibleSection title="✍️ Typografia">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Rozmiar czcionki (px)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.font_size || 16]}
                  onValueChange={([value]) => onUpdate({ font_size: value })}
                  min={8}
                  max={96}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={item.font_size || 16}
                  onChange={(e) => onUpdate({ font_size: parseInt(e.target.value) || 16 })}
                  className="w-16 h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Grubość czcionki</Label>
              <Select
                value={String(item.font_weight || 400)}
                onValueChange={(value) => onUpdate({ font_weight: parseInt(value) })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">Thin (100)</SelectItem>
                  <SelectItem value="200">Extra Light (200)</SelectItem>
                  <SelectItem value="300">Light (300)</SelectItem>
                  <SelectItem value="400">Normal (400)</SelectItem>
                  <SelectItem value="500">Medium (500)</SelectItem>
                  <SelectItem value="600">Semibold (600)</SelectItem>
                  <SelectItem value="700">Bold (700)</SelectItem>
                  <SelectItem value="800">Extra Bold (800)</SelectItem>
                  <SelectItem value="900">Black (900)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Wyrównanie tekstu</Label>
              <Select
                value={item.text_align || 'center'}
                onValueChange={(value) => onUpdate({ text_align: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Do lewej</SelectItem>
                  <SelectItem value="center">Wyśrodkowany</SelectItem>
                  <SelectItem value="right">Do prawej</SelectItem>
                  <SelectItem value="justify">Wyjustowany</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Transformacja tekstu</Label>
              <Select
                value={item.text_transform || 'none'}
                onValueChange={(value) => onUpdate({ text_transform: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak</SelectItem>
                  <SelectItem value="uppercase">WIELKIE LITERY</SelectItem>
                  <SelectItem value="lowercase">małe litery</SelectItem>
                  <SelectItem value="capitalize">Każde Słowo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Odstęp między literami (px)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.letter_spacing || 0]}
                  onValueChange={([value]) => onUpdate({ letter_spacing: value })}
                  min={-5}
                  max={20}
                  step={0.5}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.letter_spacing || 0}px</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Wysokość linii</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.line_height || 1.5]}
                  onValueChange={([value]) => onUpdate({ line_height: value })}
                  min={0.8}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.line_height || 1.5}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Rodzina czcionki</Label>
              <Select
                value={item.font_family || 'inherit'}
                onValueChange={(value) => onUpdate({ font_family: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Domyślna</SelectItem>
                  <SelectItem value="sans-serif">Sans-serif</SelectItem>
                  <SelectItem value="serif">Serif</SelectItem>
                  <SelectItem value="monospace">Monospace</SelectItem>
                  <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                  <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                  <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                  <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                  <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                  <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Spacing */}
      {showSpacing && (
        <CollapsibleSection title="📏 Odstępy">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Padding wewnętrzny (px)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.padding || 0]}
                  onValueChange={([value]) => onUpdate({ padding: value })}
                  min={0}
                  max={100}
                  step={2}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={item.padding || 0}
                  onChange={(e) => onUpdate({ padding: parseInt(e.target.value) || 0 })}
                  className="w-16 h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Padding góra (px)</Label>
                <Input
                  type="number"
                  value={item.padding_top || ''}
                  onChange={(e) => onUpdate({ padding_top: parseInt(e.target.value) || null })}
                  placeholder="Auto"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Padding dół (px)</Label>
                <Input
                  type="number"
                  value={item.padding_bottom || ''}
                  onChange={(e) => onUpdate({ padding_bottom: parseInt(e.target.value) || null })}
                  placeholder="Auto"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Padding lewo (px)</Label>
                <Input
                  type="number"
                  value={item.padding_left || ''}
                  onChange={(e) => onUpdate({ padding_left: parseInt(e.target.value) || null })}
                  placeholder="Auto"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Padding prawo (px)</Label>
                <Input
                  type="number"
                  value={item.padding_right || ''}
                  onChange={(e) => onUpdate({ padding_right: parseInt(e.target.value) || null })}
                  placeholder="Auto"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Margines górny (px)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.margin_top || 0]}
                  onValueChange={([value]) => onUpdate({ margin_top: value })}
                  min={0}
                  max={200}
                  step={4}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={item.margin_top || 0}
                  onChange={(e) => onUpdate({ margin_top: parseInt(e.target.value) || 0 })}
                  className="w-16 h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Margines dolny (px)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.margin_bottom || 0]}
                  onValueChange={([value]) => onUpdate({ margin_bottom: value })}
                  min={0}
                  max={200}
                  step={4}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={item.margin_bottom || 0}
                  onChange={(e) => onUpdate({ margin_bottom: parseInt(e.target.value) || 0 })}
                  className="w-16 h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Margines lewo (px)</Label>
                <Input
                  type="number"
                  value={item.margin_left || ''}
                  onChange={(e) => onUpdate({ margin_left: parseInt(e.target.value) || null })}
                  placeholder="Auto"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Margines prawo (px)</Label>
                <Input
                  type="number"
                  value={item.margin_right || ''}
                  onChange={(e) => onUpdate({ margin_right: parseInt(e.target.value) || null })}
                  placeholder="Auto"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Border */}
      {showBorder && (
        <CollapsibleSection title="🔲 Obramowanie">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Zaokrąglenie rogów (px)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.border_radius || 0]}
                  onValueChange={([value]) => onUpdate({ border_radius: value })}
                  min={0}
                  max={100}
                  step={2}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={item.border_radius || 0}
                  onChange={(e) => onUpdate({ border_radius: parseInt(e.target.value) || 0 })}
                  className="w-16 h-8 text-xs"
                />
              </div>
              <div className="flex gap-1 mt-1">
                <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => onUpdate({ border_radius: 0 })}>0</Button>
                <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => onUpdate({ border_radius: 4 })}>4</Button>
                <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => onUpdate({ border_radius: 8 })}>8</Button>
                <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => onUpdate({ border_radius: 16 })}>16</Button>
                <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => onUpdate({ border_radius: 9999 })}>Koło</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Grubość obramowania (px)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.border_width || 0]}
                  onValueChange={([value]) => onUpdate({ border_width: value })}
                  min={0}
                  max={20}
                  step={1}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.border_width || 0}px</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Styl obramowania</Label>
              <Select
                value={item.border_style || 'solid'}
                onValueChange={(value) => onUpdate({ border_style: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak</SelectItem>
                  <SelectItem value="solid">Ciągłe</SelectItem>
                  <SelectItem value="dashed">Kreskowane</SelectItem>
                  <SelectItem value="dotted">Kropkowane</SelectItem>
                  <SelectItem value="double">Podwójne</SelectItem>
                  <SelectItem value="groove">Groove</SelectItem>
                  <SelectItem value="ridge">Ridge</SelectItem>
                  <SelectItem value="inset">Inset</SelectItem>
                  <SelectItem value="outset">Outset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Kolor obramowania</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={item.border_color || '#000000'}
                  onChange={(e) => onUpdate({ border_color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  type="text"
                  value={item.border_color || ''}
                  onChange={(e) => onUpdate({ border_color: e.target.value })}
                  placeholder="#000000"
                  className="flex-1 h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Effects & Shadow */}
      {showEffects && (
        <CollapsibleSection title="✨ Efekty i cień">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Cień</Label>
              <Select
                value={item.box_shadow || 'none'}
                onValueChange={(value) => onUpdate({ box_shadow: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak</SelectItem>
                  <SelectItem value="0 1px 2px 0 rgba(0,0,0,0.05)">XS</SelectItem>
                  <SelectItem value="0 1px 3px 0 rgba(0,0,0,0.1)">SM</SelectItem>
                  <SelectItem value="0 4px 6px -1px rgba(0,0,0,0.1)">MD</SelectItem>
                  <SelectItem value="0 10px 15px -3px rgba(0,0,0,0.1)">LG</SelectItem>
                  <SelectItem value="0 20px 25px -5px rgba(0,0,0,0.1)">XL</SelectItem>
                  <SelectItem value="0 25px 50px -12px rgba(0,0,0,0.25)">2XL</SelectItem>
                  <SelectItem value="inset 0 2px 4px 0 rgba(0,0,0,0.06)">Inset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Własny cień CSS</Label>
              <Input
                type="text"
                value={item.custom_shadow || ''}
                onChange={(e) => onUpdate({ custom_shadow: e.target.value, box_shadow: e.target.value || 'none' })}
                placeholder="0 4px 6px rgba(0,0,0,0.1)"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Filtr rozmycia (px)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.blur || 0]}
                  onValueChange={([value]) => onUpdate({ blur: value })}
                  min={0}
                  max={20}
                  step={1}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.blur || 0}px</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Jasność (%)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.brightness || 100]}
                  onValueChange={([value]) => onUpdate({ brightness: value })}
                  min={0}
                  max={200}
                  step={5}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.brightness || 100}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Kontrast (%)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.contrast || 100]}
                  onValueChange={([value]) => onUpdate({ contrast: value })}
                  min={0}
                  max={200}
                  step={5}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.contrast || 100}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Saturacja (%)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.saturate || 100]}
                  onValueChange={([value]) => onUpdate({ saturate: value })}
                  min={0}
                  max={200}
                  step={5}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.saturate || 100}%</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Animations */}
      {showAnimation && (
        <CollapsibleSection title="🎬 Animacje i hover">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Efekt hover - skala</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.hover_scale || 1]}
                  onValueChange={([value]) => onUpdate({ hover_scale: value })}
                  min={0.8}
                  max={1.5}
                  step={0.05}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.hover_scale || 1}x</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Efekt hover - przezroczystość (%)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.hover_opacity || 100]}
                  onValueChange={([value]) => onUpdate({ hover_opacity: value })}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.hover_opacity || 100}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Hover - kolor tła</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={item.hover_background_color || '#000000'}
                  onChange={(e) => onUpdate({ hover_background_color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  type="text"
                  value={item.hover_background_color || ''}
                  onChange={(e) => onUpdate({ hover_background_color: e.target.value })}
                  placeholder="Brak zmiany"
                  className="flex-1 h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Hover - kolor tekstu</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={item.hover_text_color || '#ffffff'}
                  onChange={(e) => onUpdate({ hover_text_color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  type="text"
                  value={item.hover_text_color || ''}
                  onChange={(e) => onUpdate({ hover_text_color: e.target.value })}
                  placeholder="Brak zmiany"
                  className="flex-1 h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Hover - kolor obramowania</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={item.hover_border_color || '#000000'}
                  onChange={(e) => onUpdate({ hover_border_color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  type="text"
                  value={item.hover_border_color || ''}
                  onChange={(e) => onUpdate({ hover_border_color: e.target.value })}
                  placeholder="Brak zmiany"
                  className="flex-1 h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Czas przejścia (ms)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.transition_duration || 300]}
                  onValueChange={([value]) => onUpdate({ transition_duration: value })}
                  min={0}
                  max={1000}
                  step={50}
                  className="flex-1"
                />
                <span className="w-12 text-xs text-muted-foreground">{item.transition_duration || 300}ms</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Animacja przy załadowaniu</Label>
              <Select
                value={item.animation || 'none'}
                onValueChange={(value) => onUpdate({ animation: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak</SelectItem>
                  <SelectItem value="fade-in">Pojawienie</SelectItem>
                  <SelectItem value="slide-up">Wjazd z dołu</SelectItem>
                  <SelectItem value="slide-down">Wjazd z góry</SelectItem>
                  <SelectItem value="slide-left">Wjazd z lewej</SelectItem>
                  <SelectItem value="slide-right">Wjazd z prawej</SelectItem>
                  <SelectItem value="scale-in">Skalowanie</SelectItem>
                  <SelectItem value="bounce">Odbicie</SelectItem>
                  <SelectItem value="pulse">Pulsowanie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Opóźnienie animacji (ms)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.animation_delay || 0]}
                  onValueChange={([value]) => onUpdate({ animation_delay: value })}
                  min={0}
                  max={2000}
                  step={100}
                  className="flex-1"
                />
                <span className="w-12 text-xs text-muted-foreground">{item.animation_delay || 0}ms</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Kursor</Label>
              <Select
                value={item.cursor || 'pointer'}
                onValueChange={(value) => onUpdate({ cursor: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pointer">Wskaźnik (pointer)</SelectItem>
                  <SelectItem value="default">Domyślny</SelectItem>
                  <SelectItem value="move">Przesuwanie</SelectItem>
                  <SelectItem value="grab">Chwytanie</SelectItem>
                  <SelectItem value="not-allowed">Zabroniony</SelectItem>
                  <SelectItem value="wait">Oczekiwanie</SelectItem>
                  <SelectItem value="crosshair">Krzyżyk</SelectItem>
                  <SelectItem value="text">Tekst</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Advanced */}
      {showAdvanced && (
        <CollapsibleSection title="⚙️ Zaawansowane">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Niestandardowe klasy CSS</Label>
              <Input
                type="text"
                value={item.style_class || ''}
                onChange={(e) => onUpdate({ style_class: e.target.value })}
                placeholder="klasa1 klasa2 klasa3"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">ID elementu HTML</Label>
              <Input
                type="text"
                value={item.html_id || ''}
                onChange={(e) => onUpdate({ html_id: e.target.value })}
                placeholder="moj-przycisk"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">ARIA Label (dostępność)</Label>
              <Input
                type="text"
                value={item.aria_label || ''}
                onChange={(e) => onUpdate({ aria_label: e.target.value })}
                placeholder="Opis dla czytników ekranu"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Kolejność (z-index)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.z_index || 0]}
                  onValueChange={([value]) => onUpdate({ z_index: value })}
                  min={-10}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">{item.z_index || 0}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Pozycjonowanie</Label>
              <Select
                value={item.position || 'static'}
                onValueChange={(value) => onUpdate({ position: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">Statyczne</SelectItem>
                  <SelectItem value="relative">Względne</SelectItem>
                  <SelectItem value="absolute">Bezwzględne</SelectItem>
                  <SelectItem value="fixed">Stałe</SelectItem>
                  <SelectItem value="sticky">Przyklejone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Display</Label>
              <Select
                value={item.display || 'inline-flex'}
                onValueChange={(value) => onUpdate({ display: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="inline">Inline</SelectItem>
                  <SelectItem value="inline-block">Inline-block</SelectItem>
                  <SelectItem value="flex">Flex</SelectItem>
                  <SelectItem value="inline-flex">Inline-flex</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="none">Ukryty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Wyłącz interaktywność</Label>
              <Switch
                checked={item.pointer_events_none || false}
                onCheckedChange={(checked) => onUpdate({ pointer_events_none: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Ukryj overflow</Label>
              <Switch
                checked={item.overflow_hidden || false}
                onCheckedChange={(checked) => onUpdate({ overflow_hidden: checked })}
              />
            </div>
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
};
