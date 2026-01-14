import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

interface EditableTextElementProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  variant?: 'heading' | 'subheading' | 'text' | 'multiline';
  placeholder?: string;
  className?: string;
}

export const EditableTextElement: React.FC<EditableTextElementProps> = ({
  label,
  value,
  onChange,
  variant = 'text',
  placeholder = 'Wprowadź tekst...',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleApply = () => {
    onChange(editValue);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEditValue(value);
    }
    setIsOpen(open);
  };

  const variantStyles = {
    heading: 'text-xl font-semibold',
    subheading: 'text-base text-muted-foreground',
    text: 'text-sm',
    multiline: 'text-sm whitespace-pre-wrap',
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'group relative cursor-pointer rounded-md p-2 -m-2 transition-all',
            'hover:bg-muted/50 hover:ring-2 hover:ring-primary/30',
            className
          )}
        >
          <p className={cn(variantStyles[variant], !value && 'text-muted-foreground italic')}>
            {value || placeholder}
          </p>
          
          {/* Edit indicator */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-1 bg-primary/10 rounded-full">
              <Pencil className="h-3 w-3 text-primary" />
            </div>
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <Label>{label}</Label>
          
          {variant === 'multiline' ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              rows={4}
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
            />
          )}

          <Button onClick={handleApply} className="w-full">
            Zastosuj
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
