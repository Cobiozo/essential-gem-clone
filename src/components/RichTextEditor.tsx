import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextFormatting {
  fontSize: number;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  textDecoration: string;
  textAlign: 'left' | 'center' | 'right';
  color: string;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  textTransform: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  formatting?: TextFormatting;
  onFormattingChange?: (formatting: TextFormatting) => void;
  placeholder?: string;
  className?: string;
}

const fontFamilies = [
  { value: 'inherit', label: 'Domyślna' },
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' }
];

const fontSizes = [
  { value: 12, label: '12px' },
  { value: 14, label: '14px' },
  { value: 16, label: '16px' },
  { value: 18, label: '18px' },
  { value: 20, label: '20px' },
  { value: 24, label: '24px' },
  { value: 28, label: '28px' },
  { value: 32, label: '32px' }
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  formatting,
  onFormattingChange,
  placeholder = 'Wprowadź tekst...',
  className
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentFormatting, setCurrentFormatting] = useState<TextFormatting>(
    formatting || {
      fontSize: 16,
      fontWeight: '400',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      color: '#000000',
      fontFamily: 'inherit',
      lineHeight: 1.5,
      letterSpacing: 0,
      textTransform: 'none'
    }
  );

  const updateFormatting = (updates: Partial<TextFormatting>) => {
    const newFormatting = { ...currentFormatting, ...updates };
    setCurrentFormatting(newFormatting);
    onFormattingChange?.(newFormatting);
  };

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const applyFormatting = () => {
    if (editorRef.current) {
      Object.assign(editorRef.current.style, {
        fontSize: `${currentFormatting.fontSize}px`,
        fontWeight: currentFormatting.fontWeight,
        fontStyle: currentFormatting.fontStyle,
        textDecoration: currentFormatting.textDecoration,
        textAlign: currentFormatting.textAlign,
        color: currentFormatting.color,
        fontFamily: currentFormatting.fontFamily,
        lineHeight: currentFormatting.lineHeight.toString(),
        letterSpacing: `${currentFormatting.letterSpacing}px`,
        textTransform: currentFormatting.textTransform
      });
    }
  };

  useEffect(() => {
    applyFormatting();
  }, [currentFormatting]);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <div className={cn("border rounded-lg", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30 flex-wrap">
        {/* Font Family */}
        <Select 
          value={currentFormatting.fontFamily} 
          onValueChange={(value) => updateFormatting({ fontFamily: value })}
        >
          <SelectTrigger className="w-40 h-8">
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
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {fontSizes.map((size) => (
              <SelectItem key={size.value} value={size.value.toString()}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Style Buttons */}
        <Button
          variant={currentFormatting.fontWeight === 'bold' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            handleCommand('bold');
            updateFormatting({ 
              fontWeight: currentFormatting.fontWeight === 'bold' ? '400' : 'bold' 
            });
          }}
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          variant={currentFormatting.fontStyle === 'italic' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            handleCommand('italic');
            updateFormatting({ 
              fontStyle: currentFormatting.fontStyle === 'italic' ? 'normal' : 'italic' 
            });
          }}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          variant={currentFormatting.textDecoration.includes('underline') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            handleCommand('underline');
            updateFormatting({ 
              textDecoration: currentFormatting.textDecoration.includes('underline') ? 'none' : 'underline' 
            });
          }}
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignment Buttons */}
        <Button
          variant={currentFormatting.textAlign === 'left' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            handleCommand('justifyLeft');
            updateFormatting({ textAlign: 'left' });
          }}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button
          variant={currentFormatting.textAlign === 'center' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            handleCommand('justifyCenter');
            updateFormatting({ textAlign: 'center' });
          }}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          variant={currentFormatting.textAlign === 'right' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            handleCommand('justifyRight');
            updateFormatting({ textAlign: 'right' });
          }}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Lists */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCommand('insertUnorderedList')}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCommand('insertOrderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Color Picker */}
        <div className="flex items-center gap-1">
          <Palette className="h-4 w-4" />
          <input
            type="color"
            value={currentFormatting.color}
            onChange={(e) => {
              updateFormatting({ color: e.target.value });
              handleCommand('foreColor', e.target.value);
            }}
            className="w-8 h-8 border rounded cursor-pointer"
            title="Kolor tekstu"
          />
        </div>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleContentChange}
        onBlur={handleContentChange}
        className="min-h-[120px] p-4 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-b-lg"
        style={{
          fontSize: `${currentFormatting.fontSize}px`,
          fontWeight: currentFormatting.fontWeight,
          fontStyle: currentFormatting.fontStyle,
          textDecoration: currentFormatting.textDecoration,
          textAlign: currentFormatting.textAlign as any,
          color: currentFormatting.color,
          fontFamily: currentFormatting.fontFamily,
          lineHeight: currentFormatting.lineHeight.toString(),
          letterSpacing: `${currentFormatting.letterSpacing}px`,
          textTransform: currentFormatting.textTransform as any
        }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
      
      {!value && (
        <div className="absolute top-[52px] left-4 text-muted-foreground pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
};