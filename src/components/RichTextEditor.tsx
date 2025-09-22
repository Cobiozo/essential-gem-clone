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
  const savedRangeRef = useRef<Range | null>(null);
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
  const [isFocused, setIsFocused] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateFormatting = (updates: Partial<TextFormatting>) => {
    const newFormatting = { ...currentFormatting, ...updates };
    setCurrentFormatting(newFormatting);
    onFormattingChange?.(newFormatting);
  };

  const handleCommand = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        handleContentChange();
      }, 0);
    }
  };

  const handleContentChange = () => {
    if (editorRef.current && !isUpdating) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const handleInput = () => {
    handleContentChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          handleCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          handleCommand('underline');
          break;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    setTimeout(() => {
      handleContentChange();
    }, 0);
  };

  // Sync content when value prop changes (avoid infinite loops)
  useEffect(() => {
    if (!editorRef.current) return;
    // Do not re-sync content while user is actively interacting to preserve selection
    if (isFocused) return;

    if (value !== editorRef.current.innerHTML) {
      setIsUpdating(true);

      const selection = window.getSelection();
      let range: Range | null = null;

      // Prefer saved range if available
      if (savedRangeRef.current) {
        range = savedRangeRef.current.cloneRange();
      } else if (selection && selection.rangeCount > 0) {
        try {
          range = selection.getRangeAt(0).cloneRange();
        } catch {
          range = null;
        }
      }

      editorRef.current.innerHTML = value || '';

      // Try to restore cursor position
      const sel = window.getSelection();
      if (range && editorRef.current.contains(range.startContainer)) {
        try {
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch {}
      } else {
        // Fallback: place caret at end to keep editing fluid
        try {
          const endRange = document.createRange();
          endRange.selectNodeContents(editorRef.current);
          endRange.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(endRange);
        } catch {}
      }

      setIsUpdating(false);
    }
  }, [value, isFocused]);

  // Update formatting when formatting prop changes
  useEffect(() => {
    if (formatting) {
      setCurrentFormatting(formatting);
    }
  }, [formatting]);

  // Track selection inside editor to preserve it across updates
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!editorRef.current || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.startContainer)) {
        // store clone to avoid live range issues
        savedRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const isEmpty = !value || value.trim() === '' || value === '<br>' || value === '<div><br></div>';

  return (
    <div className={cn("border rounded-lg relative", className)}>
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
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('bold');
          }}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Pogrub (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('italic');
          }}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Kursywa (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('underline');
          }}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Podkreśl (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignment Buttons */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('justifyLeft');
          }}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Wyrównaj do lewej"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('justifyCenter');
          }}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Wyśrodkuj"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('justifyRight');
          }}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Wyrównaj do prawej"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('insertUnorderedList');
          }}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Lista punktowana"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('insertOrderedList');
          }}
          className="h-8 w-8 p-0 hover:bg-accent"
          title="Lista numerowana"
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
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          spellCheck={true}
          suppressContentEditableWarning={true}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={cn(
            "min-h-[120px] p-4 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-b-lg bg-background",
            "prose prose-sm max-w-none [&>*]:mb-2 [&>*:last-child]:mb-0",
            "focus:bg-background selection:bg-primary/20",
            "whitespace-pre-wrap"
          )}
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
            textTransform: currentFormatting.textTransform as any,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            userSelect: 'text',
            cursor: 'text'
          }}
        />
        
        {/* Placeholder */}
        {isEmpty && !isFocused && (
          <div 
            className="absolute top-4 left-4 text-muted-foreground pointer-events-none select-none"
            style={{
              fontSize: `${currentFormatting.fontSize}px`,
              fontFamily: currentFormatting.fontFamily
            }}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
};