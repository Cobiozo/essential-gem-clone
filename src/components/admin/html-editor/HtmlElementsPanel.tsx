import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Heading1, 
  Heading2, 
  Type, 
  Image, 
  Video, 
  MousePointer2, 
  LayoutGrid, 
  Square, 
  Star, 
  List, 
  Link, 
  Columns,
  Minus,
  Quote,
  Code,
  Table,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HtmlElementsPanelProps {
  onAddElement: (html: string, position?: 'before' | 'after' | 'inside') => void;
}

interface ElementTemplate {
  id: string;
  label: string;
  icon: React.ReactNode;
  html: string;
}

interface Category {
  id: string;
  title: string;
  items: ElementTemplate[];
  defaultOpen?: boolean;
}

// Collapsible Section for categories
const CollapsibleSection: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean 
}> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2.5 hover:bg-muted/50 transition-colors text-sm font-medium">
        <span className="flex-1 text-left">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-3 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const categories: Category[] = [
  {
    id: 'text',
    title: 'Tekst (7)',
    defaultOpen: true,
    items: [
      {
        id: 'h1',
        label: 'Nagłówek H1',
        icon: <Heading1 className="w-4 h-4" />,
        html: '<h1 class="text-4xl font-bold mb-4">Nowy nagłówek</h1>'
      },
      {
        id: 'h2',
        label: 'Nagłówek H2',
        icon: <Heading2 className="w-4 h-4" />,
        html: '<h2 class="text-3xl font-bold mb-3">Nowy nagłówek</h2>'
      },
      {
        id: 'h3',
        label: 'Nagłówek H3',
        icon: <Heading2 className="w-4 h-4" />,
        html: '<h3 class="text-2xl font-semibold mb-2">Nowy nagłówek</h3>'
      },
      {
        id: 'paragraph',
        label: 'Paragraf',
        icon: <Type className="w-4 h-4" />,
        html: '<p class="text-base leading-relaxed mb-4">Nowy paragraf tekstu. Kliknij, aby edytować treść.</p>'
      },
      {
        id: 'paragraph-highlight',
        label: 'Tekst wyróżniony',
        icon: <Type className="w-4 h-4" />,
        html: '<p class="text-lg font-medium text-primary mb-4">Wyróżniony tekst</p>'
      },
      {
        id: 'quote',
        label: 'Cytat',
        icon: <Quote className="w-4 h-4" />,
        html: '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">"Cytat lub ważna myśl"</blockquote>'
      },
      {
        id: 'code',
        label: 'Kod',
        icon: <Code className="w-4 h-4" />,
        html: '<pre class="bg-muted p-4 rounded-lg overflow-x-auto"><code>// Twój kod tutaj</code></pre>'
      },
    ]
  },
  {
    id: 'media',
    title: 'Multimedia (5)',
    items: [
      {
        id: 'image',
        label: 'Obrazek',
        icon: <Image className="w-4 h-4" />,
        html: '<img src="/placeholder.svg" alt="Opis obrazka" class="w-full h-auto rounded-lg" />'
      },
      {
        id: 'image-caption',
        label: 'Obrazek z podpisem',
        icon: <Image className="w-4 h-4" />,
        html: '<figure class="my-4"><img src="/placeholder.svg" alt="Opis obrazka" class="w-full h-auto rounded-lg" /><figcaption class="text-sm text-muted-foreground mt-2 text-center">Podpis obrazka</figcaption></figure>'
      },
      {
        id: 'video',
        label: 'Wideo',
        icon: <Video className="w-4 h-4" />,
        html: '<video controls controlslist="nodownload" class="w-full rounded-lg" src=""></video>'
      },
      {
        id: 'youtube',
        label: 'YouTube',
        icon: <Video className="w-4 h-4" />,
        html: '<div class="aspect-video"><iframe class="w-full h-full rounded-lg" src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe></div>'
      },
      {
        id: 'icon',
        label: 'Ikona',
        icon: <Star className="w-4 h-4" />,
        html: '<i data-lucide="star" class="w-6 h-6 text-primary"></i>'
      },
    ]
  },
  {
    id: 'interactive',
    title: 'Interaktywne (4)',
    items: [
      {
        id: 'button',
        label: 'Przycisk',
        icon: <MousePointer2 className="w-4 h-4" />,
        html: '<button class="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">Kliknij tutaj</button>'
      },
      {
        id: 'button-outline',
        label: 'Przycisk outline',
        icon: <MousePointer2 className="w-4 h-4" />,
        html: '<button class="px-6 py-3 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-colors">Kliknij tutaj</button>'
      },
      {
        id: 'link',
        label: 'Link',
        icon: <Link className="w-4 h-4" />,
        html: '<a href="#" class="text-primary underline hover:no-underline">Link tekstowy</a>'
      },
      {
        id: 'button-link',
        label: 'Przycisk-link',
        icon: <Link className="w-4 h-4" />,
        html: '<a href="#" class="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">Przejdź</a>'
      },
    ]
  },
  {
    id: 'layout',
    title: 'Layouty (7)',
    items: [
      {
        id: 'section',
        label: 'Sekcja',
        icon: <LayoutGrid className="w-4 h-4" />,
        html: '<section class="py-12 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold mb-6">Tytuł sekcji</h2><p>Treść sekcji</p></div></section>'
      },
      {
        id: 'card',
        label: 'Karta',
        icon: <Square className="w-4 h-4" />,
        html: '<div class="p-6 bg-card border rounded-xl shadow-sm"><h3 class="text-xl font-semibold mb-2">Tytuł karty</h3><p class="text-muted-foreground">Opis karty</p></div>'
      },
      {
        id: 'grid-2',
        label: 'Grid 2 kolumny',
        icon: <Columns className="w-4 h-4" />,
        html: '<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="p-4 bg-muted rounded-lg">Kolumna 1</div><div class="p-4 bg-muted rounded-lg">Kolumna 2</div></div>'
      },
      {
        id: 'grid-3',
        label: 'Grid 3 kolumny',
        icon: <Columns className="w-4 h-4" />,
        html: '<div class="grid grid-cols-1 md:grid-cols-3 gap-6"><div class="p-4 bg-muted rounded-lg">Kolumna 1</div><div class="p-4 bg-muted rounded-lg">Kolumna 2</div><div class="p-4 bg-muted rounded-lg">Kolumna 3</div></div>'
      },
      {
        id: 'flex-row',
        label: 'Flex row',
        icon: <Columns className="w-4 h-4" />,
        html: '<div class="flex flex-wrap gap-4 items-center"><div class="p-4 bg-muted rounded-lg">Element 1</div><div class="p-4 bg-muted rounded-lg">Element 2</div><div class="p-4 bg-muted rounded-lg">Element 3</div></div>'
      },
      {
        id: 'hero',
        label: 'Hero sekcja',
        icon: <LayoutGrid className="w-4 h-4" />,
        html: '<section class="py-20 px-6 bg-gradient-to-br from-primary/10 to-primary/5"><div class="max-w-4xl mx-auto text-center"><h1 class="text-5xl font-bold mb-6">Wielki Nagłówek Hero</h1><p class="text-xl text-muted-foreground mb-8">Podtytuł lub krótki opis</p><button class="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-medium text-lg">Główne CTA</button></div></section>'
      },
      {
        id: 'container',
        label: 'Kontener',
        icon: <Square className="w-4 h-4" />,
        html: '<div class="p-4">Pusty kontener</div>'
      },
    ]
  },
  {
    id: 'list',
    title: 'Listy (3)',
    items: [
      {
        id: 'ul',
        label: 'Lista punktowana',
        icon: <List className="w-4 h-4" />,
        html: '<ul class="list-disc pl-6 space-y-2"><li>Element listy 1</li><li>Element listy 2</li><li>Element listy 3</li></ul>'
      },
      {
        id: 'ol',
        label: 'Lista numerowana',
        icon: <List className="w-4 h-4" />,
        html: '<ol class="list-decimal pl-6 space-y-2"><li>Pierwszy krok</li><li>Drugi krok</li><li>Trzeci krok</li></ol>'
      },
      {
        id: 'icon-list',
        label: 'Lista z ikonami',
        icon: <List className="w-4 h-4" />,
        html: '<ul class="space-y-3"><li class="flex items-center gap-2"><i data-lucide="check" class="w-5 h-5 text-green-500"></i><span>Element z checkmarkiem</span></li><li class="flex items-center gap-2"><i data-lucide="check" class="w-5 h-5 text-green-500"></i><span>Kolejny element</span></li></ul>'
      },
    ]
  },
  {
    id: 'other',
    title: 'Inne (2)',
    items: [
      {
        id: 'separator',
        label: 'Separator',
        icon: <Minus className="w-4 h-4" />,
        html: '<hr class="my-8 border-border" />'
      },
      {
        id: 'table',
        label: 'Tabela',
        icon: <Table className="w-4 h-4" />,
        html: '<table class="w-full border-collapse"><thead><tr class="bg-muted"><th class="border p-3 text-left">Nagłówek 1</th><th class="border p-3 text-left">Nagłówek 2</th></tr></thead><tbody><tr><td class="border p-3">Komórka 1</td><td class="border p-3">Komórka 2</td></tr><tr><td class="border p-3">Komórka 3</td><td class="border p-3">Komórka 4</td></tr></tbody></table>'
      },
    ]
  },
];

