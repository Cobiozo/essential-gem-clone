import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { IconPicker } from '@/components/cms/IconPicker';

interface EditableInfoCardProps {
  id: string;
  iconName: string;
  label: string;
  value: string;
  labelVisible: boolean;
  onUpdate: (data: {
    iconName?: string;
    label?: string;
    value?: string;
    labelVisible?: boolean;
  }) => void;
}

export const EditableInfoCard: React.FC<EditableInfoCardProps> = ({
  id,
  iconName,
  label,
  value,
  labelVisible,
  onUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editIconName, setEditIconName] = useState(iconName);
  const [editLabel, setEditLabel] = useState(label);
  const [editValue, setEditValue] = useState(value);
  const [editLabelVisible, setEditLabelVisible] = useState(labelVisible);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Dynamic icon rendering
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;

  const handleApply = () => {
    onUpdate({
      iconName: editIconName,
      label: editLabel,
      value: editValue,
      labelVisible: editLabelVisible,
    });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Reset to current values when opening
      setEditIconName(iconName);
      setEditLabel(label);
      setEditValue(value);
      setEditLabelVisible(labelVisible);
    }
    setIsOpen(open);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group bg-card border rounded-lg p-4 transition-all',
        isDragging && 'opacity-50 shadow-lg z-50',
        'hover:ring-2 hover:ring-primary/30'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Card content */}
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <div className="cursor-pointer pl-4">
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>
              {labelVisible && (
                <span className="text-xs text-muted-foreground font-medium">
                  {label}
                </span>
              )}
              <span className="text-sm font-medium text-center break-all">
                {value || '(brak wartości)'}
              </span>
            </div>
            
            {/* Edit indicator */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-1 bg-primary/10 rounded-full">
                <Pencil className="h-3 w-3 text-primary" />
              </div>
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-80" align="center">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Edycja karty: {label}</h4>
            
            <div className="space-y-2">
              <Label>Ikona</Label>
              <IconPicker
                value={editIconName}
                onChange={(name) => setEditIconName(name || 'HelpCircle')}
                trigger={
                  <Button variant="outline" className="w-full justify-start gap-2">
                    {React.createElement(
                      (LucideIcons as any)[editIconName] || LucideIcons.HelpCircle,
                      { className: 'h-4 w-4' }
                    )}
                    <span>{editIconName}</span>
                  </Button>
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Etykieta</Label>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Np. E-mail"
              />
            </div>

            <div className="space-y-2">
              <Label>Wartość</Label>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Np. support@example.com"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor={`label-visible-${id}`}>Pokaż etykietę</Label>
              <Switch
                id={`label-visible-${id}`}
                checked={editLabelVisible}
                onCheckedChange={setEditLabelVisible}
              />
            </div>

            <Button onClick={handleApply} className="w-full">
              Zastosuj
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
