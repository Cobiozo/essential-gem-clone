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
  Video,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Table,
  Minus,
  Star,
  LayoutGrid,
  Plus,
  Undo,
  Redo,
  Globe,
  ChevronDown
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaUpload } from '@/components/MediaUpload';
import { IconPicker } from '@/components/cms/IconPicker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  compact?: boolean;
  // New props for HTML page mode
  mode?: 'simple' | 'advanced' | 'html-page';
  customCss?: string;
  showFullPreview?: boolean;
  showSectionTemplates?: boolean;
  showHistory?: boolean;
  minHeight?: number;
}

// Section templates for HTML pages
const sectionTemplates = {
  hero: {
    label: 'Hero',
    html: `<section style="padding: 80px 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; margin: 24px 0;">
  <h1 style="font-size: 48px; font-weight: 700; color: white; margin-bottom: 16px;">Tytuł Hero</h1>
  <p style="font-size: 20px; color: rgba(255,255,255,0.9); max-width: 600px; margin: 0 auto 32px;">
    Opis sekcji hero z wezwaniem do działania.
  </p>
  <a href="#" style="display: inline-block; padding: 16px 32px; background: white; color: #667eea; font-weight: 600; border-radius: 8px; text-decoration: none;">
    Przycisk CTA
  </a>
</section>`
  },
  cards: {
    label: 'Karty (3 kolumny)',
    html: `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 24px 0;">
  <div style="padding: 24px; background: #f8f9fa; border-radius: 12px; text-align: center;">
    <div style="width: 48px; height: 48px; background: #667eea; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
      <i data-lucide="star" style="color: white; width: 24px; height: 24px;"></i>
    </div>
    <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Karta 1</h3>
    <p style="color: #666;">Opis pierwszej karty z informacjami.</p>
  </div>
  <div style="padding: 24px; background: #f8f9fa; border-radius: 12px; text-align: center;">
    <div style="width: 48px; height: 48px; background: #667eea; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
      <i data-lucide="heart" style="color: white; width: 24px; height: 24px;"></i>
    </div>
    <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Karta 2</h3>
    <p style="color: #666;">Opis drugiej karty z informacjami.</p>
  </div>
  <div style="padding: 24px; background: #f8f9fa; border-radius: 12px; text-align: center;">
    <div style="width: 48px; height: 48px; background: #667eea; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
      <i data-lucide="zap" style="color: white; width: 24px; height: 24px;"></i>
    </div>
    <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Karta 3</h3>
    <p style="color: #666;">Opis trzeciej karty z informacjami.</p>
  </div>
</div>`
  },
  grid2: {
    label: 'Grid 2 kolumny',
    html: `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin: 24px 0;">
  <div style="padding: 24px; background: #f8f9fa; border-radius: 12px;">
    <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Lewa kolumna</h3>
    <p style="color: #666;">Treść lewej kolumny.</p>
  </div>
  <div style="padding: 24px; background: #f8f9fa; border-radius: 12px;">
    <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Prawa kolumna</h3>
    <p style="color: #666;">Treść prawej kolumny.</p>
  </div>
</div>`
  },
  cta: {
    label: 'CTA',
    html: `<section style="padding: 48px; background: #1a1a2e; border-radius: 16px; text-align: center; margin: 24px 0;">
  <h2 style="font-size: 32px; font-weight: 700; color: white; margin-bottom: 16px;">Gotowy, aby zacząć?</h2>
  <p style="font-size: 18px; color: rgba(255,255,255,0.8); margin-bottom: 24px;">Dołącz do tysięcy zadowolonych użytkowników.</p>
  <a href="#" style="display: inline-block; padding: 14px 28px; background: #667eea; color: white; font-weight: 600; border-radius: 8px; text-decoration: none; margin-right: 12px;">
    Rozpocznij teraz
  </a>
  <a href="#" style="display: inline-block; padding: 14px 28px; background: transparent; color: white; font-weight: 600; border-radius: 8px; text-decoration: none; border: 2px solid rgba(255,255,255,0.3);">
    Dowiedz się więcej
  </a>
</section>`
  },
  testimonials: {
    label: 'Opinie',
    html: `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin: 24px 0;">
  <div style="padding: 24px; background: white; border: 1px solid #e5e7eb; border-radius: 12px;">
    <p style="color: #666; font-style: italic; margin-bottom: 16px;">"Świetny produkt! Polecam wszystkim."</p>
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 40px; height: 40px; background: #667eea; border-radius: 50%;"></div>
      <div>
        <p style="font-weight: 600; margin: 0;">Jan Kowalski</p>
        <p style="font-size: 14px; color: #999; margin: 0;">CEO, Firma XYZ</p>
      </div>
    </div>
  </div>
  <div style="padding: 24px; background: white; border: 1px solid #e5e7eb; border-radius: 12px;">
    <p style="color: #666; font-style: italic; margin-bottom: 16px;">"Niesamowita jakość i obsługa klienta."</p>
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 40px; height: 40px; background: #764ba2; border-radius: 50%;"></div>
      <div>
        <p style="font-weight: 600; margin: 0;">Anna Nowak</p>
        <p style="font-size: 14px; color: #999; margin: 0;">Marketing, ABC Corp</p>
      </div>
    </div>
  </div>
</div>`
  },
  pricing: {
    label: 'Cennik',
    html: `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 24px 0;">
  <div style="padding: 32px; background: white; border: 1px solid #e5e7eb; border-radius: 16px; text-align: center;">
    <h3 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Basic</h3>
    <p style="font-size: 48px; font-weight: 700; margin-bottom: 24px;">$9<span style="font-size: 16px; color: #999;">/mies.</span></p>
    <ul style="list-style: none; padding: 0; margin-bottom: 24px; text-align: left;">
      <li style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">✓ Funkcja 1</li>
      <li style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">✓ Funkcja 2</li>
      <li style="padding: 8px 0;">✓ Funkcja 3</li>
    </ul>
    <a href="#" style="display: block; padding: 12px; background: #f0f0f0; color: #333; font-weight: 600; border-radius: 8px; text-decoration: none;">Wybierz</a>
  </div>
  <div style="padding: 32px; background: #667eea; border-radius: 16px; text-align: center; transform: scale(1.05);">
    <h3 style="font-size: 24px; font-weight: 600; margin-bottom: 8px; color: white;">Pro</h3>
    <p style="font-size: 48px; font-weight: 700; margin-bottom: 24px; color: white;">$29<span style="font-size: 16px; color: rgba(255,255,255,0.8);">/mies.</span></p>
    <ul style="list-style: none; padding: 0; margin-bottom: 24px; text-align: left; color: white;">
      <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">✓ Wszystko z Basic</li>
      <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">✓ Funkcja Pro 1</li>
      <li style="padding: 8px 0;">✓ Funkcja Pro 2</li>
    </ul>
    <a href="#" style="display: block; padding: 12px; background: white; color: #667eea; font-weight: 600; border-radius: 8px; text-decoration: none;">Wybierz</a>
  </div>
  <div style="padding: 32px; background: white; border: 1px solid #e5e7eb; border-radius: 16px; text-align: center;">
    <h3 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Enterprise</h3>
    <p style="font-size: 48px; font-weight: 700; margin-bottom: 24px;">$99<span style="font-size: 16px; color: #999;">/mies.</span></p>
    <ul style="list-style: none; padding: 0; margin-bottom: 24px; text-align: left;">
      <li style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">✓ Wszystko z Pro</li>
      <li style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">✓ Dedykowane wsparcie</li>
      <li style="padding: 8px 0;">✓ SLA 99.9%</li>
    </ul>
    <a href="#" style="display: block; padding: 12px; background: #f0f0f0; color: #333; font-weight: 600; border-radius: 8px; text-decoration: none;">Kontakt</a>
  </div>
</div>`
  },
  footer: {
    label: 'Footer',
    html: `<footer style="padding: 48px 24px; background: #1a1a2e; border-radius: 16px; margin: 24px 0;">
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; margin-bottom: 32px;">
    <div>
      <h4 style="font-size: 18px; font-weight: 600; color: white; margin-bottom: 16px;">O nas</h4>
      <p style="color: rgba(255,255,255,0.6); font-size: 14px;">Krótki opis firmy lub projektu.</p>
    </div>
    <div>
      <h4 style="font-size: 18px; font-weight: 600; color: white; margin-bottom: 16px;">Linki</h4>
      <ul style="list-style: none; padding: 0;">
        <li><a href="#" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px;">Strona główna</a></li>
        <li><a href="#" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px;">O nas</a></li>
        <li><a href="#" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px;">Kontakt</a></li>
      </ul>
    </div>
    <div>
      <h4 style="font-size: 18px; font-weight: 600; color: white; margin-bottom: 16px;">Prawne</h4>
      <ul style="list-style: none; padding: 0;">
        <li><a href="#" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px;">Regulamin</a></li>
        <li><a href="#" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px;">Polityka prywatności</a></li>
      </ul>
    </div>
    <div>
      <h4 style="font-size: 18px; font-weight: 600; color: white; margin-bottom: 16px;">Kontakt</h4>
      <p style="color: rgba(255,255,255,0.6); font-size: 14px;">email@example.com</p>
      <p style="color: rgba(255,255,255,0.6); font-size: 14px;">+48 123 456 789</p>
    </div>
  </div>
  <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; text-align: center;">
    <p style="color: rgba(255,255,255,0.4); font-size: 14px;">© 2024 Twoja Firma. Wszelkie prawa zastrzeżone.</p>
  </div>
</footer>`
  },
  gallery: {
    label: 'Galeria',
    html: `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0;">
  <div style="aspect-ratio: 1; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 12px;"></div>
  <div style="aspect-ratio: 1; background: linear-gradient(135deg, #f093fb, #f5576c); border-radius: 12px;"></div>
  <div style="aspect-ratio: 1; background: linear-gradient(135deg, #4facfe, #00f2fe); border-radius: 12px;"></div>
  <div style="aspect-ratio: 1; background: linear-gradient(135deg, #43e97b, #38f9d7); border-radius: 12px;"></div>
</div>`
  },
  faq: {
    label: 'FAQ',
    html: `<div style="max-width: 800px; margin: 24px auto;">
  <h2 style="font-size: 32px; font-weight: 700; text-align: center; margin-bottom: 32px;">Często zadawane pytania</h2>
  <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
      <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Pytanie 1?</h3>
      <p style="color: #666; margin: 0;">Odpowiedź na pierwsze pytanie. Tutaj możesz umieścić szczegółowe wyjaśnienie.</p>
    </div>
    <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
      <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Pytanie 2?</h3>
      <p style="color: #666; margin: 0;">Odpowiedź na drugie pytanie z dodatkowymi informacjami.</p>
    </div>
    <div style="padding: 20px;">
      <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Pytanie 3?</h3>
      <p style="color: #666; margin: 0;">Odpowiedź na trzecie pytanie.</p>
    </div>
  </div>
</div>`
  }
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Wprowadź tekst...",
  rows = 3,
  className = "",
  compact = false,
  mode = 'simple',
  customCss = '',
  showFullPreview = false,
  showSectionTemplates = false,
  showHistory = false,
  minHeight,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fullPreviewRef = useRef<HTMLIFrameElement>(null);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
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
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  
  // History state for undo/redo
  const [history, setHistory] = useState<string[]>([value || '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const maxHistory = 50;
  const lastSavedRef = useRef(value);

  const isHtmlPageMode = mode === 'html-page';
  const isAdvancedMode = mode === 'advanced' || isHtmlPageMode;

  // Save to history when value changes significantly
  useEffect(() => {
    if (showHistory && value !== lastSavedRef.current) {
      const timer = setTimeout(() => {
        setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(value);
          if (newHistory.length > maxHistory) newHistory.shift();
          return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, maxHistory - 1));
        lastSavedRef.current = value;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [value, showHistory, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
      lastSavedRef.current = history[newIndex];
    }
  }, [historyIndex, history, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
      lastSavedRef.current = history[newIndex];
    }
  }, [historyIndex, history, onChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 'b':
            e.preventDefault();
            applyFormatting('bold');
            break;
          case 'i':
            e.preventDefault();
            applyFormatting('italic');
            break;
          case 'u':
            e.preventDefault();
            applyFormatting('underline');
            break;
          case 'k':
            e.preventDefault();
            setShowLinkDialog(true);
            break;
        }
      }
    };

    if (isAdvancedMode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isAdvancedMode, handleUndo, handleRedo]);

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

  const insertAtCursor = useCallback((html: string) => {
    if (activeTab === 'preview' && previewRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const div = document.createElement('div');
        div.innerHTML = html;
        const fragment = document.createDocumentFragment();
        while (div.firstChild) {
          fragment.appendChild(div.firstChild);
        }
        range.insertNode(fragment);
      } else {
        previewRef.current.innerHTML += html;
      }
      onChange(previewRef.current.innerHTML);
    } else {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const beforeText = value.substring(0, start);
      const afterText = value.substring(end);
      
      const newValue = beforeText + html + afterText;
      onChange(newValue);

      setTimeout(() => {
        textarea.setSelectionRange(start + html.length, start + html.length);
        textarea.focus();
      }, 0);
    }
  }, [activeTab, value, onChange]);

  const wrapSelectedText = useCallback((startTag: string, endTag: string = '') => {
    if (activeTab === 'preview') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (selectedText.length === 0) return;

      const wrapper = document.createElement('span');
      wrapper.innerHTML = startTag + selectedText + endTag;
      
      range.deleteContents();
      range.insertNode(wrapper);
      
      if (previewRef.current) {
        onChange(previewRef.current.innerHTML);
      }
      
      selection.removeAllRanges();
      
      return;
    }

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
      
      if (previewRef.current) {
        onChange(previewRef.current.innerHTML);
      }
      return;
    }

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
  }, [wrapSelectedText, activeTab, onChange]);

  const applyHeading = useCallback((level: number) => {
    if (activeTab === 'preview') {
      document.execCommand('formatBlock', false, `h${level}`);
      if (previewRef.current) {
        onChange(previewRef.current.innerHTML);
      }
    } else {
      wrapSelectedText(`<h${level}>`, `</h${level}>`);
    }
  }, [activeTab, wrapSelectedText, onChange]);

  const insertSeparator = useCallback(() => {
    insertAtCursor('<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />');
  }, [insertAtCursor]);

  const insertCodeBlock = useCallback(() => {
    insertAtCursor('<pre style="background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: monospace;"><code>// Twój kod tutaj</code></pre>');
  }, [insertAtCursor]);

  const insertTable = useCallback(() => {
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">';
    tableHtml += '<thead><tr>';
    for (let c = 0; c < tableCols; c++) {
      tableHtml += '<th style="border: 1px solid #ddd; padding: 12px; background: #f5f5f5; text-align: left;">Nagłówek</th>';
    }
    tableHtml += '</tr></thead><tbody>';
    for (let r = 0; r < tableRows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < tableCols; c++) {
        tableHtml += '<td style="border: 1px solid #ddd; padding: 12px;">Komórka</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';
    insertAtCursor(tableHtml);
    setShowTableDialog(false);
    setTableRows(3);
    setTableCols(3);
  }, [insertAtCursor, tableRows, tableCols]);

  const insertIcon = useCallback((iconName: string) => {
    insertAtCursor(`<i data-lucide="${iconName}" style="width: 24px; height: 24px; display: inline-block;"></i>`);
    setShowIconPicker(false);
  }, [insertAtCursor]);

  const insertSectionTemplate = useCallback((templateKey: keyof typeof sectionTemplates) => {
    insertAtCursor(sectionTemplates[templateKey].html);
  }, [insertAtCursor]);

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
      if (node.nodeType === 3) {
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
      setTimeout(() => restoreCursorPosition(cursorPos), 0);
    }
  }, [onChange, saveCursorPosition, restoreCursorPosition]);

  useEffect(() => {
    if (previewRef.current && !isUserTypingRef.current && activeTab === 'preview') {
      const currentHtml = previewRef.current.innerHTML;
      const newHtml = value || `<span class="text-muted-foreground">${placeholder}</span>`;
      
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
    const existingWrapper = img.parentElement;
    if (existingWrapper?.classList.contains('resizable-image-wrapper')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'resizable-image-wrapper';
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      border: 2px dashed transparent;
      transition: border-color 0.2s ease;
    `;

    img.parentNode?.insertBefore(wrapper, img);
    wrapper.appendChild(img);

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

      if (corner.includes('n')) handle.style.top = '-6px';
      if (corner.includes('s')) handle.style.bottom = '-6px';
      if (corner.includes('w')) handle.style.left = '-6px';
      if (corner.includes('e')) handle.style.right = '-6px';

      wrapper.appendChild(handle);
      handles.push(handle);
    });

    const handleMouseEnter = () => {
      wrapper.style.borderColor = '#2563eb';
      handles.forEach(handle => {
        handle.style.opacity = '1';
      });
    };

    const handleMouseLeave = () => {
      wrapper.style.borderColor = 'transparent';
      handles.forEach(handle => {
        handle.style.opacity = '0';
      });
    };

    wrapper.addEventListener('mouseenter', handleMouseEnter);
    wrapper.addEventListener('mouseleave', handleMouseLeave);

    const mousedownHandlers: ((e: MouseEvent) => void)[] = [];

    handles.forEach((handle, index) => {
      const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = img.offsetWidth;
        const startHeight = img.offsetHeight;
        const aspectRatio = startWidth / startHeight;

        const corner = corners[index];
        
        const handleMouseMove = (moveE: MouseEvent) => {
          let deltaX = moveE.clientX - startX;
          let deltaY = moveE.clientY - startY;

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

          const widthChange = Math.abs(newWidth - startWidth);
          const heightChange = Math.abs(newHeight - startHeight);

          if (widthChange > heightChange) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }

          newWidth = Math.max(50, newWidth);
          newHeight = Math.max(50, newHeight);

          img.style.width = `${newWidth}px`;
          img.style.height = `${newHeight}px`;
          img.style.maxWidth = 'none';

          img.setAttribute('width', newWidth.toString());
          img.setAttribute('height', newHeight.toString());
        };

        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          
          if (previewRef.current) {
            onChange(previewRef.current.innerHTML);
          }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      };

      handle.addEventListener('mousedown', handleMouseDown);
      mousedownHandlers.push(handleMouseDown);
    });

    const cleanup = () => {
      wrapper.removeEventListener('mouseenter', handleMouseEnter);
      wrapper.removeEventListener('mouseleave', handleMouseLeave);
      handles.forEach((handle, i) => {
        handle.removeEventListener('mousedown', mousedownHandlers[i]);
      });
    };
    
    cleanupFunctionsRef.current.push(cleanup);
  }, [onChange]);

  useEffect(() => {
    if (activeTab === 'preview' && previewRef.current) {
      cleanupFunctionsRef.current.forEach(fn => fn());
      cleanupFunctionsRef.current = [];

      const images = previewRef.current.querySelectorAll('img');
      images.forEach((img) => {
        if (!img.parentElement?.classList.contains('resizable-image-wrapper')) {
          makeImageResizable(img as HTMLImageElement);
        }
      });

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

      return () => {
        cleanupFunctionsRef.current.forEach(fn => fn());
        cleanupFunctionsRef.current = [];
        observer.disconnect();
      };
    }
  }, [activeTab, makeImageResizable]);

  const btnClass = compact ? "h-6 w-6 p-0" : "h-8 w-8 p-0";
  const iconClass = compact ? "h-3 w-3" : "h-4 w-4";

  const tabsToShow = isHtmlPageMode && showFullPreview 
    ? ['edit', 'preview', 'fullPreview'] 
    : ['edit', 'preview'];

  return (
    <div className={`border rounded-md flex flex-col ${compact ? 'w-full max-w-full overflow-hidden' : 'h-full'} ${className}`} style={minHeight ? { minHeight: `${minHeight}px` } : undefined}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
        <div className="flex flex-col border-b bg-muted/20 shrink-0">
          {/* Tab Triggers */}
          <div className="flex items-center justify-between p-1.5 border-b">
            <TabsList className={`grid ${isHtmlPageMode && showFullPreview ? 'w-64 grid-cols-3' : compact ? 'w-32 grid-cols-2' : 'w-44 grid-cols-2'} shrink-0`}>
              <TabsTrigger value="edit" className="text-xs">
                <Code className="h-3 w-3 mr-1" />
                {compact ? 'HTML' : 'Kod'}
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                {compact ? 'Edytor' : 'Edytor'}
              </TabsTrigger>
              {isHtmlPageMode && showFullPreview && (
                <TabsTrigger value="fullPreview" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  Podgląd
                </TabsTrigger>
              )}
            </TabsList>

            {/* Undo/Redo for advanced mode */}
            {showHistory && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className={btnClass}
                  title="Cofnij (Ctrl+Z)"
                >
                  <Undo className={iconClass} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className={btnClass}
                  title="Ponów (Ctrl+Y)"
                >
                  <Redo className={iconClass} />
                </Button>
                <span className="text-xs text-muted-foreground ml-2">
                  {historyIndex + 1}/{history.length}
                </span>
              </div>
            )}
          </div>
          
          {/* Toolbar */}
          <div className={`flex items-center gap-0.5 p-1.5 ${compact ? 'flex-wrap' : 'overflow-x-auto'}`}>
            {/* Font Controls */}
            <Select onValueChange={applyFontFamily}>
              <SelectTrigger className={compact ? "w-24 h-6 text-[10px]" : "w-32 h-8 text-xs"}>
                <SelectValue placeholder="Czcionka" />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map((font) => (
                  <SelectItem key={font.value} value={font.value} className={compact ? "text-[10px]" : "text-xs"}>
                    <span style={{ fontFamily: font.value }}>{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={applyFontSize}>
              <SelectTrigger className={compact ? "w-14 h-6 text-[10px]" : "w-16 h-8 text-xs"}>
                <SelectValue placeholder="Rozmiar" />
              </SelectTrigger>
              <SelectContent>
                {fontSizes.map((size) => (
                  <SelectItem key={size} value={size} className={compact ? "text-[10px]" : "text-xs"}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!compact && <Separator orientation="vertical" className="h-6 mx-1" />}

            {/* Headings for advanced mode */}
            {isAdvancedMode && !compact && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2" title="Nagłówki">
                      <Type className="h-4 w-4 mr-1" />
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => applyHeading(1)}>
                      <Heading1 className="h-4 w-4 mr-2" />
                      Nagłówek H1
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => applyHeading(2)}>
                      <Heading2 className="h-4 w-4 mr-2" />
                      Nagłówek H2
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => applyHeading(3)}>
                      <Heading3 className="h-4 w-4 mr-2" />
                      Nagłówek H3
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => applyHeading(4)}>
                      <Heading4 className="h-4 w-4 mr-2" />
                      Nagłówek H4
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Separator orientation="vertical" className="h-6 mx-1" />
              </>
            )}

            {/* Basic Formatting */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('bold')}
              className={btnClass}
              title="Pogrubienie (Ctrl+B)"
            >
              <Bold className={iconClass} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('italic')}
              className={btnClass}
              title="Kursywa (Ctrl+I)"
            >
              <Italic className={iconClass} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('underline')}
              className={btnClass}
              title="Podkreślenie (Ctrl+U)"
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
                    title="Kolor tła"
                  >
                    <Highlighter className={iconClass} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Kolor tła</Label>
                    <div className="grid grid-cols-8 gap-1">
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

            {/* Media & Insert */}
            <Popover open={showLinkDialog} onOpenChange={setShowLinkDialog}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={btnClass}
                  title="Wstaw link (Ctrl+K)"
                >
                  <Link className={iconClass} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Wstaw link</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="URL"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                    <Input
                      placeholder="Tekst linku"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                    />
                    <Button size="sm" className="w-full" onClick={insertLink}>
                      Wstaw
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={showImageDialog} onOpenChange={setShowImageDialog}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={btnClass}
                  title="Wstaw obrazek"
                >
                  <Image className={iconClass} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Wstaw obrazek</Label>
                  <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'url' | 'file')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url">URL</TabsTrigger>
                      <TabsTrigger value="file">Upload</TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="space-y-2">
                      <Input
                        placeholder="URL obrazka"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                    </TabsContent>
                    <TabsContent value="file" className="space-y-2">
                      <MediaUpload
                        onMediaUploaded={(url) => setUploadedImageUrl(url)}
                        allowedTypes={['image']}
                        compact
                      />
                    </TabsContent>
                  </Tabs>
                  <Input
                    placeholder="Tekst alternatywny (alt)"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                  />
                  <Button size="sm" className="w-full" onClick={insertImage}>
                    Wstaw
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

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
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Wstaw wideo</Label>
                  <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'url' | 'file')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url">URL / Embed</TabsTrigger>
                      <TabsTrigger value="file">Upload</TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="space-y-2">
                      <Input
                        placeholder="URL (YouTube, Vimeo lub MP4)"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                      />
                    </TabsContent>
                    <TabsContent value="file" className="space-y-2">
                      <MediaUpload
                        onMediaUploaded={(url) => setUploadedVideoUrl(url)}
                        allowedTypes={['video']}
                        compact
                      />
                    </TabsContent>
                  </Tabs>
                  <Input
                    placeholder="Tytuł wideo"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                  />
                  <Button size="sm" className="w-full" onClick={insertVideo}>
                    Wstaw
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Advanced insert options for HTML page mode */}
            {isAdvancedMode && !compact && (
              <>
                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Table */}
                <Popover open={showTableDialog} onOpenChange={setShowTableDialog}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={btnClass}
                      title="Wstaw tabelę"
                    >
                      <Table className={iconClass} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Wstaw tabelę</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Kolumny</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={tableCols}
                            onChange={(e) => setTableCols(parseInt(e.target.value) || 3)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Wiersze</Label>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={tableRows}
                            onChange={(e) => setTableRows(parseInt(e.target.value) || 3)}
                          />
                        </div>
                      </div>
                      <Button size="sm" className="w-full" onClick={insertTable}>
                        Wstaw tabelę
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Separator */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={insertSeparator}
                  className={btnClass}
                  title="Wstaw separator"
                >
                  <Minus className={iconClass} />
                </Button>

                {/* Code block */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={insertCodeBlock}
                  className={btnClass}
                  title="Blok kodu"
                >
                  <Code className={iconClass} />
                </Button>

                {/* Icon picker */}
                <Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={btnClass}
                      title="Wstaw ikonę"
                    >
                      <Star className={iconClass} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0">
                    <IconPicker
                      value=""
                      onChange={(iconName) => {
                        if (iconName) insertIcon(iconName);
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {/* Section templates dropdown */}
                {showSectionTemplates && (
                  <>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2" title="Wstaw sekcję">
                          <LayoutGrid className="h-4 w-4 mr-1" />
                          <Plus className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48">
                        <DropdownMenuItem onClick={() => insertSectionTemplate('hero')}>
                          Hero
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertSectionTemplate('cards')}>
                          Karty (3 kolumny)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertSectionTemplate('grid2')}>
                          Grid 2 kolumny
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => insertSectionTemplate('cta')}>
                          CTA
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertSectionTemplate('testimonials')}>
                          Opinie
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertSectionTemplate('pricing')}>
                          Cennik
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => insertSectionTemplate('gallery')}>
                          Galeria
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertSectionTemplate('faq')}>
                          FAQ
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertSectionTemplate('footer')}>
                          Footer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </>
            )}

            {!compact && <Separator orientation="vertical" className="h-6 mx-1" />}

            {/* Clear formatting */}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFormatting}
              className={btnClass}
              title="Wyczyść formatowanie"
            >
              <RotateCcw className={iconClass} />
            </Button>
          </div>
        </div>

        {/* Content areas */}
        <TabsContent value="edit" className={`m-0 flex-1 ${compact ? '' : 'p-2'}`}>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={`resize-none ${compact ? 'min-h-[60px] text-xs' : 'h-full min-h-[100px]'} font-mono text-sm`}
            style={minHeight ? { minHeight: `${minHeight - 120}px` } : undefined}
          />
        </TabsContent>

        <TabsContent value="preview" className={`m-0 flex-1 overflow-auto ${compact ? '' : 'p-2'}`}>
          <div
            ref={previewRef}
            contentEditable
            suppressContentEditableWarning
            className={`${compact ? 'p-2 text-sm min-h-[60px]' : 'p-3 min-h-[100px]'} outline-none prose dark:prose-invert max-w-none`}
            style={minHeight ? { minHeight: `${minHeight - 120}px` } : undefined}
            onInput={handlePreviewChange}
            onKeyDown={() => { isUserTypingRef.current = true; }}
            onKeyUp={() => { setTimeout(() => { isUserTypingRef.current = false; }, 100); }}
            dangerouslySetInnerHTML={{ __html: value || `<span class="text-muted-foreground">${placeholder}</span>` }}
          />
        </TabsContent>

        {isHtmlPageMode && showFullPreview && (
          <TabsContent value="fullPreview" className="m-0 flex-1 p-2">
            <div className="border rounded-lg overflow-hidden bg-white h-full">
              <div className="bg-muted/30 p-2 border-b text-xs text-muted-foreground flex items-center gap-2">
                <Globe className="w-3 h-3" />
                Pełny podgląd strony
              </div>
              <iframe
                ref={fullPreviewRef}
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script src="https://unpkg.com/lucide@latest"></script>
                    <style>
                      body { margin: 0; padding: 24px; font-family: system-ui, sans-serif; }
                      ${customCss || ''}
                    </style>
                  </head>
                  <body>
                    ${value || '<p style="color: #999;">Brak zawartości do wyświetlenia</p>'}
                    <script>lucide.createIcons();</script>
                  </body>
                  </html>
                `}
                className="w-full border-0"
                style={{ height: minHeight ? `${minHeight - 80}px` : '500px' }}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
