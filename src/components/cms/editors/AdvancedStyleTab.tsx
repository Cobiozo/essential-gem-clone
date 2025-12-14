import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
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
  showAdvanced = true,
}) => {
  return (
    <div className="space-y-3">
      {/* Dimensions - tylko obsługiwane kolumny */}
      {showDimensions && (
        <CollapsibleSection title="📐 Wymiary" defaultOpen>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Max szerokość (px)</Label>
              <Input
                type="number"
                value={item.max_width || ''}
                onChange={(e) => onUpdate({ max_width: parseInt(e.target.value) || null })}
                placeholder="Brak limitu"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Max wysokość (px)</Label>
              <Input
                type="number"
                value={item.max_height || ''}
                onChange={(e) => onUpdate({ max_height: parseInt(e.target.value) || null })}
                placeholder="Brak limitu"
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
              <Label className="text-xs">Wyrównanie elementu</Label>
              <Select
                value={item.text_align || 'left'}
                onValueChange={(value) => onUpdate({ text_align: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Do lewej</SelectItem>
                  <SelectItem value="center">Wyśrodkowany</SelectItem>
                  <SelectItem value="right">Do prawej</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Kontroluje pozycję elementu w sekcji (lewo/środek/prawo)
              </p>
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
              <Label className="text-xs">Efekt hover - powiększenie</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[(item.hover_scale || 1) * 100]}
                  onValueChange={([value]) => onUpdate({ hover_scale: value / 100 })}
                  min={100}
                  max={150}
                  step={5}
                  className="flex-1"
                />
                <span className="w-12 text-xs text-muted-foreground">{((item.hover_scale || 1) * 100).toFixed(0)}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Powiększenie elementu po najechaniu myszką
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Efekt hover - przezroczystość</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[item.hover_opacity ?? 100]}
                  onValueChange={([value]) => onUpdate({ hover_opacity: value })}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="w-12 text-xs text-muted-foreground">{item.hover_opacity ?? 100}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Przezroczystość elementu po najechaniu myszką
              </p>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Advanced */}
      {showAdvanced && (
        <CollapsibleSection title="⚙️ Zaawansowane">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Własne klasy CSS</Label>
              <Input
                type="text"
                value={item.style_class || ''}
                onChange={(e) => onUpdate({ style_class: e.target.value })}
                placeholder="np. my-custom-class another-class"
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Dodaj własne klasy Tailwind CSS lub niestandardowe klasy
              </p>
            </div>
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
};

export default AdvancedStyleTab;
