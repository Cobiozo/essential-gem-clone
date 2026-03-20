import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorInput } from '@/components/ui/color-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { ImageUploadInput } from '@/components/partner-page/ImageUploadInput';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface InnerElement {
  id: string;
  type: 'heading' | 'text' | 'image' | 'button' | 'badge' | 'divider' | 'spacer' | 'icon_list' | 'video';
  content: Record<string, any>;
  style: Record<string, any>;
  position: number;
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Raleway', label: 'Raleway' },
];

const FONT_SIZE_OPTIONS = [
  { value: 'xs', label: 'XS' }, { value: 'sm', label: 'SM' }, { value: 'base', label: 'Base' },
  { value: 'lg', label: 'LG' }, { value: 'xl', label: 'XL' }, { value: '2xl', label: '2XL' },
  { value: '3xl', label: '3XL' }, { value: '4xl', label: '4XL' }, { value: '5xl', label: '5XL' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: 'Normal' }, { value: 'medium', label: 'Medium' },
  { value: 'semibold', label: 'Semibold' }, { value: 'bold', label: 'Bold' },
  { value: 'extrabold', label: 'Extrabold' }, { value: 'black', label: 'Black' },
];

interface Props {
  element: InnerElement;
  onChange: (element: InnerElement) => void;
}

