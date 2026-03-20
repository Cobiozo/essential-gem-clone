import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';
import { InnerElementsList } from './InnerElementsList';
import { IconPicker } from '@/components/cms/IconPicker';
import { icons } from 'lucide-react';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const StepsSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const steps: any[] = config.steps || [];
  const editableFields: string[] = config.editable_fields || [];
  const setEditable = (fields: string[]) => update('editable_fields', fields);

  const updateStep = (i: number, field: string, value: any) => {
    const newSteps = [...steps];
    newSteps[i] = { ...newSteps[i], [field]: value };
    update('steps', newSteps);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <Label>Nagłówek</Label>
          <EditableFieldToggle fieldName="heading" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Textarea value={config.heading || ''} onChange={e => update('heading', e.target.value)} rows={1} className="min-h-[36px] resize-y" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Opis</Label>
          <EditableFieldToggle fieldName="description" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Textarea value={config.description || ''} onChange={e => update('description', e.target.value)} rows={2} className="min-h-[36px] resize-y" />
      </div>
      <div>
        <Label>Kolor tła</Label>
        <Input value={config.bg_color || '#0f172a'} onChange={e => update('bg_color', e.target.value)} />
      </div>
      <Label>Kroki</Label>
      {steps.map((step, i) => {
        const SelectedIcon = step.icon ? (icons as any)[step.icon] : null;
        return (
          <div key={i} className="flex gap-2 items-start border rounded-lg p-3">
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-xs">Ikona</Label>
                <div className="flex items-center gap-2">
                  <IconPicker
                    value={step.icon || null}
                    onChange={(iconName) => updateStep(i, 'icon', iconName || '')}
                    trigger={
                      <Button variant="outline" size="sm" className="h-9 gap-2">
                        {SelectedIcon ? <SelectedIcon className="w-4 h-4" /> : <span className="text-muted-foreground">Wybierz</span>}
                        {step.icon && <span className="text-xs text-muted-foreground">{step.icon}</span>}
                      </Button>
                    }
                  />
                </div>
              </div>
              <Textarea value={step.title || ''} onChange={e => updateStep(i, 'title', e.target.value)} placeholder="Tytuł" rows={1} className="min-h-[36px] resize-y" />
              <Textarea value={step.description || ''} onChange={e => updateStep(i, 'description', e.target.value)} placeholder="Opis" rows={2} className="min-h-[36px] resize-y" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => update('steps', steps.filter((_, j) => j !== i))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={() => update('steps', [...steps, { icon: 'Package', title: '', description: '' }])}>
        <Plus className="w-4 h-4 mr-1" /> Dodaj krok
      </Button>

      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Dodatkowe elementy</legend>
        <InnerElementsList elements={config.inner_elements || []} onChange={(els) => update('inner_elements', els)} />
      </fieldset>
    </div>
  );
};