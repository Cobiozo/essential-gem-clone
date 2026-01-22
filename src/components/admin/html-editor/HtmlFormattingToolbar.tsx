import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link, Type, Palette, Highlighter,
  Undo2, Redo2, RemoveFormatting
} from 'lucide-react';

interface HtmlFormattingToolbarProps {
  onFormat: (command: string, value?: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isInlineEditMode: boolean;
}

const fontSizes = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
  { label: '36px', value: '36px' },
  { label: '48px', value: '48px' },
];

const textColors = [
  '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
  '#8b5cf6', '#ec4899', '#f43f5e', '#0ea5e9', '#6366f1', '#d946ef',
];

const highlightColors = [
  'transparent', '#fef08a', '#fed7aa', '#bbf7d0', '#bfdbfe', '#ddd6fe',
  '#fbcfe8', '#fecaca', '#e0f2fe', '#dcfce7', '#fef3c7', '#f5d0fe',
];

export const HtmlFormattingToolbar: React.FC<HtmlFormattingToolbarProps> = ({
  onFormat,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isInlineEditMode
}) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);

  const handleInsertLink = () => {
    if (linkUrl) {
      onFormat('createLink', linkUrl);
      setLinkUrl('');
      setLinkOpen(false);
    }
  };

  const ToolbarButton: React.FC<{
    icon: React.ReactNode;
    onClick: () => void;
    title: string;
    disabled?: boolean;
    active?: boolean;
  }> = ({ icon, onClick, title, disabled, active }) => (
    <Button
      variant={active ? "default" : "ghost"}
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/20">
      {/* Undo/Redo */}
      <ToolbarButton
        icon={<Undo2 className="h-4 w-4" />}
        onClick={onUndo}
        title="Cofnij (Ctrl+Z)"
        disabled={!canUndo}
      />
      <ToolbarButton
        icon={<Redo2 className="h-4 w-4" />}
        onClick={onRedo}
        title="Ponów (Ctrl+Y)"
        disabled={!canRedo}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <Select onValueChange={(value) => onFormat('formatBlock', value)} disabled={!isInlineEditMode}>
        <SelectTrigger className="h-8 w-24 text-xs">
          <SelectValue placeholder="Nagłówek" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p">Paragraf</SelectItem>
          <SelectItem value="h1">Nagłówek 1</SelectItem>
          <SelectItem value="h2">Nagłówek 2</SelectItem>
          <SelectItem value="h3">Nagłówek 3</SelectItem>
          <SelectItem value="h4">Nagłówek 4</SelectItem>
          <SelectItem value="h5">Nagłówek 5</SelectItem>
          <SelectItem value="h6">Nagłówek 6</SelectItem>
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select onValueChange={(value) => onFormat('fontSize', value)} disabled={!isInlineEditMode}>
        <SelectTrigger className="h-8 w-20 text-xs">
          <SelectValue placeholder="Rozmiar" />
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map(({ label, value }) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text formatting */}
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        onClick={() => onFormat('bold')}
        title="Pogrubienie (Ctrl+B)"
        disabled={!isInlineEditMode}
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        onClick={() => onFormat('italic')}
        title="Kursywa (Ctrl+I)"
        disabled={!isInlineEditMode}
      />
      <ToolbarButton
        icon={<Underline className="h-4 w-4" />}
        onClick={() => onFormat('underline')}
        title="Podkreślenie (Ctrl+U)"
        disabled={!isInlineEditMode}
      />
      <ToolbarButton
        icon={<Strikethrough className="h-4 w-4" />}
        onClick={() => onFormat('strikeThrough')}
        title="Przekreślenie"
        disabled={!isInlineEditMode}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={!isInlineEditMode}
            title="Kolor tekstu"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <Label className="text-xs mb-2 block">Kolor tekstu</Label>
          <div className="grid grid-cols-6 gap-1">
            {textColors.map((color) => (
              <button
                key={color}
                className="h-6 w-6 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => onFormat('foreColor', color)}
                title={color}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlight color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={!isInlineEditMode}
            title="Kolor podświetlenia"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <Label className="text-xs mb-2 block">Podświetlenie</Label>
          <div className="grid grid-cols-6 gap-1">
            {highlightColors.map((color) => (
              <button
                key={color}
                className="h-6 w-6 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
                onClick={() => onFormat('hiliteColor', color)}
                title={color}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <ToolbarButton
        icon={<AlignLeft className="h-4 w-4" />}
        onClick={() => onFormat('justifyLeft')}
        title="Do lewej"
        disabled={!isInlineEditMode}
      />
      <ToolbarButton
        icon={<AlignCenter className="h-4 w-4" />}
        onClick={() => onFormat('justifyCenter')}
        title="Wyśrodkuj"
        disabled={!isInlineEditMode}
      />
      <ToolbarButton
        icon={<AlignRight className="h-4 w-4" />}
        onClick={() => onFormat('justifyRight')}
        title="Do prawej"
        disabled={!isInlineEditMode}
      />
      <ToolbarButton
        icon={<AlignJustify className="h-4 w-4" />}
        onClick={() => onFormat('justifyFull')}
        title="Wyjustuj"
        disabled={!isInlineEditMode}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        onClick={() => onFormat('insertUnorderedList')}
        title="Lista punktowana"
        disabled={!isInlineEditMode}
      />
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        onClick={() => onFormat('insertOrderedList')}
        title="Lista numerowana"
        disabled={!isInlineEditMode}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Link */}
      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={!isInlineEditMode}
            title="Wstaw link (Ctrl+K)"
          >
            <Link className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-2">
            <Label className="text-xs">Adres URL</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInsertLink();
              }}
            />
            <Button size="sm" onClick={handleInsertLink} className="w-full">
              Wstaw link
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear formatting */}
      <ToolbarButton
        icon={<RemoveFormatting className="h-4 w-4" />}
        onClick={() => onFormat('removeFormat')}
        title="Wyczyść formatowanie"
        disabled={!isInlineEditMode}
      />
    </div>
  );
};