export const InnerElementEditor: React.FC<Props> = ({ element, onChange }) => {
  const updateContent = (key: string, value: any) =>
    onChange({ ...element, content: { ...element.content, [key]: value } });
  const updateStyle = (key: string, value: any) =>
    onChange({ ...element, style: { ...element.style, [key]: value } });

  const renderTypeFields = () => {
    const c = element.content || {};
    switch (element.type) {
      case 'heading':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tekst nagłówka</Label>
              <Input value={c.text || ''} onChange={e => updateContent('text', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Czcionka</Label>
                <Select value={element.style?.font_family || 'Inter'} onValueChange={v => updateStyle('font_family', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Rozmiar</Label>
                <Select value={element.style?.font_size || '2xl'} onValueChange={v => updateStyle('font_size', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_SIZE_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Grubość</Label>
                <Select value={element.style?.font_weight || 'bold'} onValueChange={v => updateStyle('font_weight', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_WEIGHT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Wyrównanie</Label>
                <Select value={element.style?.text_align || 'left'} onValueChange={v => updateStyle('text_align', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Lewo</SelectItem>
                    <SelectItem value="center">Środek</SelectItem>
                    <SelectItem value="right">Prawo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ColorInput label="Kolor tekstu" value={element.style?.text_color || ''} onChange={v => updateStyle('text_color', v)} />
          </div>
        );

      case 'text':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Treść</Label>
              <Textarea value={c.text || ''} onChange={e => updateContent('text', e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Czcionka</Label>
                <Select value={element.style?.font_family || 'Inter'} onValueChange={v => updateStyle('font_family', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Rozmiar</Label>
                <Select value={element.style?.font_size || 'base'} onValueChange={v => updateStyle('font_size', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_SIZE_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Wyrównanie</Label>
                <Select value={element.style?.text_align || 'left'} onValueChange={v => updateStyle('text_align', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Lewo</SelectItem>
                    <SelectItem value="center">Środek</SelectItem>
                    <SelectItem value="right">Prawo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Max szerokość</Label>
                <Select value={element.style?.max_width || 'full'} onValueChange={v => updateStyle('max_width', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Pełna</SelectItem>
                    <SelectItem value="lg">Duża (1024px)</SelectItem>
                    <SelectItem value="md">Średnia (768px)</SelectItem>
                    <SelectItem value="sm">Mała (640px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ColorInput label="Kolor tekstu" value={element.style?.text_color || ''} onChange={v => updateStyle('text_color', v)} />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Obraz</Label>
              <ImageUploadInput value={c.url || ''} onChange={v => updateContent('url', v)} />
            </div>
            <div>
              <Label className="text-xs">Alt text</Label>
              <Input value={c.alt || ''} onChange={e => updateContent('alt', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Zaokrąglenie</Label>
                <Select value={element.style?.border_radius || 'md'} onValueChange={v => updateStyle('border_radius', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Brak</SelectItem>
                    <SelectItem value="sm">Małe</SelectItem>
                    <SelectItem value="md">Średnie</SelectItem>
                    <SelectItem value="lg">Duże</SelectItem>
                    <SelectItem value="xl">XL</SelectItem>
                    <SelectItem value="full">Koło</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Max szerokość</Label>
                <Select value={element.style?.max_width || 'full'} onValueChange={v => updateStyle('max_width', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Pełna</SelectItem>
                    <SelectItem value="lg">Duża</SelectItem>
                    <SelectItem value="md">Średnia</SelectItem>
                    <SelectItem value="sm">Mała</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tekst przycisku</Label>
              <Input value={c.text || ''} onChange={e => updateContent('text', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">URL</Label>
              <Input value={c.url || ''} onChange={e => updateContent('url', e.target.value)} placeholder="https://" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ColorInput label="Kolor tła" value={element.style?.bg_color || '#2d6a4f'} onChange={v => updateStyle('bg_color', v)} />
              <ColorInput label="Kolor tekstu" value={element.style?.text_color || '#ffffff'} onChange={v => updateStyle('text_color', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Zaokrąglenie</Label>
                <Select value={element.style?.border_radius || 'full'} onValueChange={v => updateStyle('border_radius', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Brak</SelectItem>
                    <SelectItem value="sm">Małe</SelectItem>
                    <SelectItem value="md">Średnie</SelectItem>
                    <SelectItem value="lg">Duże</SelectItem>
                    <SelectItem value="full">Pełne (pill)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Grubość czcionki</Label>
                <Select value={element.style?.font_weight || 'bold'} onValueChange={v => updateStyle('font_weight', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_WEIGHT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Wyrównanie</Label>
              <Select value={element.style?.text_align || 'left'} onValueChange={v => updateStyle('text_align', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Lewo</SelectItem>
                  <SelectItem value="center">Środek</SelectItem>
                  <SelectItem value="right">Prawo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'badge':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tekst</Label>
              <Input value={c.text || ''} onChange={e => updateContent('text', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Ikona (emoji)</Label>
              <Input value={c.icon || ''} onChange={e => updateContent('icon', e.target.value)} className="w-20" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ColorInput label="Kolor tła" value={element.style?.bg_color || '#f0fdf4'} onChange={v => updateStyle('bg_color', v)} />
              <ColorInput label="Kolor tekstu" value={element.style?.text_color || '#166534'} onChange={v => updateStyle('text_color', v)} />
            </div>
            <div>
              <Label className="text-xs">Zaokrąglenie</Label>
              <Select value={element.style?.border_radius || 'full'} onValueChange={v => updateStyle('border_radius', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Małe</SelectItem>
                  <SelectItem value="md">Średnie</SelectItem>
                  <SelectItem value="lg">Duże</SelectItem>
                  <SelectItem value="full">Pełne (pill)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="space-y-3">
            <ColorInput label="Kolor" value={c.color || '#e5e7eb'} onChange={v => updateContent('color', v)} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Grubość (px)</Label>
                <Input type="number" min={1} max={10} value={c.thickness || 1} onChange={e => updateContent('thickness', parseInt(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Styl</Label>
                <Select value={c.style || 'solid'} onValueChange={v => updateContent('style', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Ciągła</SelectItem>
                    <SelectItem value="dashed">Kreskowana</SelectItem>
                    <SelectItem value="dotted">Kropkowana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Max szerokość</Label>
              <Select value={element.style?.max_width || 'full'} onValueChange={v => updateStyle('max_width', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Pełna</SelectItem>
                  <SelectItem value="lg">Duża</SelectItem>
                  <SelectItem value="md">Średnia</SelectItem>
                  <SelectItem value="sm">Mała</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div>
            <Label className="text-xs">Wysokość (px)</Label>
            <Input type="number" min={4} max={200} value={c.height || 32} onChange={e => updateContent('height', parseInt(e.target.value))} />
          </div>
        );

      case 'icon_list':
        const items: Array<{ icon: string; text: string }> = c.items || [];
        return (
          <div className="space-y-3">
            <ColorInput label="Kolor ikon" value={c.icon_color || '#2d6a4f'} onChange={v => updateContent('icon_color', v)} />
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input value={item.icon} onChange={e => {
                  const n = [...items]; n[i] = { ...n[i], icon: e.target.value };
                  updateContent('items', n);
                }} className="w-14" placeholder="✓" />
                <Input value={item.text} onChange={e => {
                  const n = [...items]; n[i] = { ...n[i], text: e.target.value };
                  updateContent('items', n);
                }} className="flex-1" placeholder="Tekst" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateContent('items', items.filter((_, j) => j !== i))}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => updateContent('items', [...items, { icon: '✓', text: '' }])}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Dodaj
            </Button>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">URL wideo (MP4)</Label>
              <Input value={c.url || ''} onChange={e => updateContent('url', e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">Zaokrąglenie</Label>
              <Select value={element.style?.border_radius || 'lg'} onValueChange={v => updateStyle('border_radius', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak</SelectItem>
                  <SelectItem value="md">Średnie</SelectItem>
                  <SelectItem value="lg">Duże</SelectItem>
                  <SelectItem value="xl">XL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {renderTypeFields()}
      <Collapsible>
        <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          ⚙️ Styl zaawansowany
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Margines góra</Label>
              <Select value={String(element.style?.margin_top ?? '0')} onValueChange={v => updateStyle('margin_top', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['0','1','2','3','4','6','8','12','16'].map(v => <SelectItem key={v} value={v}>{v === '0' ? 'Brak' : `${v} (${parseInt(v)*4}px)`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Margines dół</Label>
              <Select value={String(element.style?.margin_bottom ?? '0')} onValueChange={v => updateStyle('margin_bottom', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['0','1','2','3','4','6','8','12','16'].map(v => <SelectItem key={v} value={v}>{v === '0' ? 'Brak' : `${v} (${parseInt(v)*4}px)`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Padding</Label>
              <Select value={element.style?.padding || '0'} onValueChange={v => updateStyle('padding', v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Brak</SelectItem>
                  <SelectItem value="sm">Mały</SelectItem>
                  <SelectItem value="md">Średni</SelectItem>
                  <SelectItem value="lg">Duży</SelectItem>
                  <SelectItem value="xl">XL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Przezroczystość</Label>
              <Input type="number" step="0.1" min="0" max="1" value={element.style?.opacity ?? 1} onChange={e => updateStyle('opacity', parseFloat(e.target.value))} className="h-8" />
            </div>
          </div>
          <ColorInput label="Kolor tła elementu" value={element.style?.bg_color || ''} onChange={v => updateStyle('bg_color', v)} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
