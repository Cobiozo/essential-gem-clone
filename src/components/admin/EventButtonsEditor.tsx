import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import type { EventButton } from '@/types/events';

interface EventButtonsEditorProps {
  buttons: EventButton[];
  onChange: (buttons: EventButton[]) => void;
  maxButtons?: number;
}

export const EventButtonsEditor: React.FC<EventButtonsEditorProps> = ({ 
  buttons, 
  onChange,
  maxButtons = 5
}) => {
  const addButton = () => {
    if (buttons.length >= maxButtons) return;
    
    const newButton: EventButton = {
      label: 'Nowy przycisk',
      url: '',
      style: 'primary',
    };
    onChange([...buttons, newButton]);
  };

  const removeButton = (index: number) => {
    onChange(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, updates: Partial<EventButton>) => {
    onChange(buttons.map((btn, i) => i === index ? { ...btn, ...updates } : btn));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">
          Przyciski akcji ({buttons.length}/{maxButtons})
        </Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={addButton}
          disabled={buttons.length >= maxButtons}
        >
          <Plus className="h-4 w-4 mr-1" />
          Dodaj przycisk
        </Button>
      </div>

      {buttons.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          Brak przycisków. Kliknij "Dodaj przycisk" aby utworzyć.
        </p>
      ) : (
        <div className="space-y-3">
          {buttons.map((button, index) => (
            <Card key={index} className="border-muted">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Przycisk {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeButton(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Etykieta</Label>
                    <Input
                      value={button.label}
                      onChange={(e) => updateButton(index, { label: e.target.value })}
                      placeholder="np. Zapisz się"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Styl</Label>
                    <Select
                      value={button.style || 'primary'}
                      onValueChange={(v) => updateButton(index, { style: v as EventButton['style'] })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary (wyróżniony)</SelectItem>
                        <SelectItem value="secondary">Secondary</SelectItem>
                        <SelectItem value="outline">Outline (obramowanie)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">URL (link zewnętrzny)</Label>
                  <div className="relative">
                    <Input
                      type="url"
                      value={button.url}
                      onChange={(e) => updateButton(index, { url: e.target.value })}
                      placeholder="https://example.com/register"
                      className="h-9 pl-9"
                    />
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
