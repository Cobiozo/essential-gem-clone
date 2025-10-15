import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  MapPin
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
}

export const ElementsPanel: React.FC<ElementsPanelProps> = ({ 
  className,
  onElementClick 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('layout');

  const layoutElements: ElementCategory = {
    id: 'layout',
    title: 'Układ',
    defaultOpen: true,
    items: [
      { id: 'container', title: 'Kontener', icon: <Box className="w-8 h-8" />, type: 'container' },
      { id: 'grid', title: 'Siatka', icon: <Grid3X3 className="w-8 h-8" />, type: 'grid' },
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
      { id: 'divider', title: 'Rozdzielacz', icon: <Minus className="w-8 h-8" />, type: 'divider' },
      { id: 'spacer', title: 'Odstęp', icon: <AlignLeft className="w-8 h-8 rotate-90" />, type: 'spacer' },
      { id: 'maps', title: 'Mapy Google', icon: <MapPin className="w-8 h-8" />, type: 'maps' },
      { id: 'icon', title: 'Ikonka', icon: <Star className="w-8 h-8" />, type: 'icon' },
    ]
  };

  const allCategories = [layoutElements, basicElements];

  const filteredCategories = allCategories.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  const handleElementClick = (elementType: string) => {
    onElementClick?.(elementType);
  };

  return (
    <Card className={cn("w-80 h-full border-r rounded-none", className)}>
      <CardContent className="p-0 h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-center mb-4">Elementy</h2>
          
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
                      isOpen={expandedCategory === category.id}
                      onOpenChange={(open) => setExpandedCategory(open ? category.id : null)}
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: {
      type: 'new-element',
      elementType,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4",
        "rounded-lg border bg-card hover:bg-accent transition-colors",
        "cursor-grab active:cursor-grabbing group",
        isDragging && "opacity-50"
      )}
    >
      <div className="text-muted-foreground group-hover:text-foreground transition-colors">
        {icon}
      </div>
      <span className="text-xs text-center font-medium">
        {title}
      </span>
    </div>
  );
};
