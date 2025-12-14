import React, { useRef, useState, useCallback, useEffect } from 'react';
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
import { MediaUpload } from '@/components/MediaUpload';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  compact?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Wprowadź tekst...",
  rows = 3,
  className = "",
  compact = false
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
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [activeTab, setActiveTab] = useState('preview');

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
    const finalImageUrl = uploadMode === 'file' ? uploadedImageUrl : imageUrl;
    if (finalImageUrl) {
      const altText = imageAlt || 'Image';
      const imageHtml = `<img src="${finalImageUrl}" alt="${altText}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />`;
      
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
      setUploadedImageUrl('');
      setUploadMode('url');
      setShowImageDialog(false);
    }
  }, [value, onChange, imageUrl, imageAlt, activeTab, uploadMode, uploadedImageUrl]);

  const insertVideo = useCallback(() => {
    const finalVideoUrl = uploadMode === 'file' ? uploadedVideoUrl : videoUrl;
    if (finalVideoUrl) {
      let embedHtml = '';
      const title = videoTitle || 'Video';
      
      // YouTube URL detection and conversion
      if (finalVideoUrl.includes('youtube.com') || finalVideoUrl.includes('youtu.be')) {
        let videoId = '';
        if (finalVideoUrl.includes('youtube.com/watch?v=')) {
          videoId = finalVideoUrl.split('watch?v=')[1].split('&')[0];
        } else if (finalVideoUrl.includes('youtu.be/')) {
          videoId = finalVideoUrl.split('youtu.be/')[1].split('?')[0];
        }
        
        if (videoId) {
          embedHtml = `<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; margin: 16px 0;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;" allowfullscreen title="${title}"></iframe></div>`;
        }
      } else if (finalVideoUrl.includes('vimeo.com')) {
        const videoId = finalVideoUrl.split('vimeo.com/')[1]?.split('/')[0];
        if (videoId) {
          embedHtml = `<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; margin: 16px 0;"><iframe src="https://player.vimeo.com/video/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;" allowfullscreen title="${title}"></iframe></div>`;
        }
      } else {
        // Direct video file
        embedHtml = `<video controls style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;"><source src="${finalVideoUrl}" type="video/mp4">Twoja przeglądarka nie obsługuje odtwarzacza wideo.</video>`;
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
      setUploadedVideoUrl('');
      setUploadMode('url');
      setShowVideoDialog(false);
    }
  }, [value, onChange, videoUrl, videoTitle, activeTab, uploadMode, uploadedVideoUrl]);

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

  const isUserTypingRef = useRef(false);

  // Save and restore cursor position
  const saveCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !previewRef.current) return null;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(previewRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const caretOffset = preCaretRange.toString().length;
    
    return caretOffset;
  }, []);

  const restoreCursorPosition = useCallback((caretOffset: number | null) => {
    if (caretOffset === null || !previewRef.current) return;
    
    const range = document.createRange();
    const sel = window.getSelection();
    let charCount = 0;
    let nodeStack: Node[] = [previewRef.current];
    let node: Node | undefined;
    let foundStart = false;

    while (!foundStart && (node = nodeStack.pop())) {
      if (node.nodeType === 3) { // Text node
        const nextCharCount = charCount + (node.textContent?.length || 0);
        if (caretOffset <= nextCharCount) {
          range.setStart(node, caretOffset - charCount);
          range.setEnd(node, caretOffset - charCount);
          foundStart = true;
        }
        charCount = nextCharCount;
      } else {
        for (let i = node.childNodes.length - 1; i >= 0; i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    if (foundStart && sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  const handlePreviewChange = useCallback(() => {
    if (previewRef.current && isUserTypingRef.current) {
      const cursorPos = saveCursorPosition();
      onChange(previewRef.current.innerHTML);
      // Restore cursor position on next tick
      setTimeout(() => restoreCursorPosition(cursorPos), 0);
    }
  }, [onChange, saveCursorPosition, restoreCursorPosition]);

  // Update preview content only when value changes from outside (not from user typing)
  useEffect(() => {
    if (previewRef.current && !isUserTypingRef.current && activeTab === 'preview') {
      const currentHtml = previewRef.current.innerHTML;
      const newHtml = value || `<span class="text-muted-foreground">${placeholder}</span>`;
      
      // Only update if content actually changed (avoid unnecessary updates)
      if (currentHtml !== newHtml) {
        const cursorPos = saveCursorPosition();
        previewRef.current.innerHTML = newHtml;
        if (cursorPos !== null) {
          setTimeout(() => restoreCursorPosition(cursorPos), 0);
        }
      }
    }
  }, [value, activeTab, placeholder, saveCursorPosition, restoreCursorPosition]);

  const makeImageResizable = useCallback((img: HTMLImageElement) => {
    // Remove existing resize wrapper if any
    const existingWrapper = img.parentElement;
    if (existingWrapper?.classList.contains('resizable-image-wrapper')) {
      return;
    }

    // Create wrapper for resizable image
    const wrapper = document.createElement('div');
    wrapper.className = 'resizable-image-wrapper';
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      border: 2px dashed transparent;
      transition: border-color 0.2s ease;
    `;

    // Insert wrapper before image and move image inside
    img.parentNode?.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    // Create resize handles
    const corners = ['nw', 'ne', 'sw', 'se'];
    const handles: HTMLDivElement[] = [];

    corners.forEach(corner => {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-${corner}`;
      handle.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        background: #2563eb;
        border: 2px solid white;
        border-radius: 50%;
        cursor: ${corner.includes('n') && corner.includes('w') || corner.includes('s') && corner.includes('e') ? 'nw-resize' : 'ne-resize'};
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 10;
      `;

      // Position handles
      if (corner.includes('n')) handle.style.top = '-6px';
      if (corner.includes('s')) handle.style.bottom = '-6px';
      if (corner.includes('w')) handle.style.left = '-6px';
      if (corner.includes('e')) handle.style.right = '-6px';

      wrapper.appendChild(handle);
      handles.push(handle);
    });

    // Show/hide handles on hover
    wrapper.addEventListener('mouseenter', () => {
      wrapper.style.borderColor = '#2563eb';
      handles.forEach(handle => {
        handle.style.opacity = '1';
      });
    });

    wrapper.addEventListener('mouseleave', () => {
      wrapper.style.borderColor = 'transparent';
      handles.forEach(handle => {
        handle.style.opacity = '0';
      });
    });

    // Add resize functionality
    handles.forEach((handle, index) => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = img.offsetWidth;
        const startHeight = img.offsetHeight;
        const aspectRatio = startWidth / startHeight;

        const corner = corners[index];
        
        const handleMouseMove = (e: MouseEvent) => {
          let deltaX = e.clientX - startX;
          let deltaY = e.clientY - startY;

          // Calculate new dimensions based on corner
          let newWidth = startWidth;
          let newHeight = startHeight;

          if (corner.includes('e')) {
            newWidth = startWidth + deltaX;
          } else if (corner.includes('w')) {
            newWidth = startWidth - deltaX;
          }

          if (corner.includes('s')) {
            newHeight = startHeight + deltaY;
          } else if (corner.includes('n')) {
            newHeight = startHeight - deltaY;
          }

          // Maintain aspect ratio by using the larger dimension change
          const widthChange = Math.abs(newWidth - startWidth);
          const heightChange = Math.abs(newHeight - startHeight);

          if (widthChange > heightChange) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }

          // Set minimum size
          newWidth = Math.max(50, newWidth);
          newHeight = Math.max(50, newHeight);

          // Update image size
          img.style.width = `${newWidth}px`;
          img.style.height = `${newHeight}px`;
          img.style.maxWidth = 'none';

          // Update the actual img attributes for HTML consistency
          img.setAttribute('width', newWidth.toString());
          img.setAttribute('height', newHeight.toString());
        };

        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          
          // Update the HTML content
          if (previewRef.current) {
            onChange(previewRef.current.innerHTML);
          }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      });
    });
  }, [onChange]);

  // Add effect to make existing images resizable when in preview mode
  useEffect(() => {
    if (activeTab === 'preview' && previewRef.current) {
      const images = previewRef.current.querySelectorAll('img');
      images.forEach((img) => {
        if (!img.parentElement?.classList.contains('resizable-image-wrapper')) {
          makeImageResizable(img as HTMLImageElement);
        }
      });

      // Observer to make new images resizable
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              const images = element.querySelectorAll ? element.querySelectorAll('img') : [];
              images.forEach((img) => {
                if (!img.parentElement?.classList.contains('resizable-image-wrapper')) {
                  makeImageResizable(img as HTMLImageElement);
                }
              });
              
              // Check if the node itself is an image
              if (element.tagName === 'IMG' && !element.parentElement?.classList.contains('resizable-image-wrapper')) {
                makeImageResizable(element as HTMLImageElement);
              }
            }
          });
        });
      });

      observer.observe(previewRef.current, {
        childList: true,
        subtree: true
      });

      return () => observer.disconnect();
    }
  }, [activeTab, makeImageResizable]);

  const btnClass = compact ? "h-6 w-6 p-0" : "h-8 w-8 p-0";
  const iconClass = compact ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className={`border rounded-md flex flex-col ${compact ? 'w-full max-w-full overflow-hidden' : 'h-full'} ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
        <div className="flex flex-col border-b bg-muted/20 shrink-0">
          {/* Tab Triggers */}
          <div className="flex items-center justify-between p-1.5 border-b">
            <TabsList className={`grid ${compact ? 'w-32' : 'w-44'} grid-cols-2 shrink-0`}>
              <TabsTrigger value="edit" className="text-xs">
                <Code className="h-3 w-3 mr-1" />
                {compact ? 'HTML' : 'Edytuj'}
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                {compact ? 'Edytor' : 'Podgląd'}
              </TabsTrigger>
            </TabsList>
          </div>
          {/* Toolbar */}
          <div className={`flex items-center gap-0.5 p-1.5 ${compact ? 'flex-wrap' : 'overflow-x-auto'}`}>
            {/* Font Controls - hide in compact mode */}
            {!compact && (
              <>
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
              </>
            )}

            {/* Basic Formatting */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('bold')}
              className={btnClass}
              title="Pogrubienie"
            >
              <Bold className={iconClass} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('italic')}
              className={btnClass}
              title="Kursywa"
            >
              <Italic className={iconClass} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('underline')}
              className={btnClass}
              title="Podkreślenie"
            >
              <Underline className={iconClass} />
            </Button>
            
            {!compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyFormatting('strikethrough')}
                className={btnClass}
                title="Przekreślenie"
              >
                <Strikethrough className={iconClass} />
              </Button>
            )}

            {!compact && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormatting('superscript')}
                  className={btnClass}
                  title="Indeks górny"
                >
                  <Superscript className={iconClass} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormatting('subscript')}
                  className={btnClass}
                  title="Indeks dolny"
                >
                  <Subscript className={iconClass} />
                </Button>
              </>
            )}

            {!compact && <Separator orientation="vertical" className="h-6 mx-1" />}

            {/* Alignment */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('left')}
              className={btnClass}
              title="Wyrównaj do lewej"
            >
              <AlignLeft className={iconClass} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('center')}
              className={btnClass}
              title="Wyśrodkuj"
            >
              <AlignCenter className={iconClass} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('right')}
              className={btnClass}
              title="Wyrównaj do prawej"
            >
              <AlignRight className={iconClass} />
            </Button>

            {!compact && <Separator orientation="vertical" className="h-6 mx-1" />}

            {/* Lists and Quote */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('ul')}
              className={btnClass}
              title="Lista punktowana"
            >
              <List className={iconClass} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('ol')}
              className={btnClass}
              title="Lista numerowana"
            >
              <ListOrdered className={iconClass} />
            </Button>

            {!compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyFormatting('quote')}
                className={btnClass}
                title="Cytat"
              >
                <Quote className={iconClass} />
              </Button>
            )}

            {!compact && <Separator orientation="vertical" className="h-6 mx-1" />}

            {/* Colors */}
            <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={btnClass}
                  title="Kolor tekstu"
                >
                  <Palette className={iconClass} />
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

            {!compact && (
              <Popover open={showHighlightPicker} onOpenChange={setShowHighlightPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={btnClass}
                    title="Podświetlenie"
                  >
                    <Highlighter className={iconClass} />
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
            )}

            {!compact && <Separator orientation="vertical" className="h-6 mx-1" />}

            {/* Link */}
            <Popover open={showLinkDialog} onOpenChange={setShowLinkDialog}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={btnClass}
                  title="Wstaw link"
                >
                  <Link className={iconClass} />
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

            {/* Image - hide in compact mode */}
            {!compact && (
              <Popover open={showImageDialog} onOpenChange={setShowImageDialog}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={btnClass}
                    title="Wstaw obraz"
                  >
                    <Image className={iconClass} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Dodaj obraz</Label>
                    
                    <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as 'url' | 'file')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="url">Z URL</TabsTrigger>
                        <TabsTrigger value="file">Z urządzenia</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="url" className="space-y-3 mt-3">
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
                          <Button onClick={insertImage} className="w-full" disabled={!imageUrl}>
                            Wstaw obraz
                          </Button>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="file" className="mt-3">
                        <MediaUpload
                          onMediaUploaded={(url, type, altText) => {
                            if (type === 'image') {
                              setUploadedImageUrl(url);
                              setImageAlt(altText || '');
                            }
                          }}
                          currentMediaUrl={uploadedImageUrl}
                          currentMediaType="image"
                          currentAltText={imageAlt}
                        />
                        {uploadedImageUrl && (
                          <Button onClick={insertImage} className="w-full mt-3">
                            Wstaw przesłany obraz
                          </Button>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Video - hide in compact mode */}
            {!compact && (
              <Popover open={showVideoDialog} onOpenChange={setShowVideoDialog}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={btnClass}
                    title="Wstaw wideo"
                  >
                    <Video className={iconClass} />
                  </Button>
                </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Dodaj wideo</Label>
                  
                  <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as 'url' | 'file')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url">Z URL</TabsTrigger>
                      <TabsTrigger value="file">Z urządzenia</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="url" className="space-y-3 mt-3">
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
                        <Button onClick={insertVideo} className="w-full" disabled={!videoUrl}>
                          Wstaw wideo
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="file" className="mt-3">
                      <MediaUpload
                        onMediaUploaded={(url, type, altText) => {
                          if (type === 'video') {
                            setUploadedVideoUrl(url);
                            setVideoTitle(altText || '');
                          }
                        }}
                        currentMediaUrl={uploadedVideoUrl}
                        currentMediaType="video"
                        currentAltText={videoTitle}
                      />
                      {uploadedVideoUrl && (
                        <Button onClick={insertVideo} className="w-full mt-3">
                          Wstaw przesłane wideo
                        </Button>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </PopoverContent>
              </Popover>
            )}

            {!compact && <Separator orientation="vertical" className="h-6 mx-1" />}

            {/* Clear Formatting */}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFormatting}
              className={btnClass}
              title="Usuń formatowanie"
            >
              <RotateCcw className={iconClass} />
            </Button>
          </div>
        </div>

        <TabsContent value="edit" className="m-0 flex-1 flex flex-col min-h-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="border-0 resize-y focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 min-h-[150px] overflow-auto"
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0 flex-1 flex flex-col min-h-0">
          <div 
            ref={previewRef}
            contentEditable
            suppressContentEditableWarning={true}
            onInput={() => {
              isUserTypingRef.current = true;
              handlePreviewChange();
            }}
            onBlur={() => {
              isUserTypingRef.current = false;
              handlePreviewChange();
            }}
            className="p-3 flex-1 min-h-[150px] overflow-auto prose prose-sm max-w-none focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
            style={{ 
              minHeight: `${rows * 1.5}rem`,
              direction: 'ltr',
              textAlign: 'left',
              unicodeBidi: 'normal'
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};