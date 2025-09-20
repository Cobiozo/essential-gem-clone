import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Type, 
  Palette, 
  Smile,
  Copy,
  Eye,
  Save
} from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { useToast } from '@/hooks/use-toast';

interface TextStyle {
  fontSize: number;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
  lineHeight: number;
  letterSpacing: number;
}

interface TextEditorProps {
  initialText?: string;
  initialStyle?: Partial<TextStyle>;
  onSave?: (text: string, style: TextStyle) => void;
  placeholder?: string;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  initialText = '',
  initialStyle = {},
  onSave,
  placeholder = 'Wprowadź tekst...'
}) => {
  const [text, setText] = useState(initialText);
  const [textStyle, setTextStyle] = useState<TextStyle>({
    fontSize: 16,
    fontWeight: '400',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    color: '#333333',
    backgroundColor: 'transparent',
    lineHeight: 1.5,
    letterSpacing: 0,
    ...initialStyle
  });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const fontSizes = [
    { value: 12, label: '12px (Mały)' },
    { value: 14, label: '14px (Normalny)' },
    { value: 16, label: '16px (Średni)' },
    { value: 18, label: '18px (Duży)' },
    { value: 20, label: '20px (Większy)' },
    { value: 24, label: '24px (Nagłówek)' },
    { value: 32, label: '32px (Tytuł)' },
    { value: 48, label: '48px (Wielki)' }
  ];

  const fontWeights = [
    { value: '300', label: 'Lekka' },
    { value: '400', label: 'Normalna' },
    { value: '500', label: 'Średnia' },
    { value: '600', label: 'Półgruba' },
    { value: '700', label: 'Gruba' },
    { value: '800', label: 'Bardzo gruba' }
  ];

  const colorPresets = [
    { name: 'Czarny', color: '#000000' },
    { name: 'Ciemnoszary', color: '#333333' },
    { name: 'Szary', color: '#666666' },
    { name: 'Jasnoszary', color: '#999999' },
    { name: 'Biały', color: '#FFFFFF' },
    { name: 'Ciemnozielony', color: '#1B5E20' },
    { name: 'Zielony', color: '#2D6A4F' },
    { name: 'Jasnozielony', color: '#4CAF50' },
    { name: 'Ciemnoniebieski', color: '#0D47A1' },
    { name: 'Niebieski', color: '#0066CC' },
    { name: 'Jasnoniebieski', color: '#2196F3' },
    { name: 'Cyjan', color: '#00BCD4' },
    { name: 'Ciemnoczerwony', color: '#B71C1C' },
    { name: 'Czerwony', color: '#CC0000' },
    { name: 'Różowy', color: '#E91E63' },
    { name: 'Fioletowy', color: '#6600CC' },
    { name: 'Indygo', color: '#3F51B5' },
    { name: 'Ciemnopomarańczowy', color: '#E65100' },
    { name: 'Pomarańczowy', color: '#FF6600' },
    { name: 'Jasnopomarańczowy', color: '#FF9800' },
    { name: 'Żółty', color: '#FFC107' },
    { name: 'Złoty', color: '#FFD700' },
    { name: 'Brązowy', color: '#795548' },
    { name: 'Teal', color: '#009688' }
  ];

  const backgroundPresets = [
    { name: 'Przezroczysty', color: 'transparent' },
    { name: 'Biały', color: '#FFFFFF' },
    { name: 'Jasnoszary', color: '#F5F5F5' },
    { name: 'Szary', color: '#E0E0E0' },
    { name: 'Ciemnoszary', color: '#BDBDBD' },
    { name: 'Jasnozielony', color: '#E8F5E8' },
    { name: 'Zielony', color: '#C8E6C9' },
    { name: 'Jasnoniebieski', color: '#E8F4FD' },
    { name: 'Niebieski', color: '#BBDEFB' },
    { name: 'Żółty', color: '#FFF8E1' },
    { name: 'Pomarańczowy', color: '#FFE0B2' },
    { name: 'Różowy', color: '#FCE4EC' },
    { name: 'Fioletowy', color: '#F3E5F5' },
    { name: 'Czerwony', color: '#FFEBEE' },
    { name: 'Cyjan', color: '#E0F2F1' }
  ];

  const insertTextAtCursor = (insertText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.substring(0, start) + insertText + text.substring(end);
    
    setText(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertText.length, start + insertText.length);
    }, 0);
  };

  const handleEmojiSelect = (emoji: string) => {
    insertTextAtCursor(emoji);
  };

  const toggleBold = () => {
    setTextStyle(prev => ({
      ...prev,
      fontWeight: prev.fontWeight === '700' ? '400' : '700'
    }));
  };

  const toggleItalic = () => {
    setTextStyle(prev => ({
      ...prev,
      fontStyle: prev.fontStyle === 'italic' ? 'normal' : 'italic'
    }));
  };

  const toggleUnderline = () => {
    setTextStyle(prev => ({
      ...prev,
      textDecoration: prev.textDecoration === 'underline' ? 'none' : 'underline'
    }));
  };

  const setAlignment = (align: 'left' | 'center' | 'right') => {
    setTextStyle(prev => ({ ...prev, textAlign: align }));
  };

  const copyTextToClipboard = () => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Tekst skopiowany",
        description: "Tekst został skopiowany do schowka",
      });
    });
  };

  const handleSave = () => {
    onSave?.(text, textStyle);
    toast({
      title: "Tekst zapisany",
      description: "Zmiany zostały zastosowane",
    });
  };

  const previewStyle: React.CSSProperties = {
    fontSize: `${textStyle.fontSize}px`,
    fontWeight: textStyle.fontWeight,
    fontStyle: textStyle.fontStyle,
    textDecoration: textStyle.textDecoration,
    textAlign: textStyle.textAlign,
    color: textStyle.color,
    backgroundColor: textStyle.backgroundColor === 'transparent' ? undefined : textStyle.backgroundColor,
    lineHeight: textStyle.lineHeight,
    letterSpacing: `${textStyle.letterSpacing}px`,
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid hsl(var(--border))',
    minHeight: '100px'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Type className="w-5 h-5" />
          <span>Edytor tekstu</span>
        </CardTitle>
        <CardDescription>
          Formatuj tekst z zaawansowanymi opcjami stylowania
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toolbar */}
        <div className="border rounded-lg p-3 bg-muted/20">
          <div className="flex flex-wrap items-center gap-2">
            {/* Font Formatting */}
            <div className="flex items-center gap-1">
              <Button
                variant={textStyle.fontWeight === '700' ? "default" : "outline"}
                size="sm"
                onClick={toggleBold}
                className="h-8 w-8 p-0"
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant={textStyle.fontStyle === 'italic' ? "default" : "outline"}
                size="sm"
                onClick={toggleItalic}
                className="h-8 w-8 p-0"
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                variant={textStyle.textDecoration === 'underline' ? "default" : "outline"}
                size="sm"
                onClick={toggleUnderline}
                className="h-8 w-8 p-0"
              >
                <Underline className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Text Alignment */}
            <div className="flex items-center gap-1">
              <Button
                variant={textStyle.textAlign === 'left' ? "default" : "outline"}
                size="sm"
                onClick={() => setAlignment('left')}
                className="h-8 w-8 p-0"
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={textStyle.textAlign === 'center' ? "default" : "outline"}
                size="sm"
                onClick={() => setAlignment('center')}
                className="h-8 w-8 p-0"
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                variant={textStyle.textAlign === 'right' ? "default" : "outline"}
                size="sm"
                onClick={() => setAlignment('right')}
                className="h-8 w-8 p-0"
              >
                <AlignRight className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Color and Emoji */}
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <Palette className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium mb-2 block">Kolor tekstu</Label>
                       <div className="grid grid-cols-6 gap-1 mb-2">
                         {colorPresets.map((preset) => (
                          <button
                            key={preset.name}
                            className="w-6 h-6 rounded border-2 border-border hover:scale-110 transition-transform"
                            style={{ backgroundColor: preset.color }}
                            onClick={() => setTextStyle(prev => ({ ...prev, color: preset.color }))}
                            title={preset.name}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={textStyle.color}
                        onChange={(e) => setTextStyle(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full h-8 rounded border cursor-pointer"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                trigger={
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <Smile className="w-4 h-4" />
                  </Button>
                }
              />
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={copyTextToClipboard}
                className="h-8 w-8 p-0"
                disabled={!text.trim()}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Text Input */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Treść</Label>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={6}
            className="w-full resize-none"
          />
        </div>

        {/* Style Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Rozmiar czcionki</Label>
              <Select 
                value={textStyle.fontSize.toString()} 
                onValueChange={(value) => setTextStyle(prev => ({ ...prev, fontSize: parseInt(value) }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value.toString()}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Grubość czcionki</Label>
              <Select 
                value={textStyle.fontWeight} 
                onValueChange={(value) => setTextStyle(prev => ({ ...prev, fontWeight: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontWeights.map((weight) => (
                    <SelectItem key={weight.value} value={weight.value}>
                      {weight.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Wysokość linii: {textStyle.lineHeight}
              </Label>
              <Slider
                value={[textStyle.lineHeight]}
                onValueChange={([value]) => setTextStyle(prev => ({ ...prev, lineHeight: value }))}
                min={1.0}
                max={3.0}
                step={0.1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Odstęp między literami: {textStyle.letterSpacing}px
              </Label>
              <Slider
                value={[textStyle.letterSpacing]}
                onValueChange={([value]) => setTextStyle(prev => ({ ...prev, letterSpacing: value }))}
                min={-2}
                max={10}
                step={0.5}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Kolor tła</Label>
               <div className="grid grid-cols-3 gap-2 mb-2 max-h-32 overflow-y-auto">
                 {backgroundPresets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs justify-start"
                    onClick={() => setTextStyle(prev => ({ ...prev, backgroundColor: preset.color }))}
                  >
                    <div 
                      className="w-4 h-4 rounded mr-1 border" 
                      style={{ backgroundColor: preset.color === 'transparent' ? 'white' : preset.color }}
                    />
                    {preset.name}
                  </Button>
                ))}
              </div>
              <input
                type="color"
                value={textStyle.backgroundColor === 'transparent' ? '#ffffff' : textStyle.backgroundColor}
                onChange={(e) => setTextStyle(prev => ({ ...prev, backgroundColor: e.target.value }))}
                className="w-full h-10 rounded border cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Eye className="w-4 h-4" />
            <Label className="text-sm font-medium">Podgląd</Label>
          </div>
          <div style={previewStyle}>
            {text || placeholder}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!text.trim()}>
            <Save className="w-4 h-4 mr-2" />
            Zastosuj formatowanie
          </Button>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-xs text-muted-foreground pt-4 border-t">
          <span>Znaków: {text.length}</span>
          <span>Słów: {text.trim().split(/\s+/).filter(word => word.length > 0).length}</span>
          <span>Linii: {text.split('\n').length}</span>
        </div>
      </CardContent>
    </Card>
  );
};