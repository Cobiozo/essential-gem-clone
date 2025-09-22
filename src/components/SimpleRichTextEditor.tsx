import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFormattingChange?: (formatting: any) => void;
  formatting?: any;
}

export const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Wprowadź tekst...',
  className,
  onFormattingChange,
  formatting
}) => {
  const [currentFormatting, setCurrentFormatting] = useState(
    formatting || {
      fontSize: 16,
      fontWeight: '400',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      color: '#000000',
      fontFamily: 'inherit'
    }
  );

  const updateFormatting = (updates: Partial<typeof currentFormatting>) => {
    const newFormatting = { ...currentFormatting, ...updates };
    setCurrentFormatting(newFormatting);
    onFormattingChange?.(newFormatting);
  };

  const fontFamilies = [
    { value: 'inherit', label: 'Domyślna' },
    { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Arial, sans-serif', label: 'Arial' }
  ];

  const fontSizes = [12, 14, 16, 18, 20, 24];

  return (
    <div className={cn("border rounded-lg", className)}>
      {/* Simple Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30 flex-wrap">
        {/* Font Family */}
        <Select 
          value={currentFormatting.fontFamily} 
          onValueChange={(value) => updateFormatting({ fontFamily: value })}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {fontFamilies.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select 
          value={currentFormatting.fontSize.toString()} 
          onValueChange={(value) => updateFormatting({ fontSize: parseInt(value) })}
        >
          <SelectTrigger className="w-16 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {fontSizes.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Text Style Buttons */}
        <Button
          variant={currentFormatting.fontWeight === 'bold' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => updateFormatting({ 
            fontWeight: currentFormatting.fontWeight === 'bold' ? '400' : 'bold' 
          })}
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          variant={currentFormatting.fontStyle === 'italic' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => updateFormatting({ 
            fontStyle: currentFormatting.fontStyle === 'italic' ? 'normal' : 'italic' 
          })}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          variant={currentFormatting.textDecoration.includes('underline') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => updateFormatting({ 
            textDecoration: currentFormatting.textDecoration.includes('underline') ? 'none' : 'underline' 
          })}
        >
          <Underline className="h-4 w-4" />
        </Button>

        {/* Alignment Buttons */}
        <Button
          variant={currentFormatting.textAlign === 'left' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => updateFormatting({ textAlign: 'left' })}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button
          variant={currentFormatting.textAlign === 'center' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => updateFormatting({ textAlign: 'center' })}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          variant={currentFormatting.textAlign === 'right' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => updateFormatting({ textAlign: 'right' })}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        {/* Color Picker */}
        <div className="flex items-center gap-1">
          <Palette className="h-4 w-4" />
          <input
            type="color"
            value={currentFormatting.color}
            onChange={(e) => updateFormatting({ color: e.target.value })}
            className="w-8 h-8 border rounded cursor-pointer"
            title="Kolor tekstu"
          />
        </div>
      </div>

      {/* Editor Content */}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[120px] border-0 focus:ring-0 resize-none"
        style={{
          fontSize: `${currentFormatting.fontSize}px`,
          fontWeight: currentFormatting.fontWeight,
          fontStyle: currentFormatting.fontStyle,
          textDecoration: currentFormatting.textDecoration,
          textAlign: currentFormatting.textAlign as any,
          color: currentFormatting.color,
          fontFamily: currentFormatting.fontFamily
        }}
      />
    </div>
  );
};