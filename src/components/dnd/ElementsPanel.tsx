import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ItemEditorWrapper } from '@/components/cms/ItemEditorWrapper';
import { SectionEditor } from '@/components/cms/SectionEditor';
import { ElementPreview } from './ElementPreview';
import {
  Search,
  Type, 
  Image as ImageIcon, 
  Video, 
  MousePointer2, 
  Minus, 
  AlignLeft,
  Box,
  Grid3X3,
  Star,
  MapPin,
  ImagePlus,
  Smile,
  Images,
  Accessibility,
  LayoutGrid,
  List,
  Hash,
  BarChart3,
  MessageSquare,
  CreditCard,
  ChevronDown,
  ToggleLeft,
  Share2,
  AlertCircle,
  Music,
  Code2,
  Code,
  Anchor,
  PanelLeft,
  Info,
  StarHalf,
  ThumbsUp,
  FileCode,
  Spline,
  Clock,
  X,
  FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';

interface ElementItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  type: string;
  description?: string;
  tags?: string[];
}

interface ElementCategory {
  id: string;
  title: string;
  items: ElementItem[];
  defaultOpen?: boolean;
}

interface ElementsPanelProps {
  className?: string;
  onElementClick?: (elementType: string) => void;
  panelMode?: 'elements' | 'properties';
  onPanelModeChange?: (mode: 'elements' | 'properties') => void;
  editingItemId?: string | null;
  editingItem?: any;
  isItemEditorOpen?: boolean;
  onSaveItem?: (updatedItem: Partial<any>) => Promise<void>;
  onCancelEdit?: () => void;
  editingSectionId?: string | null;
  editingSection?: any;
  isSectionEditorOpen?: boolean;
  onSaveSection?: (updatedSection: Partial<any>) => Promise<void>;
  onCancelSectionEdit?: () => void;
  recentlyUsed?: string[];
}

// Recently used elements storage key
const RECENTLY_USED_KEY = 'layout-editor-recently-used';

