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
  Quote,
  Image,
  Video
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
  const previewRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
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
    if (activeTab === 'preview') {
      // Handle contentEditable preview mode
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (selectedText.length === 0) return;

      // Create new elements
      const wrapper = document.createElement('span');
      wrapper.innerHTML = startTag + selectedText + endTag;
      
      // Replace selection with wrapped content
      range.deleteContents();
      range.insertNode(wrapper);
      
      // Update the HTML value
      if (previewRef.current) {
        onChange(previewRef.current.innerHTML);
      }
      
      // Clear selection
      selection.removeAllRanges();
      
      return;
    }

    // Handle textarea edit mode
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
  }, [value, onChange, activeTab]);

  const applyFormatting = useCallback((format: string) => {
    if (activeTab === 'preview') {
      // Use document.execCommand for contentEditable
      document.execCommand('styleWithCSS', false, 'true');
      
      switch (format) {
        case 'bold':
          document.execCommand('bold', false, '');
          break;
        case 'italic':
          document.execCommand('italic', false, '');
          break;
        case 'underline':
          document.execCommand('underline', false, '');
          break;
        case 'strikethrough':
          document.execCommand('strikethrough', false, '');
          break;
        case 'left':
          document.execCommand('justifyLeft', false, '');
          break;
        case 'center':
          document.execCommand('justifyCenter', false, '');
          break;
        case 'right':
          document.execCommand('justifyRight', false, '');
          break;
        case 'ul':
          document.execCommand('insertUnorderedList', false, '');
          break;
        case 'ol':
          document.execCommand('insertOrderedList', false, '');
          break;
      }
      
      // Update value
      if (previewRef.current) {
        onChange(previewRef.current.innerHTML);
      }
      return;
    }

    // Handle textarea mode
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
  }, [wrapSelectedText, activeTab]);

  const applyColor = useCallback((color: string) => {
    if (activeTab === 'preview') {
      document.execCommand('foreColor', false, color);
      if (previewRef.current) {
        onChange(previewRef.current.innerHTML);
      }
    } else {
      wrapSelectedText(`<span style="color: ${color};">`, '</span>');
    }
    setShowColorPicker(false);
  }, [wrapSelectedText, activeTab, onChange]);

  const applyHighlight = useCallback((color: string) => {
    if (activeTab === 'preview') {
      document.execCommand('backColor', false, color);
      if (previewRef.current) {
        onChange(previewRef.current.innerHTML);
      }
    } else {
      wrapSelectedText(`<span style="background-color: ${color};">`, '</span>');
    }
    setShowHighlightPicker(false);
  }, [wrapSelectedText, activeTab, onChange]);

  const applyFontSize = useCallback((size: string) => {
    if (activeTab === 'preview') {
      document.execCommand('fontSize', false, '1');
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = size;
        try {
          range.surroundContents(span);
          if (previewRef.current) {
            onChange(previewRef.current.innerHTML);
          }
        } catch (e) {
          // Fallback if surroundContents fails
          wrapSelectedText(`<span style="font-size: ${size};">`, '</span>');
        }
      }
    } else {
      wrapSelectedText(`<span style="font-size: ${size};">`, '</span>');
    }
  }, [wrapSelectedText, activeTab, onChange]);

  const applyFontFamily = useCallback((family: string) => {
    if (activeTab === 'preview') {
      document.execCommand('fontName', false, family);
      if (previewRef.current) {
        onChange(previewRef.current.innerHTML);
      }
    } else {
      wrapSelectedText(`<span style="font-family: ${family};">`, '</span>');
    }
  }, [wrapSelectedText, activeTab, onChange]);

  const insertLink = useCallback(() => {
    if (linkUrl && linkText) {
      if (activeTab === 'preview') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          
          const link = document.createElement('a');
          link.href = linkUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = linkText;
          
          range.insertNode(link);
          if (previewRef.current) {
            onChange(previewRef.current.innerHTML);
          }
        }
      } else {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const beforeText = value.substring(0, start);
        const afterText = value.substring(end);
        
        const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        const newValue = beforeText + linkHtml + afterText;
        onChange(newValue);

        setTimeout(() => {
          textarea.setSelectionRange(start + linkHtml.length, start + linkHtml.length);
          textarea.focus();
        }, 0);
      }

      setLinkUrl('');
      setLinkText('');
      setShowLinkDialog(false);
    }
  }, [value, onChange, linkUrl, linkText, activeTab]);

  const insertImage = useCallback(() => {
    if (imageUrl) {
      const altText = imageAlt || 'Image';
      const imageHtml = `<img src="${imageUrl}" alt="${altText}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />`;
      
      if (activeTab === 'preview') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          
          const div = document.createElement('div');
          div.innerHTML = imageHtml;
          const img = div.firstChild as HTMLElement;
          
          range.insertNode(img);
          if (previewRef.current) {
            onChange(previewRef.current.innerHTML);
          }
        }
      } else {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const beforeText = value.substring(0, start);
        const afterText = value.substring(end);
        
        const newValue = beforeText + imageHtml + afterText;
        onChange(newValue);

        setTimeout(() => {
          textarea.setSelectionRange(start + imageHtml.length, start + imageHtml.length);
          textarea.focus();
        }, 0);
      }

      setImageUrl('');
      setImageAlt('');
      setShowImageDialog(false);
    }
  }, [value, onChange, imageUrl, imageAlt, activeTab]);

  const insertVideo = useCallback(() => {
    if (videoUrl) {
      let embedHtml = '';
      const title = videoTitle || 'Video';
      
      // YouTube URL detection and conversion
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        let videoId = '';
        if (videoUrl.includes('youtube.com/watch?v=')) {
          videoId = videoUrl.split('watch?v=')[1].split('&')[0];
        } else if (videoUrl.includes('youtu.be/')) {
          videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        }
        
        if (videoId) {
          embedHtml = `<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; margin: 16px 0;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;" allowfullscreen title="${title}"></iframe></div>`;
        }
      } else if (videoUrl.includes('vimeo.com')) {
        const videoId = videoUrl.split('vimeo.com/')[1]?.split('/')[0];
        if (videoId) {
          embedHtml = `<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; margin: 16px 0;"><iframe src="https://player.vimeo.com/video/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;" allowfullscreen title="${title}"></iframe></div>`;
        }
      } else {
        // Direct video file
        embedHtml = `<video controls style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;"><source src="${videoUrl}" type="video/mp4">Twoja przeglądarka nie obsługuje odtwarzacza wideo.</video>`;
      }

      if (embedHtml) {
        if (activeTab === 'preview') {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            const div = document.createElement('div');
            div.innerHTML = embedHtml;
            const videoElement = div.firstChild as HTMLElement;
            
            range.insertNode(videoElement);
            if (previewRef.current) {
              onChange(previewRef.current.innerHTML);
            }
          }
        } else {
          const textarea = textareaRef.current;
          if (!textarea) return;

          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const beforeText = value.substring(0, start);
          const afterText = value.substring(end);
          
          const newValue = beforeText + embedHtml + afterText;
          onChange(newValue);

          setTimeout(() => {
            textarea.setSelectionRange(start + embedHtml.length, start + embedHtml.length);
            textarea.focus();
          }, 0);
        }
      }

      setVideoUrl('');
      setVideoTitle('');
      setShowVideoDialog(false);
    }
  }, [value, onChange, videoUrl, videoTitle, activeTab]);

  const clearFormatting = useCallback(() => {
    if (activeTab === 'preview') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText.length === 0) return;

        range.deleteContents();
        range.insertNode(document.createTextNode(selectedText));
        
        if (previewRef.current) {
          onChange(previewRef.current.innerHTML);
        }
      }
      return;
    }

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
  }, [value, onChange, activeTab]);

  const handlePreviewChange = useCallback(() => {
    if (previewRef.current) {
      onChange(previewRef.current.innerHTML);
    }
  }, [onChange]);

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

            {/* Image */}
            <Popover open={showImageDialog} onOpenChange={setShowImageDialog}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Wstaw obraz"
                >
                  <Image className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Dodaj obraz</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="URL obrazu"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <Input
                      placeholder="Opis obrazu (opcjonalny)"
                      value={imageAlt}
                      onChange={(e) => setImageAlt(e.target.value)}
                    />
                    <Button onClick={insertImage} className="w-full">
                      Wstaw obraz
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Video */}
            <Popover open={showVideoDialog} onOpenChange={setShowVideoDialog}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Wstaw wideo"
                >
                  <Video className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Dodaj wideo</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="URL wideo (YouTube, Vimeo lub bezpośredni link)"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                    />
                    <Input
                      placeholder="Tytuł wideo (opcjonalny)"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                    />
                    <Button onClick={insertVideo} className="w-full">
                      Wstaw wideo
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6 mx-1" />

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
            ref={previewRef}
            contentEditable
            suppressContentEditableWarning={true}
            onInput={handlePreviewChange}
            onBlur={handlePreviewChange}
            className="p-3 min-h-[80px] prose prose-sm max-w-none focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
            style={{ 
              minHeight: `${rows * 1.5}rem`,
              direction: 'ltr',
              textAlign: 'left',
              unicodeBidi: 'normal'
            }}
            dangerouslySetInnerHTML={{ 
              __html: value || `<span class="text-muted-foreground">${placeholder}</span>` 
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};