import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemEditor } from '@/components/cms/ItemEditor';
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
  Spline
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';

interface ElementItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  type: string;
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
}

export const ElementsPanel: React.FC<ElementsPanelProps> = ({ 
  className,
  onElementClick,
  panelMode = 'elements',
  onPanelModeChange,
  editingItemId,
  editingItem,
  isItemEditorOpen,
  onSaveItem,
  onCancelEdit
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['layout', 'basic']);

  const layoutElements: ElementCategory = {
    id: 'layout',
    title: 'Układ',
    defaultOpen: true,
    items: [
      { id: 'container', title: 'Kontener', icon: <Box className="w-8 h-8" />, type: 'container' },
      { id: 'grid', title: 'Siatka', icon: <Grid3X3 className="w-8 h-8" />, type: 'grid' },
      { id: 'pure-life-container', title: 'Pure Life', icon: <Grid3X3 className="w-8 h-8 text-blue-500" />, type: 'pure-life-container' },
    ]
  };

  const basicElements: ElementCategory = {
    id: 'basic',
    title: 'Podstawowe',
    items: [
      { id: 'heading', title: 'Nagłówek', icon: <Type className="w-8 h-8" />, type: 'heading' },
      { id: 'image', title: 'Obrazek', icon: <ImageIcon className="w-8 h-8" />, type: 'image' },
      { id: 'text', title: 'Edytor tekstu', icon: <AlignLeft className="w-8 h-8" />, type: 'text' },
      { id: 'video', title: 'Film', icon: <Video className="w-8 h-8" />, type: 'video' },
      { id: 'button', title: 'Przycisk', icon: <MousePointer2 className="w-8 h-8" />, type: 'button' },
      { id: 'info-text', title: 'Tekst informacyjny', icon: <Info className="w-8 h-8" />, type: 'info_text' },
      { id: 'divider', title: 'Rozdzielacz', icon: <Minus className="w-8 h-8" />, type: 'divider' },
      { id: 'spacer', title: 'Odstęp', icon: <AlignLeft className="w-8 h-8 rotate-90" />, type: 'spacer' },
      { id: 'maps', title: 'Mapy Google', icon: <MapPin className="w-8 h-8" />, type: 'maps' },
      { id: 'icon', title: 'Ikonka', icon: <Star className="w-8 h-8" />, type: 'icon' },
    ]
  };

  console.log('[ElementsPanel] basicElements items:', basicElements.items.map(i => i.title));

  const generalElements: ElementCategory = {
    id: 'general',
    title: 'Ogólne',
    items: [
      { id: 'image-field', title: 'Pole obrazka', icon: <ImagePlus className="w-8 h-8" />, type: 'image-field' },
      { id: 'icon-field', title: 'Pole ikonki', icon: <Smile className="w-8 h-8" />, type: 'icon-field' },
      { id: 'carousel', title: 'Karuzela obrazków', icon: <Images className="w-8 h-8" />, type: 'carousel' },
      { id: 'accessibility', title: 'Dostępność A11y', icon: <Accessibility className="w-8 h-8" />, type: 'accessibility' },
      { id: 'gallery', title: 'Galeria podstawowa', icon: <LayoutGrid className="w-8 h-8" />, type: 'gallery' },
      { id: 'icon-list', title: 'Lista ikonki', icon: <List className="w-8 h-8" />, type: 'icon-list' },
      { id: 'counter', title: 'Licznik', icon: <Hash className="w-8 h-8" />, type: 'counter' },
      { id: 'progress-bar', title: 'Pasek postępu', icon: <BarChart3 className="w-8 h-8" />, type: 'progress-bar' },
      { id: 'testimonial', title: 'Referencja', icon: <MessageSquare className="w-8 h-8" />, type: 'testimonial' },
      { id: 'cards', title: 'Karty', icon: <CreditCard className="w-8 h-8" />, type: 'cards' },
      { id: 'accordion', title: 'Akordeon', icon: <ChevronDown className="w-8 h-8" />, type: 'accordion' },
      { id: 'toggle', title: 'Przełącznik', icon: <ToggleLeft className="w-8 h-8" />, type: 'toggle' },
      { id: 'social-icons', title: 'Ikonki społecznościowe', icon: <Share2 className="w-8 h-8" />, type: 'social-icons' },
      { id: 'alert', title: 'Ostrzeżenie', icon: <AlertCircle className="w-8 h-8" />, type: 'alert' },
      { id: 'soundcloud', title: 'SoundCloud', icon: <Music className="w-8 h-8" />, type: 'soundcloud' },
      { id: 'shortcode', title: 'Krótki kod', icon: <Code2 className="w-8 h-8" />, type: 'shortcode' },
      { id: 'html', title: 'HTML', icon: <Code className="w-8 h-8" />, type: 'html' },
      { id: 'menu-anchor', title: 'Kotwica menu', icon: <Anchor className="w-8 h-8" />, type: 'menu-anchor' },
      { id: 'sidebar', title: 'Panel boczny', icon: <PanelLeft className="w-8 h-8" />, type: 'sidebar' },
      { id: 'learn-more', title: 'Dowiedz się więcej', icon: <Info className="w-8 h-8" />, type: 'learn-more' },
      { id: 'rating', title: 'Ocena', icon: <StarHalf className="w-8 h-8" />, type: 'rating' },
      { id: 'trustindex', title: 'Google Recenzje', icon: <ThumbsUp className="w-8 h-8" />, type: 'trustindex' },
      { id: 'ppom', title: 'PPOM Shortcode', icon: <FileCode className="w-8 h-8" />, type: 'ppom' },
      { id: 'text-path', title: 'Ścieżka tekstowa', icon: <Spline className="w-8 h-8" />, type: 'text-path' },
    ]
  };

  const allCategories = [layoutElements, basicElements, generalElements];

  const filteredCategories = allCategories.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  console.log('[ElementsPanel] Filtered categories:', filteredCategories.map(c => ({ 
    id: c.id, 
    title: c.title, 
    itemCount: c.items.length,
    items: c.items.map(i => i.title)
  })));

  const handleElementClick = (elementType: string) => {
    onElementClick?.(elementType);
  };

  return (
    <Card className={cn("w-80 h-full border-r rounded-none", className)}>
      <CardContent className="p-0 h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            {panelMode === 'properties' && onPanelModeChange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPanelModeChange('elements')}
                className="px-2"
              >
                ← Powrót
              </Button>
            )}
            <h2 className="text-lg font-bold text-center flex-1">
              {panelMode === 'elements' ? 'Elementy' : 'Właściwości'}
            </h2>
          </div>
        
        {panelMode === 'elements' ? (
          <Tabs defaultValue="widgets" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="widgets">Widżety</TabsTrigger>
              <TabsTrigger value="global">Globalne</TabsTrigger>
            </TabsList>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Widżet wyszukiwania..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <TabsContent value="widgets" className="mt-0">
              <ScrollArea className="h-[calc(100vh-240px)]">
                <div className="space-y-2 p-4">
                  {filteredCategories.map((category) => (
                    <CollapsibleSection
                      key={category.id}
                      title={category.title}
                      isOpen={expandedCategories.includes(category.id)}
                      onOpenChange={(open) => {
                        if (open) {
                          setExpandedCategories([...expandedCategories, category.id]);
                        } else {
                          setExpandedCategories(expandedCategories.filter(id => id !== category.id));
                        }
                      }}
                      className="border-b pb-2"
                    >
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {category.items.map((item) => (
                          <DraggableElement
                            key={item.id}
                            id={`new-${item.type}`}
                            elementType={item.type}
                            icon={item.icon}
                            title={item.title}
                          />
                        ))}
                      </div>
                    </CollapsibleSection>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="global" className="mt-4">
              <div className="p-4 text-center text-sm text-muted-foreground">
                Globalne elementy będą dostępne wkrótce
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4">
                {editingItem && onSaveItem && onCancelEdit ? (
                  <ItemEditor
                    key={editingItemId}
                    item={editingItem}
                    sectionId={editingItem.section_id || ''}
                    onSave={onSaveItem}
                    onCancel={onCancelEdit}
                    isOpen={isItemEditorOpen || false}
                  />
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Wybierz element do edycji
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  );
};

// Draggable element component
interface DraggableElementProps {
  id: string;
  elementType: string;
  icon: React.ReactNode;
  title: string;
}

const DraggableElement: React.FC<DraggableElementProps> = ({ id, elementType, icon, title }) => {
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

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4",
        "rounded-lg border bg-card hover:bg-accent transition-colors",
        "cursor-grab active:cursor-grabbing group select-none",
        "touch-none", // Zapewnia blokowanie scroll podczas drag
        isDragging && "opacity-50 z-50"
      )}
    >
      <div className="text-muted-foreground group-hover:text-foreground transition-colors pointer-events-none">
        {icon}
      </div>
      <span className="text-xs text-center font-medium pointer-events-none">
        {title}
      </span>
    </div>
  );
};