export const HtmlElementsPanel: React.FC<HtmlElementsPanelProps> = ({ onAddElement }) => {
  return (
    <div className="h-full flex flex-col bg-background border-r">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="font-bold">Elementy</h2>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="widgets" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full grid grid-cols-2 h-9 rounded-none border-b shrink-0 bg-muted/30">
          <TabsTrigger value="widgets" className="text-xs data-[state=active]:bg-background">
            Widżety
          </TabsTrigger>
          <TabsTrigger value="global" className="text-xs data-[state=active]:bg-background">
            Globalne
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="widgets" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2">
              {categories.map((category) => (
                <CollapsibleSection 
                  key={category.id} 
                  title={category.title}
                  defaultOpen={category.defaultOpen}
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {category.items.map((item) => (
                      <Button
                        key={item.id}
                        variant="outline"
                        className={cn(
                          "flex-col h-auto py-2.5 px-2 gap-1",
                          "hover:bg-primary/10 hover:border-primary/30",
                          "transition-colors"
                        )}
                        onClick={() => onAddElement(item.html)}
                      >
                        {item.icon}
                        <span className="text-[10px] leading-tight text-center">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </CollapsibleSection>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="global" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 text-center text-muted-foreground">
              <Square className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Globalne elementy będą dostępne wkrótce</p>
              <p className="text-xs mt-1">Nagłówek, stopka i inne elementy współdzielone</p>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
