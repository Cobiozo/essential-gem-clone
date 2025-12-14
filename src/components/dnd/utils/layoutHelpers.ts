import { CMSSection, CMSItem } from '@/types/cms';

interface Column {
  id: string;
  items: CMSItem[];
  width?: number;
}

// Development logging - only in dev mode
const isDev = import.meta.env.DEV;
export const log = isDev ? console.log : () => {};
export const warn = isDev ? console.warn : () => {};
export const error = console.error; // Always log errors

// Create default content based on element type
export const createDefaultContent = (elementType: string): any[] => {
  log('[createDefaultContent] Creating content for type:', elementType);
  
  switch (elementType) {
    case 'heading':
      return [{ type: 'h2', content: 'Nowy nagłówek', level: 2 }];
    case 'text':
      return [{ type: 'paragraph', content: 'Nowy tekst' }];
    case 'image':
      return [{ type: 'img', content: '', alt: 'Obrazek' }];
    case 'video':
      return [{ type: 'video_embed', content: '', title: 'Film' }];
    case 'button':
      return [{ type: 'btn', content: 'Kliknij', url: '#' }];
    case 'divider':
      return [{ type: 'hr' }];
    case 'spacer':
      return [{ type: 'space', height: 40 }];
    case 'maps':
      return [{ type: 'google_maps', content: '', title: 'Mapa' }];
    case 'icon':
      return [{ type: 'lucide_icon', content: 'Star' }];
    case 'info_text':
      return [{ type: 'info_text', content: 'Nowy tekst informacyjny' }];
    case 'image-field':
      return [{ type: 'image-field', content: '', alt: 'Dodaj obrazek' }];
    case 'icon-field':
      return [{ type: 'icon-field', content: 'Star', color: 'currentColor' }];
    case 'carousel':
      return [{ type: 'carousel', images: [], autoplay: true, interval: 3000 }];
    case 'accessibility':
      return [{ type: 'accessibility', content: 'Informacje o dostępności' }];
    case 'gallery':
      return [{ type: 'gallery', images: [], columns: 3 }];
    case 'icon-list':
      return [{ type: 'icon-list', items: [{ icon: 'Check', text: 'Element listy' }] }];
    case 'counter':
      return [{ type: 'counter', start: 0, end: 100, duration: 2000, suffix: '', prefix: '' }];
    case 'progress-bar':
      return [{ type: 'progress-bar', value: 50, max: 100, label: 'Postęp', showValue: true }];
    case 'testimonial':
      return [{ type: 'testimonial', content: 'Treść referencji', author: 'Imię Nazwisko', role: 'Stanowisko', avatar: '' }];
    case 'cards':
      return [{ type: 'cards', items: [{ title: 'Karta', content: 'Treść karty' }] }];
    case 'accordion':
      return [{ type: 'accordion', items: [{ title: 'Pytanie', content: 'Odpowiedź' }] }];
    case 'toggle':
      return [{ type: 'toggle', title: 'Kliknij aby rozwinąć', content: 'Zawartość' }];
    case 'social-icons':
      return [{ type: 'social-icons', icons: [{ platform: 'Facebook', url: 'https://facebook.com' }], size: 24 }];
    case 'alert':
      return [{ type: 'alert', content: 'Wiadomość', variant: 'default', title: '' }];
    case 'soundcloud':
      return [{ type: 'soundcloud', url: '', height: 166 }];
    case 'shortcode':
      return [{ type: 'shortcode', content: '[shortcode]' }];
    case 'html':
      return [{ type: 'html', content: '<div>Twój kod HTML</div>' }];
    case 'menu-anchor':
      return [{ type: 'menu-anchor', id: 'anchor', label: 'Kotwica' }];
    case 'sidebar':
      return [{ type: 'sidebar', content: 'Zawartość panelu bocznego', position: 'right' }];
    case 'learn-more':
      return [{ type: 'learn-more', title: 'Dowiedz się więcej', content: 'Treść', url: '#' }];
    case 'rating':
      return [{ type: 'rating', value: 5, max: 5, label: 'Ocena' }];
    case 'trustindex':
      return [{ type: 'trustindex', widgetId: '', platform: 'google' }];
    case 'ppom':
      return [{ type: 'ppom', productId: '' }];
    case 'text-path':
      return [{ type: 'text-path', text: 'Tekst na ścieżce', path: 'M0,50 Q50,0 100,50' }];
    case 'multi_cell':
      return [
        { id: `cell-${Date.now()}-header`, type: 'header', content: 'Nagłówek sekcji', position: 0, is_active: true },
        { id: `cell-${Date.now()}-desc`, type: 'description', content: 'Opis sekcji...', position: 1, is_active: true }
      ];
    case 'file-download':
      return [{ type: 'file-download', content: 'Pobierz plik', url: '' }];
    default:
      warn('[createDefaultContent] Unknown element type:', elementType);
      return [{ type: 'text', content: `Element typu: ${elementType}` }];
  }
};

