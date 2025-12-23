import React from 'react';
import { EmailBlock } from './types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface BlockEditorProps {
  block: EmailBlock;
  onChange: (content: Record<string, any>) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ block, onChange }) => {
  const updateField = (field: string, value: any) => {
    onChange({ ...block.content, [field]: value });
  };

  switch (block.type) {
    case 'header':
      return (
        <div className="space-y-4">
          <div>
            <Label>Tekst nagłówka</Label>
            <Input
              value={block.content.text}
              onChange={(e) => updateField('text', e.target.value)}
            />
          </div>
          <div>
            <Label>Kolor tła</Label>
            <Input
              type="color"
              value={block.content.backgroundColor}
              onChange={(e) => updateField('backgroundColor', e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <div>
            <Label>Kolor tekstu</Label>
            <Input
              type="color"
              value={block.content.textColor}
              onChange={(e) => updateField('textColor', e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={block.content.showLogo}
              onCheckedChange={(checked) => updateField('showLogo', checked)}
            />
            <Label>Pokaż logo</Label>
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-4">
          <div>
            <Label>Treść (HTML)</Label>
            <Textarea
              value={block.content.html}
              onChange={(e) => updateField('html', e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>
        </div>
      );

    case 'button':
      return (
        <div className="space-y-4">
          <div>
            <Label>Tekst przycisku</Label>
            <Input
              value={block.content.text}
              onChange={(e) => updateField('text', e.target.value)}
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={block.content.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Kolor tła</Label>
            <Input
              type="color"
              value={block.content.backgroundColor}
              onChange={(e) => updateField('backgroundColor', e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <div>
            <Label>Kolor tekstu</Label>
            <Input
              type="color"
              value={block.content.textColor}
              onChange={(e) => updateField('textColor', e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <div>
            <Label>Wyrównanie</Label>
            <Select value={block.content.align} onValueChange={(v) => updateField('align', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Lewo</SelectItem>
                <SelectItem value="center">Środek</SelectItem>
                <SelectItem value="right">Prawo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-4">
          <div>
            <Label>URL obrazu</Label>
            <Input
              value={block.content.src}
              onChange={(e) => updateField('src', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Tekst alternatywny</Label>
            <Input
              value={block.content.alt}
              onChange={(e) => updateField('alt', e.target.value)}
            />
          </div>
          <div>
            <Label>Szerokość (np. 100%, 300px)</Label>
            <Input
              value={block.content.width}
              onChange={(e) => updateField('width', e.target.value)}
            />
          </div>
          <div>
            <Label>Wyrównanie</Label>
            <Select value={block.content.align} onValueChange={(v) => updateField('align', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Lewo</SelectItem>
                <SelectItem value="center">Środek</SelectItem>
                <SelectItem value="right">Prawo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'box':
      return (
        <div className="space-y-4">
          <div>
            <Label>Wariant</Label>
            <Select value={block.content.variant} onValueChange={(v) => updateField('variant', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informacja</SelectItem>
                <SelectItem value="success">Sukces</SelectItem>
                <SelectItem value="warning">Ostrzeżenie</SelectItem>
                <SelectItem value="error">Błąd</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tytuł</Label>
            <Input
              value={block.content.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>
          <div>
            <Label>Treść</Label>
            <Textarea
              value={block.content.content}
              onChange={(e) => updateField('content', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      );

    case 'separator':
      return (
        <div className="space-y-4">
          <div>
            <Label>Styl linii</Label>
            <Select value={block.content.style} onValueChange={(v) => updateField('style', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Ciągła</SelectItem>
                <SelectItem value="dashed">Przerywana</SelectItem>
                <SelectItem value="dotted">Kropkowana</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kolor</Label>
            <Input
              type="color"
              value={block.content.color}
              onChange={(e) => updateField('color', e.target.value)}
              className="h-10 w-full"
            />
          </div>
        </div>
      );

    case 'spacer':
      return (
        <div className="space-y-4">
          <div>
            <Label>Wysokość: {block.content.height}px</Label>
            <Slider
              value={[block.content.height]}
              onValueChange={([v]) => updateField('height', v)}
              min={10}
              max={100}
              step={5}
            />
          </div>
        </div>
      );

    case 'footer':
      return (
        <div className="space-y-4">
          <div>
            <Label>Treść stopki (HTML)</Label>
            <Textarea
              value={block.content.html}
              onChange={(e) => updateField('html', e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>
        </div>
      );

    default:
      return <div className="text-muted-foreground">Brak edytora dla tego typu bloku</div>;
  }
};
