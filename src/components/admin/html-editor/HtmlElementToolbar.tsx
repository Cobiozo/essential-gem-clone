import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HtmlElementToolbarProps {
  onAddElement: (html: string, position?: 'before' | 'after' | 'inside') => void;
  hasSelection: boolean;
}

interface ElementTemplate {
  label: string;
  icon: React.ReactNode;
  html: string;
  category: string;
}

const elementTemplates: ElementTemplate[] = [
  // Nagłówki
  {
    label: 'Nagłówek H1',
    icon: <Heading1 className="w-4 h-4" />,
    html: '<h1 class="text-4xl font-bold mb-4">Nowy nagłówek</h1>',
    category: 'text'
  },
  {
    label: 'Nagłówek H2',
    icon: <Heading2 className="w-4 h-4" />,
    html: '<h2 class="text-3xl font-bold mb-3">Nowy nagłówek</h2>',
    category: 'text'
  },
  {
    label: 'Nagłówek H3',
    icon: <Heading2 className="w-4 h-4" />,
    html: '<h3 class="text-2xl font-semibold mb-2">Nowy nagłówek</h3>',
    category: 'text'
  },
  
  // Tekst
  {
    label: 'Paragraf',
    icon: <Type className="w-4 h-4" />,
    html: '<p class="text-base leading-relaxed mb-4">Nowy paragraf tekstu. Kliknij, aby edytować treść.</p>',
    category: 'text'
  },
  {
    label: 'Tekst wyróżniony',
    icon: <Type className="w-4 h-4" />,
    html: '<p class="text-lg font-medium text-primary mb-4">Wyróżniony tekst</p>',
    category: 'text'
  },
  {
    label: 'Cytat',
    icon: <Quote className="w-4 h-4" />,
    html: '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">"Cytat lub ważna myśl"</blockquote>',
    category: 'text'
  },
  {
    label: 'Kod',
    icon: <Code className="w-4 h-4" />,
    html: '<pre class="bg-muted p-4 rounded-lg overflow-x-auto"><code>// Twój kod tutaj</code></pre>',
    category: 'text'
  },
  
  // Multimedia
  {
    label: 'Obrazek',
    icon: <Image className="w-4 h-4" />,
    html: '<img src="/placeholder.svg" alt="Opis obrazka" class="w-full h-auto rounded-lg" />',
    category: 'media'
  },
  {
    label: 'Obrazek z podpisem',
    icon: <Image className="w-4 h-4" />,
    html: '<figure class="my-4"><img src="/placeholder.svg" alt="Opis obrazka" class="w-full h-auto rounded-lg" /><figcaption class="text-sm text-muted-foreground mt-2 text-center">Podpis obrazka</figcaption></figure>',
    category: 'media'
  },
  {
    label: 'Wideo',
    icon: <Video className="w-4 h-4" />,
    html: '<video controls controlslist="nodownload" class="w-full rounded-lg" src=""></video>',
    category: 'media'
  },
  {
    label: 'YouTube',
    icon: <Video className="w-4 h-4" />,
    html: '<div class="aspect-video"><iframe class="w-full h-full rounded-lg" src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe></div>',
    category: 'media'
  },
  {
    label: 'Ikona',
    icon: <Star className="w-4 h-4" />,
    html: '<i data-lucide="star" class="w-6 h-6 text-primary"></i>',
    category: 'media'
  },
  
  // Interaktywne
  {
    label: 'Przycisk',
    icon: <MousePointer2 className="w-4 h-4" />,
    html: '<button class="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">Kliknij tutaj</button>',
    category: 'interactive'
  },
  {
    label: 'Przycisk outline',
    icon: <MousePointer2 className="w-4 h-4" />,
    html: '<button class="px-6 py-3 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-colors">Kliknij tutaj</button>',
    category: 'interactive'
  },
  {
    label: 'Link',
    icon: <Link className="w-4 h-4" />,
    html: '<a href="#" class="text-primary underline hover:no-underline">Link tekstowy</a>',
    category: 'interactive'
  },
  {
    label: 'Przycisk-link',
    icon: <Link className="w-4 h-4" />,
    html: '<a href="#" class="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">Przejdź</a>',
    category: 'interactive'
  },
  
  // Layouty
  {
    label: 'Sekcja',
    icon: <LayoutGrid className="w-4 h-4" />,
    html: '<section class="py-12 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold mb-6">Tytuł sekcji</h2><p>Treść sekcji</p></div></section>',
    category: 'layout'
  },
  {
    label: 'Karta',
    icon: <Square className="w-4 h-4" />,
    html: '<div class="p-6 bg-card border rounded-xl shadow-sm"><h3 class="text-xl font-semibold mb-2">Tytuł karty</h3><p class="text-muted-foreground">Opis karty</p></div>',
    category: 'layout'
  },
  {
    label: 'Grid 2 kolumny',
    icon: <Columns className="w-4 h-4" />,
    html: '<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="p-4 bg-muted rounded-lg">Kolumna 1</div><div class="p-4 bg-muted rounded-lg">Kolumna 2</div></div>',
    category: 'layout'
  },
  {
    label: 'Grid 3 kolumny',
    icon: <Columns className="w-4 h-4" />,
    html: '<div class="grid grid-cols-1 md:grid-cols-3 gap-6"><div class="p-4 bg-muted rounded-lg">Kolumna 1</div><div class="p-4 bg-muted rounded-lg">Kolumna 2</div><div class="p-4 bg-muted rounded-lg">Kolumna 3</div></div>',
    category: 'layout'
  },
  {
    label: 'Flex row',
    icon: <Columns className="w-4 h-4" />,
    html: '<div class="flex flex-wrap gap-4 items-center"><div class="p-4 bg-muted rounded-lg">Element 1</div><div class="p-4 bg-muted rounded-lg">Element 2</div><div class="p-4 bg-muted rounded-lg">Element 3</div></div>',
    category: 'layout'
  },
  {
    label: 'Hero sekcja',
    icon: <LayoutGrid className="w-4 h-4" />,
    html: '<section class="py-20 px-6 bg-gradient-to-br from-primary/10 to-primary/5"><div class="max-w-4xl mx-auto text-center"><h1 class="text-5xl font-bold mb-6">Wielki Nagłówek Hero</h1><p class="text-xl text-muted-foreground mb-8">Podtytuł lub krótki opis</p><button class="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-medium text-lg">Główne CTA</button></div></section>',
    category: 'layout'
  },
  
  // Listy
  {
    label: 'Lista punktowana',
    icon: <List className="w-4 h-4" />,
    html: '<ul class="list-disc pl-6 space-y-2"><li>Element listy 1</li><li>Element listy 2</li><li>Element listy 3</li></ul>',
    category: 'list'
  },
  {
    label: 'Lista numerowana',
    icon: <List className="w-4 h-4" />,
    html: '<ol class="list-decimal pl-6 space-y-2"><li>Pierwszy krok</li><li>Drugi krok</li><li>Trzeci krok</li></ol>',
    category: 'list'
  },
  {
    label: 'Lista z ikonami',
    icon: <List className="w-4 h-4" />,
    html: '<ul class="space-y-3"><li class="flex items-center gap-2"><i data-lucide="check" class="w-5 h-5 text-green-500"></i><span>Element z checkmarkiem</span></li><li class="flex items-center gap-2"><i data-lucide="check" class="w-5 h-5 text-green-500"></i><span>Kolejny element</span></li></ul>',
    category: 'list'
  },
  
  // Inne
  {
    label: 'Separator',
    icon: <Minus className="w-4 h-4" />,
    html: '<hr class="my-8 border-border" />',
    category: 'other'
  },
  {
    label: 'Tabela',
    icon: <Table className="w-4 h-4" />,
    html: '<table class="w-full border-collapse"><thead><tr class="bg-muted"><th class="border p-3 text-left">Nagłówek 1</th><th class="border p-3 text-left">Nagłówek 2</th></tr></thead><tbody><tr><td class="border p-3">Komórka 1</td><td class="border p-3">Komórka 2</td></tr><tr><td class="border p-3">Komórka 3</td><td class="border p-3">Komórka 4</td></tr></tbody></table>',
    category: 'other'
  },
  {
    label: 'Kontener',
    icon: <Square className="w-4 h-4" />,
    html: '<div class="p-4">Pusty kontener</div>',
    category: 'layout'
  },
];

