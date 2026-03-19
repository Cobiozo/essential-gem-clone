import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const HeaderSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const buttons: any[] = config.buttons || [];

  const updateBtn = (i: number, field: string, value: string) => {
    const n = [...buttons];
    n[i] = { ...n[i], [field]: value };
    update('buttons', n);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tekst logo</Label>
          <Input value={config.logo_text || ''} onChange={e => update('logo_text', e.target.value)} />
        </div>
        <div>
          <Label>URL logo (obraz)</Label>
          <Input value={config.logo_image_url || ''} onChange={e => update('logo_image_url', e.target.value)} />
        </div>
      </div>
      <Label>Przyciski nawigacji</Label>
      {buttons.map((btn, i) => (
        <div key={i} className="flex gap-2 items-center border rounded-lg p-3">
          <Input value={btn.text || ''} onChange={e => updateBtn(i, 'text', e.target.value)} placeholder="Tekst" className="flex-1" />
          <Input value={btn.url || ''} onChange={e => updateBtn(i, 'url', e.target.value)} placeholder="URL" className="flex-1" />
          <Select value={btn.variant || 'outline'} onValueChange={v => updateBtn(i, 'variant', v)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="primary">Primary</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => update('buttons', buttons.filter((_, j) => j !== i))}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update('buttons', [...buttons, { text: '', url: '', variant: 'outline' }])}>
        <Plus className="w-4 h-4 mr-1" /> Dodaj przycisk
      </Button>
    </div>
  );
};
