import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Palette,
  Type,
  Eye,
  Code,
  Link,
  List,
  ListOrdered,
  Subscript,
  Superscript,
  Highlighter,
  RotateCcw,
  Quote
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [activeTab, setActiveTab] = useState('edit');

  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
    '#ff0000', '#ff6600', '#ffcc00', '#66ff00', '#00ff66', '#00ffcc',
    '#0066ff', '#6600ff', '#cc00ff', '#ff0066'
  ];

  const highlightColors = [
    '#ffff00', '#ffcc00', '#ff9900', '#ff6600', '#ff3300',
    '#33ff00', '#00ff66', '#00ffcc', '#0099ff', '#6600ff',
    '#ff0099', '#ff6699', '#cccccc', '#999999'
  ];

  const fontFamilies = [
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
    { value: 'Impact, sans-serif', label: 'Impact' },
    { value: 'Comic Sans MS, cursive', label: 'Comic Sans MS' },
    { value: 'Palatino, serif', label: 'Palatino' }
  ];

  const fontSizes = [
    '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'
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
      case 'superscript':
        wrapSelectedText('<sup>', '</sup>');
        break;
      case 'subscript':
        wrapSelectedText('<sub>', '</sub>');
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
      case 'quote':
        wrapSelectedText('<blockquote style="border-left: 4px solid #ccc; margin: 0; padding-left: 16px; font-style: italic;">', '</blockquote>');
        break;
      case 'ul':
        wrapSelectedText('<ul><li>', '</li></ul>');
        break;
      case 'ol':
        wrapSelectedText('<ol><li>', '</li></ol>');
        break;
    }
  }, [wrapSelectedText]);

  const applyColor = useCallback((color: string) => {
    wrapSelectedText(`<span style="color: ${color};">`, '</span>');
    setShowColorPicker(false);
  }, [wrapSelectedText]);

  const applyHighlight = useCallback((color: string) => {
    wrapSelectedText(`<span style="background-color: ${color};">`, '</span>');
    setShowHighlightPicker(false);
  }, [wrapSelectedText]);

  const applyFontSize = useCallback((size: string) => {
    wrapSelectedText(`<span style="font-size: ${size};">`, '</span>');
  }, [wrapSelectedText]);

  const applyFontFamily = useCallback((family: string) => {
    wrapSelectedText(`<span style="font-family: ${family};">`, '</span>');
  }, [wrapSelectedText]);

  const insertLink = useCallback(() => {
    if (linkUrl && linkText) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const beforeText = value.substring(0, start);
      const afterText = value.substring(end);
      
      const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
      const newValue = beforeText + linkHtml + afterText;
      onChange(newValue);

      setLinkUrl('');
      setLinkText('');
      setShowLinkDialog(false);

      setTimeout(() => {
        textarea.setSelectionRange(start + linkHtml.length, start + linkHtml.length);
        textarea.focus();
      }, 0);
    }
  }, [value, onChange, linkUrl, linkText]);

  const clearFormatting = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (selectedText.length === 0) return;

    // Remove HTML tags from selected text
    const cleanText = selectedText.replace(/<[^>]*>/g, '');
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);
    
    const newValue = beforeText + cleanText + afterText;
    onChange(newValue);

    setTimeout(() => {
      textarea.setSelectionRange(start, start + cleanText.length);
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  return (
    <div className={`border rounded-md ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between border-b bg-muted/20">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 overflow-x-auto">
            {/* Font Controls */}
            <Select onValueChange={applyFontFamily}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Czcionka" />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map((font) => (
                  <SelectItem key={font.value} value={font.value} className="text-xs">
                    <span style={{ fontFamily: font.value }}>{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={applyFontSize}>
              <SelectTrigger className="w-16 h-8 text-xs">
                <SelectValue placeholder="Rozmiar" />
              </SelectTrigger>
              <SelectContent>
                {fontSizes.map((size) => (
                  <SelectItem key={size} value={size} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Basic Formatting */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('bold')}
              className="h-8 w-8 p-0"
              title="Pogrubienie"
            >
              <Bold className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('italic')}
              className="h-8 w-8 p-0"
              title="Kursywa"
            >
              <Italic className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('underline')}
              className="h-8 w-8 p-0"
              title="Podkreślenie"
            >
              <Underline className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('strikethrough')}
              className="h-8 w-8 p-0"
              title="Przekreślenie"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('superscript')}
              className="h-8 w-8 p-0"
              title="Indeks górny"
            >
              <Superscript className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('subscript')}
              className="h-8 w-8 p-0"
              title="Indeks dolny"
            >
              <Subscript className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Alignment */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('left')}
              className="h-8 w-8 p-0"
              title="Wyrównaj do lewej"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('center')}
              className="h-8 w-8 p-0"
              title="Wyśrodkuj"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('right')}
              className="h-8 w-8 p-0"
              title="Wyrównaj do prawej"
            >
              <AlignRight className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Lists and Quote */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('ul')}
              className="h-8 w-8 p-0"
              title="Lista punktowana"
            >
              <List className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('ol')}
              className="h-8 w-8 p-0"
              title="Lista numerowana"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('quote')}
              className="h-8 w-8 p-0"
              title="Cytat"
            >
              <Quote className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Colors */}
            <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Kolor tekstu"
                >
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kolor tekstu</Label>
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
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={showHighlightPicker} onOpenChange={setShowHighlightPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Podświetlenie"
                >
                  <Highlighter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kolor podświetlenia</Label>
                  <div className="grid grid-cols-7 gap-1">
                    {highlightColors.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => applyHighlight(color)}
                      />
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Link */}
            <Popover open={showLinkDialog} onOpenChange={setShowLinkDialog}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Wstaw link"
                >
                  <Link className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Dodaj link</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Tekst linku"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                    />
                    <Input
                      placeholder="https://example.com"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                    <Button onClick={insertLink} className="w-full">
                      Wstaw link
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Clear Formatting */}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFormatting}
              className="h-8 w-8 p-0"
              title="Usuń formatowanie"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Tab Triggers */}
          <TabsList className="grid w-32 grid-cols-2 mr-2">
            <TabsTrigger value="edit" className="text-xs">
              <Code className="h-3 w-3 mr-1" />
              Edytuj
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Podgląd
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="m-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div 
            className="p-3 min-h-[80px] prose prose-sm max-w-none"
            style={{ minHeight: `${rows * 1.5}rem` }}
            dangerouslySetInnerHTML={{ 
              __html: value || `<span class="text-muted-foreground">${placeholder}</span>` 
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};