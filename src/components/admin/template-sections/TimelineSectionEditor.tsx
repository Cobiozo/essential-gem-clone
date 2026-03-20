import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';
import { InnerElementsList } from './InnerElementsList';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const TimelineSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const milestones: any[] = config.milestones || [];
  const editableFields: string[] = config.editable_fields || [];
  const setEditable = (fields: string[]) => update('editable_fields', fields);

  const updateMilestone = (i: number, field: string, value: any) => {
    const n = [...milestones];
    n[i] = { ...n[i], [field]: value };
    update('milestones', n);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <Label>Nagłówek</Label>
          <EditableFieldToggle fieldName="heading" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Input value={config.heading || ''} onChange={e => update('heading', e.target.value)} />
      </div>
      <Label>Punkty na osi czasu</Label>
      {milestones.map((m, i) => (
        <div key={i} className="flex gap-2 items-start border rounded-lg p-3">
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Input value={m.icon || ''} onChange={e => updateMilestone(i, 'icon', e.target.value)} placeholder="Ikona" />
              <Input value={m.month || ''} onChange={e => updateMilestone(i, 'month', e.target.value)} placeholder="Miesiąc" />
              <div className="flex items-center gap-2">
                <Label className="text-xs">Wyróżniony</Label>
                <Switch checked={!!m.highlight} onCheckedChange={v => updateMilestone(i, 'highlight', v)} />
              </div>
            </div>
            <Input value={m.title || ''} onChange={e => updateMilestone(i, 'title', e.target.value)} placeholder="Tytuł" />
          </div>
          <Button variant="ghost" size="icon" onClick={() => update('milestones', milestones.filter((_, j) => j !== i))}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update('milestones', [...milestones, { icon: '📌', month: '', title: '', highlight: false }])}>
        <Plus className="w-4 h-4 mr-1" /> Dodaj punkt
      </Button>
    </div>
  );
};