const categories = [
  { id: 'text', label: 'Tekst', icon: <Type className="w-4 h-4" /> },
  { id: 'media', label: 'Multimedia', icon: <Image className="w-4 h-4" /> },
  { id: 'interactive', label: 'Interaktywne', icon: <MousePointer2 className="w-4 h-4" /> },
  { id: 'layout', label: 'Layouty', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'list', label: 'Listy', icon: <List className="w-4 h-4" /> },
  { id: 'other', label: 'Inne', icon: <Square className="w-4 h-4" /> },
];

const positionLabels: Record<string, string> = {
  'before': 'przed',
  'after': 'po',
  'inside': 'wewnątrz'
};

export const HtmlElementToolbar: React.FC<HtmlElementToolbarProps> = ({
  onAddElement,
  hasSelection
}) => {
  const [insertPosition, setInsertPosition] = useState<'before' | 'after' | 'inside'>('after');

  const handleAdd = (html: string) => {
    onAddElement(html, insertPosition);
  };

  const quickElements = elementTemplates.filter(t => 
    ['Nagłówek H2', 'Paragraf', 'Obrazek', 'Przycisk', 'Sekcja'].includes(t.label)
  );

  return (
    <div className="flex items-center gap-1 p-2 bg-muted/50 border-b flex-wrap">
      {/* Quick access buttons */}
      {quickElements.map((template) => (
        <Button
          key={template.label}
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1"
          onClick={() => handleAdd(template.html)}
          title={`${template.label} (${hasSelection ? positionLabels[insertPosition] : 'na końcu'})`}
        >
          {template.icon}
          <span className="hidden sm:inline text-xs">{template.label}</span>
        </Button>
      ))}

      <div className="h-6 w-px bg-border mx-1" />

      {/* Full dropdown menu with position indicator */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Więcej</span>
            {hasSelection && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                {positionLabels[insertPosition]}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <ScrollArea className="h-[400px]">
            {categories.map((category, idx) => (
              <React.Fragment key={category.id}>
                {idx > 0 && <DropdownMenuSeparator />}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    {category.icon}
                    {category.label}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-56">
                    {elementTemplates
                      .filter(t => t.category === category.id)
                      .map((template) => (
                        <DropdownMenuItem
                          key={template.label}
                          onClick={() => handleAdd(template.html)}
                          className="gap-2"
                        >
                          {template.icon}
                          {template.label}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </React.Fragment>
            ))}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Position options when element is selected */}
      {hasSelection && (
        <>
          <div className="h-6 w-px bg-border mx-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                Pozycja: <span className="font-medium">{positionLabels[insertPosition]}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Gdzie wstawić nowy element?
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={insertPosition} onValueChange={(v) => setInsertPosition(v as 'before' | 'after' | 'inside')}>
                <DropdownMenuRadioItem value="before">
                  Przed zaznaczonym
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="after">
                  Po zaznaczonym
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="inside">
                  Wewnątrz zaznaczonego
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
};