export const ElementsPanel: React.FC<ElementsPanelProps> = ({ 
  className,
  onElementClick,
  panelMode = 'elements',
  onPanelModeChange,
  editingItemId,
  editingItem,
  isItemEditorOpen,
  onSaveItem,
  onCancelEdit,
  editingSectionId,
  editingSection,
  isSectionEditorOpen,
  onSaveSection,
  onCancelSectionEdit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['recently-used', 'layout', 'basic']);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENTLY_USED_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const layoutElements: ElementCategory = {
    id: 'layout',
    title: 'Układ',
    defaultOpen: true,
    items: [
      { id: 'container', title: 'Kontener', icon: <Box className="w-5 h-5" />, type: 'container', description: 'Prosty kontener na elementy', tags: ['layout', 'box'] },
      { id: 'grid', title: 'Siatka', icon: <Grid3X3 className="w-5 h-5" />, type: 'grid', description: 'Siatka z wieloma kolumnami', tags: ['layout', 'columns', 'grid'] },
      { id: 'pure-life-container', title: 'Pure Life', icon: <Grid3X3 className="w-5 h-5 text-blue-500" />, type: 'pure-life-container', description: 'Kontener w stylu Pure Life', tags: ['layout', 'branded'] },
    ]
  };

  const basicElements: ElementCategory = {
    id: 'basic',
    title: 'Podstawowe',
    items: [
      { id: 'heading', title: 'Nagłówek', icon: <Type className="w-5 h-5" />, type: 'heading', description: 'Nagłówek H1-H6', tags: ['text', 'title'] },
      { id: 'image', title: 'Obrazek', icon: <ImageIcon className="w-5 h-5" />, type: 'image', description: 'Obraz z alternatywnym tekstem', tags: ['media', 'photo'] },
      { id: 'text', title: 'Edytor tekstu', icon: <AlignLeft className="w-5 h-5" />, type: 'text', description: 'Tekst z formatowaniem', tags: ['text', 'paragraph'] },
      { id: 'video', title: 'Film', icon: <Video className="w-5 h-5" />, type: 'video', description: 'Wideo YouTube lub lokalne', tags: ['media', 'embed'] },
      { id: 'button', title: 'Przycisk', icon: <MousePointer2 className="w-5 h-5" />, type: 'button', description: 'Przycisk z linkiem', tags: ['cta', 'link'] },
      { id: 'file-download', title: 'Pobierz plik', icon: <FileDown className="w-5 h-5" />, type: 'file-download', description: 'Przycisk pobierania pliku', tags: ['download', 'file', 'pdf'] },
      { id: 'info-text', title: 'Tekst informacyjny', icon: <Info className="w-5 h-5" />, type: 'info_text', description: 'Ikona z tekstem', tags: ['icon', 'text'] },
      { id: 'divider', title: 'Rozdzielacz', icon: <Minus className="w-5 h-5" />, type: 'divider', description: 'Linia pozioma', tags: ['separator', 'line'] },
      { id: 'spacer', title: 'Odstęp', icon: <AlignLeft className="w-5 h-5 rotate-90" />, type: 'spacer', description: 'Pusta przestrzeń', tags: ['space', 'margin'] },
      { id: 'maps', title: 'Mapy Google', icon: <MapPin className="w-5 h-5" />, type: 'maps', description: 'Interaktywna mapa', tags: ['location', 'embed'] },
      { id: 'icon', title: 'Ikonka', icon: <Star className="w-5 h-5" />, type: 'icon', description: 'Ikona Lucide', tags: ['icon', 'symbol'] },
    ]
  };

  const generalElements: ElementCategory = {
    id: 'general',
    title: 'Ogólne',
    items: [
      { id: 'image-field', title: 'Pole obrazka', icon: <ImagePlus className="w-5 h-5" />, type: 'image-field', description: 'Pole do wgrania obrazka', tags: ['media', 'upload'] },
      { id: 'icon-field', title: 'Pole ikonki', icon: <Smile className="w-5 h-5" />, type: 'icon-field', description: 'Pole z wyborem ikony', tags: ['icon', 'picker'] },
      { id: 'carousel', title: 'Karuzela', icon: <Images className="w-5 h-5" />, type: 'carousel', description: 'Slider obrazków', tags: ['gallery', 'slider'] },
      { id: 'accessibility', title: 'Dostępność A11y', icon: <Accessibility className="w-5 h-5" />, type: 'accessibility', description: 'Informacje o dostępności', tags: ['a11y', 'aria'] },
      { id: 'gallery', title: 'Galeria', icon: <LayoutGrid className="w-5 h-5" />, type: 'gallery', description: 'Siatka obrazków', tags: ['images', 'grid'] },
      { id: 'icon-list', title: 'Lista ikonki', icon: <List className="w-5 h-5" />, type: 'icon-list', description: 'Lista z ikonami', tags: ['list', 'bullets'] },
      { id: 'counter', title: 'Licznik', icon: <Hash className="w-5 h-5" />, type: 'counter', description: 'Animowany licznik', tags: ['animation', 'stats'] },
      { id: 'progress-bar', title: 'Pasek postępu', icon: <BarChart3 className="w-5 h-5" />, type: 'progress-bar', description: 'Pasek postępu', tags: ['progress', 'bar'] },
      { id: 'testimonial', title: 'Referencja', icon: <MessageSquare className="w-5 h-5" />, type: 'testimonial', description: 'Cytat z autorem', tags: ['quote', 'review'] },
      { id: 'cards', title: 'Karty', icon: <CreditCard className="w-5 h-5" />, type: 'cards', description: 'Karty z treścią', tags: ['card', 'content'] },
      { id: 'accordion', title: 'Akordeon', icon: <ChevronDown className="w-5 h-5" />, type: 'accordion', description: 'Rozwijane sekcje', tags: ['faq', 'collapse'] },
      { id: 'toggle', title: 'Przełącznik', icon: <ToggleLeft className="w-5 h-5" />, type: 'toggle', description: 'Rozwijany element', tags: ['switch', 'expand'] },
      { id: 'social-icons', title: 'Social Icons', icon: <Share2 className="w-5 h-5" />, type: 'social-icons', description: 'Ikonki społecznościowe', tags: ['social', 'links'] },
      { id: 'alert', title: 'Ostrzeżenie', icon: <AlertCircle className="w-5 h-5" />, type: 'alert', description: 'Komunikat ostrzegawczy', tags: ['notice', 'warning'] },
      { id: 'soundcloud', title: 'SoundCloud', icon: <Music className="w-5 h-5" />, type: 'soundcloud', description: 'Odtwarzacz audio', tags: ['audio', 'embed'] },
      { id: 'shortcode', title: 'Krótki kod', icon: <Code2 className="w-5 h-5" />, type: 'shortcode', description: 'Shortcode', tags: ['code', 'embed'] },
      { id: 'html', title: 'HTML', icon: <Code className="w-5 h-5" />, type: 'html', description: 'Własny kod HTML', tags: ['code', 'custom'] },
      { id: 'menu-anchor', title: 'Kotwica menu', icon: <Anchor className="w-5 h-5" />, type: 'menu-anchor', description: 'Kotwica nawigacji', tags: ['anchor', 'navigation'] },
      { id: 'sidebar', title: 'Panel boczny', icon: <PanelLeft className="w-5 h-5" />, type: 'sidebar', description: 'Boczny panel', tags: ['sidebar', 'layout'] },
      { id: 'learn-more', title: 'Dowiedz się więcej', icon: <Info className="w-5 h-5" />, type: 'learn-more', description: 'Rozwijana sekcja', tags: ['expand', 'info'] },
      { id: 'rating', title: 'Ocena', icon: <StarHalf className="w-5 h-5" />, type: 'rating', description: 'Ocena gwiazdkowa', tags: ['stars', 'rating'] },
      { id: 'trustindex', title: 'Google Recenzje', icon: <ThumbsUp className="w-5 h-5" />, type: 'trustindex', description: 'Widget recenzji', tags: ['reviews', 'embed'] },
      { id: 'ppom', title: 'PPOM Shortcode', icon: <FileCode className="w-5 h-5" />, type: 'ppom', description: 'PPOM produkt', tags: ['product', 'woo'] },
      { id: 'text-path', title: 'Ścieżka tekstowa', icon: <Spline className="w-5 h-5" />, type: 'text-path', description: 'Tekst na krzywej SVG', tags: ['svg', 'animation'] },
    ]
  };

  const allCategories = [layoutElements, basicElements, generalElements];
  const allItems = allCategories.flatMap(c => c.items);

  // Create recently used category
  const recentlyUsedCategory: ElementCategory | null = useMemo(() => {
    if (recentlyUsed.length === 0) return null;
    const items = recentlyUsed
      .map(type => allItems.find(i => i.type === type))
      .filter((item): item is ElementItem => item !== undefined)
      .slice(0, 6);
    
    if (items.length === 0) return null;
    
    return {
      id: 'recently-used',
      title: 'Ostatnio używane',
      defaultOpen: true,
      items,
    };
  }, [recentlyUsed, allItems]);

  const filteredCategories = useMemo(() => {
    const categories = recentlyUsedCategory 
      ? [recentlyUsedCategory, ...allCategories] 
      : allCategories;

    if (!searchQuery) return categories;

    return categories.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    })).filter(category => category.items.length > 0);
  }, [searchQuery, recentlyUsedCategory, allCategories]);

  const handleElementDrag = (elementType: string) => {
    // Update recently used
    setRecentlyUsed(prev => {
      const newRecent = [elementType, ...prev.filter(t => t !== elementType)].slice(0, 10);
      localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(newRecent));
      return newRecent;
    });
  };

  return (
    <Card className={cn("w-80 h-screen border-r rounded-none flex flex-col", className)}>
      <CardContent className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b shrink-0 bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center gap-2 mb-2">
            {panelMode === 'properties' && onPanelModeChange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPanelModeChange('elements')}
                className="px-2 hover:bg-background"
              >
                ← Powrót
              </Button>
            )}
            <h2 className="text-lg font-bold text-center flex-1">
              {panelMode === 'elements' ? 'Elementy' : 'Właściwości'}
            </h2>
          </div>
        </div>
        
        {panelMode === 'elements' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="widgets" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2 mx-4 mt-2 shrink-0">
                <TabsTrigger value="widgets" className="text-sm">Widżety</TabsTrigger>
                <TabsTrigger value="global" className="text-sm">Globalne</TabsTrigger>
              </TabsList>

              {/* Search */}
              <div className="relative px-4 py-3 shrink-0">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj widżetu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 bg-muted/50 border-0 focus-visible:ring-1"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <TabsContent value="widgets" className="flex-1 overflow-auto m-0">
                <div className="space-y-1 p-3">
                  {filteredCategories.map((category) => (
                    <CollapsibleSection
                      key={category.id}
                      title={`${category.title} (${category.items.length})`}
                      isOpen={expandedCategories.includes(category.id)}
                      onOpenChange={(open) => {
                        if (open) {
                          setExpandedCategories([...expandedCategories, category.id]);
                        } else {
                          setExpandedCategories(expandedCategories.filter(id => id !== category.id));
                        }
                      }}
                      className="mb-1"
                    >
                      <div className="grid grid-cols-2 gap-2 mt-2 pb-2">
                        {category.items.map((item) => (
                          <DraggableElement
                            key={`${category.id}-${item.id}`}
                            id={`new-${item.type}`}
                            elementType={item.type}
                            icon={item.icon}
                            title={item.title}
                            description={item.description}
                            onDragStart={() => handleElementDrag(item.type)}
                          />
                        ))}
                      </div>
                    </CollapsibleSection>
                  ))}
                  
                  {filteredCategories.length === 0 && searchQuery && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Brak wyników dla "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="global" className="mt-4">
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Globalne elementy będą dostępne wkrótce
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {editingSection && onSaveSection && onCancelSectionEdit ? (
              <SectionEditor
                key={editingSectionId}
                section={editingSection}
                onSave={onSaveSection}
                onCancel={onCancelSectionEdit}
              />
            ) : editingItem && onSaveItem && onCancelEdit ? (
              <ItemEditorWrapper
                key={editingItemId}
                item={editingItem}
                sectionId={editingItem.section_id || ''}
                onSave={onSaveItem}
                onCancel={onCancelEdit}
              />
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                Wybierz element do edycji
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Draggable element component with preview on hover
interface DraggableElementProps {
  id: string;
  elementType: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  onDragStart?: () => void;
}

const DraggableElement: React.FC<DraggableElementProps> = ({ 
  id, 
  elementType, 
  icon, 
  title, 
  description,
  onDragStart 
}) => {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id,
    data: {
      type: 'new-element',
      elementType,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    touchAction: 'none',
  } : {
    touchAction: 'none',
  };

  // Call onDragStart when dragging begins
  React.useEffect(() => {
    if (isDragging && onDragStart) {
      onDragStart();
    }
  }, [isDragging, onDragStart]);

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={style}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-3",
              "rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200",
              "cursor-grab active:cursor-grabbing group select-none",
              "touch-none hover:shadow-md hover:border-primary/30",
              "hover:scale-[1.02] active:scale-[0.98]",
              isDragging && "opacity-50 z-50 shadow-lg ring-2 ring-primary"
            )}
          >
            <div className="text-muted-foreground group-hover:text-primary transition-colors pointer-events-none">
              {icon}
            </div>
            <span className="text-xs text-center font-medium pointer-events-none line-clamp-1">
              {title}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px] p-0 overflow-hidden">
          <div className="bg-popover border rounded-lg shadow-lg">
            <ElementPreview type={elementType} className="bg-muted/50" />
            <div className="p-2 border-t">
              <p className="font-medium text-sm">{title}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
