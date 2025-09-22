import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Palette,
  Type
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Wprowadź tekst...",
  rows = 3,
  className = ""
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
    '#ff0000', '#ff6600', '#ffcc00', '#66ff00', '#00ff66', '#00ffcc',
    '#0066ff', '#6600ff', '#cc00ff', '#ff0066'
  ];

  const wrapSelectedText = useCallback((startTag: string, endTag: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (selectedText.length === 0) return;

    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);
    
    const newValue = beforeText + startTag + selectedText + endTag + afterText;
    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.setSelectionRange(
        start + startTag.length,
        end + startTag.length
      );
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const applyFormatting = useCallback((format: string) => {
    switch (format) {
      case 'bold':
        wrapSelectedText('<b>', '</b>');
        break;
      case 'italic':
        wrapSelectedText('<i>', '</i>');
        break;
      case 'underline':
        wrapSelectedText('<u>', '</u>');
        break;
      case 'strikethrough':
        wrapSelectedText('<s>', '</s>');
        break;
      case 'left':
        wrapSelectedText('<div style="text-align: left;">', '</div>');
        break;
      case 'center':
        wrapSelectedText('<div style="text-align: center;">', '</div>');
        break;
      case 'right':
        wrapSelectedText('<div style="text-align: right;">', '</div>');
        break;
    }
  }, [wrapSelectedText]);

  const applyColor = useCallback((color: string) => {
    wrapSelectedText(`<span style="color: ${color};">`, '</span>');
    setShowColorPicker(false);
  }, [wrapSelectedText]);

  const applyFontSize = useCallback((size: string) => {
    wrapSelectedText(`<span style="font-size: ${size};">`, '</span>');
  }, [wrapSelectedText]);

  return (
    <div className={`border rounded-md ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('strikethrough')}
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('left')}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('center')}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('right')}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="grid grid-cols-8 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => applyColor(color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Type className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32">
            <div className="space-y-1">
              {['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map((size) => (
                <button
                  key={size}
                  className="block w-full text-left px-2 py-1 hover:bg-accent rounded text-sm"
                  onClick={() => applyFontSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Text Area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
};