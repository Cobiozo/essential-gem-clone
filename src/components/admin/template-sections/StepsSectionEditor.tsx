import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const StepsSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const steps: any[] = config.steps || [];

  const updateStep = (i: number, field: string, value: string) => {
    const newSteps = [...steps];
    newSteps[i] = { ...newSteps[i], [field]: value };
    update('steps', newSteps);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Nagłówek</Label>
        <Input value={config.heading || ''} onChange={e => update('heading', e.target.value)} />
      </div>
      <div>
        <Label>Opis</Label>
        <Input value={config.description || ''} onChange={e => update('description', e.target.value)} />
      </div>
      <div>
        <Label>Kolor tła</Label>
        <Input value={config.bg_color || '#0f172a'} onChange={e => update('bg_color', e.target.value)} />
      </div>
      <Label>Kroki</Label>
      {steps.map((step, i) => (
        <div key={i} className="flex gap-2 items-start border rounded-lg p-3">
          <div className="flex-1 space-y-2">
            <Input value={step.icon || ''} onChange={e => updateStep(i, 'icon', e.target.value)} placeholder="Ikona (emoji)" className="w-20" />
            <Input value={step.title || ''} onChange={e => updateStep(i, 'title', e.target.value)} placeholder="Tytuł" />
            <Input value={step.description || ''} onChange={e => updateStep(i, 'description', e.target.value)} placeholder="Opis" />
          </div>
          <Button variant="ghost" size="icon" onClick={() => update('steps', steps.filter((_, j) => j !== i))}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update('steps', [...steps, { icon: '📦', title: '', description: '' }])}>
        <Plus className="w-4 h-4 mr-1" /> Dodaj krok
      </Button>
    </div>
  );
};
