import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Layout, 
  Type, 
  Square, 
  Image, 
  Link, 
  Minus, 
  AlertCircle, 
  CheckCircle,
  Info,
  Quote,
  FileText
} from 'lucide-react';

interface EmailBlockInserterProps {
  onInsert: (html: string) => void;
}

const HEADER_COLORS = [
  { name: 'Zielony (domyślny)', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  { name: 'Niebieski', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
  { name: 'Fioletowy', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
  { name: 'Czerwony', gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' },
  { name: 'Pomarańczowy', gradient: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)' },
  { name: 'Szary', gradient: 'linear-gradient(135deg, #6b7280 0%, #374151 100%)' },
];

const BUTTON_COLORS = [
  { name: 'Zielony', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  { name: 'Niebieski', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
  { name: 'Fioletowy', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
  { name: 'Czerwony', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' },
  { name: 'Pomarańczowy', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)' },
  { name: 'Czarny', color: '#1f2937', gradient: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' },
];

export const EmailBlockInserter: React.FC<EmailBlockInserterProps> = ({ onInsert }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('struktura');
  
  // Header config
  const [headerColor, setHeaderColor] = useState(HEADER_COLORS[0].gradient);
  const [headerLogoUrl, setHeaderLogoUrl] = useState('https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/pure-life-logo.png');
  
  // Button config
  const [buttonText, setButtonText] = useState('Kliknij tutaj');
  const [buttonUrl, setButtonUrl] = useState('{{link_aktywacyjny}}');
  const [buttonColor, setButtonColor] = useState(BUTTON_COLORS[0]);
  
  // Image config
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  
  // Info box config
  const [infoBoxTitle, setInfoBoxTitle] = useState('');
  const [infoBoxContent, setInfoBoxContent] = useState('');

  const insertAndClose = (html: string) => {
    onInsert(html);
    setIsOpen(false);
  };

  const blocks = {
    struktura: [
      {
        name: 'Nagłówek z logo',
        icon: Layout,
        description: 'Kolorowy nagłówek z logo firmy',
        render: () => (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Kolor nagłówka</Label>
              <div className="grid grid-cols-3 gap-2">
                {HEADER_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setHeaderColor(c.gradient)}
                    className={`h-8 rounded border-2 ${headerColor === c.gradient ? 'border-primary' : 'border-transparent'}`}
                    style={{ background: c.gradient }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">URL logo (opcjonalnie)</Label>
              <Input
                value={headerLogoUrl}
                onChange={(e) => setHeaderLogoUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => insertAndClose(`
<div style="text-align: center; padding: 30px 20px; background: ${headerColor};">
  ${headerLogoUrl ? `<img src="${headerLogoUrl}" alt="Logo" style="max-height: 60px; max-width: 200px;">` : ''}
</div>`)}
            >
              Wstaw nagłówek
            </Button>
          </div>
        ),
      },
      {
        name: 'Sekcja treści',
        icon: FileText,
        description: 'Obszar na główną treść maila',
        insert: `
<div style="padding: 40px 30px;">
  <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Witaj {{imię}}!</h1>
  <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
    Tutaj wpisz treść wiadomości...
  </p>
</div>`,
      },
      {
        name: 'Stopka',
        icon: Layout,
        description: 'Stopka z informacjami o firmie',
        insert: `
<div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
    © ${new Date().getFullYear()} Pure Life / Eqology. Wszelkie prawa zastrzeżone.
  </p>
  <p style="color: #9ca3af; font-size: 11px; margin: 0;">
    Otrzymujesz tę wiadomość, ponieważ jesteś zarejestrowany w systemie Pure Life.
  </p>
</div>`,
      },
      {
        name: 'Separator',
        icon: Minus,
        description: 'Linia oddzielająca sekcje',
        insert: `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">`,
      },
    ],
    przyciski: [
      {
        name: 'Przycisk CTA',
        icon: Square,
        description: 'Kolorowy przycisk z linkiem',
        render: () => (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Tekst przycisku</Label>
              <Input
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Kliknij tutaj"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">URL lub zmienna</Label>
              <Input
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="https://... lub {{link_aktywacyjny}}"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Kolor przycisku</Label>
              <div className="grid grid-cols-3 gap-2">
                {BUTTON_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setButtonColor(c)}
                    className={`h-8 rounded border-2 ${buttonColor.name === c.name ? 'border-primary' : 'border-transparent'}`}
                    style={{ background: c.gradient }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => insertAndClose(`
<div style="text-align: center; margin: 35px 0;">
  <a href="${buttonUrl}" style="background: ${buttonColor.gradient}; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
    ${buttonText}
  </a>
</div>`)}
            >
              Wstaw przycisk
            </Button>
          </div>
        ),
      },
      {
        name: 'Przycisk z linkiem tekstowym',
        icon: Link,
        description: 'Link tekstowy bez tła',
        insert: `
<p style="text-align: center; margin: 20px 0;">
  <a href="{{link_aktywacyjny}}" style="color: #10b981; text-decoration: underline; font-weight: 500;">
    Kliknij tutaj
  </a>
</p>`,
      },
    ],
    boxy: [
      {
        name: 'Box sukcesu',
        icon: CheckCircle,
        description: 'Zielony box z ikoną sukcesu',
        render: () => (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Tytuł (opcjonalnie)</Label>
              <Input
                value={infoBoxTitle}
                onChange={(e) => setInfoBoxTitle(e.target.value)}
                placeholder="Gratulacje!"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Treść</Label>
              <Input
                value={infoBoxContent}
                onChange={(e) => setInfoBoxContent(e.target.value)}
                placeholder="Twoje konto zostało aktywowane."
                className="h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => insertAndClose(`
<div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  ${infoBoxTitle ? `<p style="color: #065f46; font-weight: 600; margin: 0 0 8px 0;">${infoBoxTitle}</p>` : ''}
  <p style="color: #065f46; margin: 0; font-size: 14px;">${infoBoxContent || 'Treść boxu...'}</p>
</div>`)}
            >
              Wstaw box sukcesu
            </Button>
          </div>
        ),
      },
      {
        name: 'Box ostrzeżenia',
        icon: AlertCircle,
        description: 'Żółty box z ostrzeżeniem',
        insert: `
<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <p style="color: #92400e; font-weight: 600; margin: 0 0 8px 0;">Uwaga</p>
  <p style="color: #92400e; margin: 0; font-size: 14px;">Treść ostrzeżenia...</p>
</div>`,
      },
      {
        name: 'Box błędu',
        icon: AlertCircle,
        description: 'Czerwony box z błędem',
        insert: `
<div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <p style="color: #991b1b; font-weight: 600; margin: 0 0 8px 0;">Błąd</p>
  <p style="color: #991b1b; margin: 0; font-size: 14px;">Treść błędu...</p>
</div>`,
      },
      {
        name: 'Box informacyjny',
        icon: Info,
        description: 'Niebieski box z informacją',
        insert: `
<div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
  <p style="color: #1e40af; font-weight: 600; margin: 0 0 8px 0;">Informacja</p>
  <p style="color: #1e40af; margin: 0; font-size: 14px;">Treść informacji...</p>
</div>`,
      },
      {
        name: 'Cytat',
        icon: Quote,
        description: 'Wyróżniony blok z cytatem',
        insert: `
<blockquote style="border-left: 4px solid #9ca3af; margin: 24px 0; padding: 16px 20px; background-color: #f9fafb; font-style: italic; color: #4b5563;">
  "Tutaj wpisz cytat lub wyróżniony tekst..."
</blockquote>`,
      },
    ],
    media: [
      {
        name: 'Obraz',
        icon: Image,
        description: 'Wstaw zdjęcie lub grafikę',
        render: () => (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">URL obrazu</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tekst alternatywny</Label>
              <Input
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Opis obrazu"
                className="h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!imageUrl}
              onClick={() => {
                insertAndClose(`
<div style="text-align: center; margin: 24px 0;">
  <img src="${imageUrl}" alt="${imageAlt || 'Obraz'}" style="max-width: 100%; height: auto; border-radius: 8px;">
</div>`);
                setImageUrl('');
                setImageAlt('');
              }}
            >
              Wstaw obraz
            </Button>
          </div>
        ),
      },
      {
        name: 'Obraz z podpisem',
        icon: Image,
        description: 'Obraz z tekstem pod spodem',
        render: () => (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">URL obrazu</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Podpis pod obrazem</Label>
              <Input
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Podpis"
                className="h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!imageUrl}
              onClick={() => {
                insertAndClose(`
<figure style="text-align: center; margin: 24px 0;">
  <img src="${imageUrl}" alt="${imageAlt || 'Obraz'}" style="max-width: 100%; height: auto; border-radius: 8px;">
  <figcaption style="color: #6b7280; font-size: 13px; margin-top: 8px; font-style: italic;">${imageAlt || 'Podpis'}</figcaption>
</figure>`);
                setImageUrl('');
                setImageAlt('');
              }}
            >
              Wstaw obraz z podpisem
            </Button>
          </div>
        ),
      },
    ],
    tekst: [
      {
        name: 'Nagłówek H1',
        icon: Type,
        description: 'Duży nagłówek sekcji',
        insert: `<h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Tytuł nagłówka</h1>`,
      },
      {
        name: 'Nagłówek H2',
        icon: Type,
        description: 'Średni nagłówek',
        insert: `<h2 style="color: #374151; font-size: 20px; margin-bottom: 16px;">Podtytuł</h2>`,
      },
      {
        name: 'Paragraf',
        icon: Type,
        description: 'Standardowy tekst',
        insert: `<p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Treść paragrafu...</p>`,
      },
      {
        name: 'Tekst mały',
        icon: Type,
        description: 'Drobny tekst informacyjny',
        insert: `<p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Mały tekst...</p>`,
      },
      {
        name: 'Podpis',
        icon: Type,
        description: 'Pozdrowienia i podpis',
        insert: `
<p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 30px;">
  Pozdrawiamy,<br>
  <strong>Zespół Pure Life</strong>
</p>`,
      },
    ],
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Wstaw blok
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Wstaw element do szablonu</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Wybierz gotowy blok do wstawienia w treść e-maila
          </p>
        </div>
        
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="w-full rounded-none border-b h-auto p-0 bg-transparent">
            <TabsTrigger value="struktura" className="flex-1 text-xs py-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Struktura
            </TabsTrigger>
            <TabsTrigger value="przyciski" className="flex-1 text-xs py-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Przyciski
            </TabsTrigger>
            <TabsTrigger value="boxy" className="flex-1 text-xs py-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Boxy
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-1 text-xs py-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Media
            </TabsTrigger>
            <TabsTrigger value="tekst" className="flex-1 text-xs py-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Tekst
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[300px]">
            {Object.entries(blocks).map(([category, items]) => (
              <TabsContent key={category} value={category} className="m-0 p-2 space-y-2">
                {items.map((block, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded">
                        <block.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{block.name}</h5>
                        <p className="text-xs text-muted-foreground">{block.description}</p>
                        
                        {'render' in block && block.render ? (
                          <div className="mt-3">
                            {block.render()}
                          </div>
                        ) : 'insert' in block && block.insert ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-2"
                            onClick={() => insertAndClose(block.insert)}
                          >
                            Wstaw
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