// Get human-readable element type name
export const getElementTypeName = (elementType: string): string => {
  const names: { [key: string]: string } = {
    heading: 'Nagłówek',
    text: 'Tekst',
    image: 'Obrazek',
    video: 'Film',
    button: 'Przycisk',
    info_text: 'Tekst informacyjny',
    divider: 'Rozdzielacz',
    spacer: 'Odstęp',
    maps: 'Mapa',
    icon: 'Ikonka',
    container: 'Kontener',
    grid: 'Siatka',
    'pure-life-container': 'Pure Life',
    'collapsible-section': 'Sekcja zwijana',
    'image-field': 'Pole obrazka',
    'icon-field': 'Pole ikonki',
    carousel: 'Karuzela obrazków',
    accessibility: 'Dostępność A11y',
    gallery: 'Galeria podstawowa',
    'icon-list': 'Lista ikonki',
    counter: 'Licznik',
    'progress-bar': 'Pasek postępu',
    testimonial: 'Referencja',
    cards: 'Karty',
    accordion: 'Akordeon',
    toggle: 'Przełącznik',
    'social-icons': 'Ikonki społecznościowe',
    alert: 'Ostrzeżenie',
    soundcloud: 'SoundCloud',
    shortcode: 'Krótki kod',
    html: 'HTML',
    'menu-anchor': 'Kotwica menu',
    sidebar: 'Panel boczny',
    'learn-more': 'Dowiedz się więcej',
    rating: 'Ocena',
    trustindex: 'Google Recenzje',
    ppom: 'PPOM Shortcode',
    'text-path': 'Ścieżka tekstowa',
    'multi_cell': 'Wiele komórek',
    'file-download': 'Przycisk pobierania',
  };
  return names[elementType] || 'Element';
};

// Initialize columns for sections
export const initializeSectionColumns = (
  sections: CMSSection[], 
  items: CMSItem[]
): { [sectionId: string]: Column[] } => {
  const columnData: { [sectionId: string]: Column[] } = {};
  
  sections.forEach(section => {
    const sectionItems = items.filter(item => item.section_id === section.id);
    
    const savedColumnCount = section.style_class?.match(/columns-(\d+)/)?.[1];
    const derivedFromItems = sectionItems.reduce((max, it: any) => {
      const ci = typeof it.column_index === 'number' ? it.column_index : 0;
      return Math.max(max, ci);
    }, 0) + 1;
    const columnCount = savedColumnCount ? parseInt(savedColumnCount, 10) : Math.max(1, derivedFromItems);
    
    const columns: Column[] = Array.from({ length: Math.max(1, columnCount) }, (_, i) => ({
      id: `${section.id}-col-${i}`,
      items: [],
      width: 100 / Math.max(1, columnCount),
    }));
    
    sectionItems.forEach((it: any) => {
      const idx = Math.min(columns.length - 1, Math.max(0, typeof it.column_index === 'number' ? it.column_index : 0));
      columns[idx].items.push(it);
    });
    
    columnData[section.id] = columns;
  });
  
  return columnData;
};

// Layout elements that should create sections
export const LAYOUT_ELEMENTS = ['container', 'grid', 'pure-life-container', 'collapsible-section'];

// Check if element type is a layout element
export const isLayoutElement = (elementType: string): boolean => {
  return LAYOUT_ELEMENTS.includes(elementType);
};

// Get element icon component name
export const getElementIconName = (elementType: string): string => {
  const icons: { [key: string]: string } = {
    heading: 'Type',
    text: 'AlignLeft',
    image: 'Image',
    video: 'Video',
    button: 'MousePointer2',
    divider: 'Minus',
    spacer: 'AlignLeft',
    maps: 'MapPin',
    icon: 'Star',
    container: 'Box',
    grid: 'Grid3X3',
    'pure-life-container': 'Grid3X3',
    'collapsible-section': 'ChevronDown',
    'image-field': 'ImagePlus',
    'icon-field': 'Smile',
    carousel: 'Images',
    accessibility: 'Accessibility',
    gallery: 'LayoutGrid',
    'icon-list': 'List',
    counter: 'Hash',
    'progress-bar': 'BarChart3',
    testimonial: 'MessageSquare',
    cards: 'CreditCard',
    accordion: 'ChevronDown',
    toggle: 'ToggleLeft',
    'social-icons': 'Share2',
    alert: 'AlertCircle',
    soundcloud: 'Music',
    shortcode: 'Code2',
    html: 'Code',
    'menu-anchor': 'Anchor',
    sidebar: 'PanelLeft',
    'learn-more': 'Info',
    rating: 'StarHalf',
    trustindex: 'ThumbsUp',
    ppom: 'FileCode',
    'text-path': 'Spline',
    info_text: 'Info',
  };
  return icons[elementType] || 'Box';
};
