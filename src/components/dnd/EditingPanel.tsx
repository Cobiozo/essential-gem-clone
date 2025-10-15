import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CMSItem } from '@/types/cms';

interface EditingPanelProps {
  editingItem: CMSItem | null;
  sectionId: string | null;
  onSave: (item: CMSItem) => void;
  onClose: () => void;
  className?: string;
}

export const EditingPanel: React.FC<EditingPanelProps> = ({ 
  editingItem,
  sectionId,
  onSave,
  onClose,
  className 
}) => {
  const [activeTab, setActiveTab] = useState('content');
  const [editedItem, setEditedItem] = useState<CMSItem>(editingItem || {} as CMSItem);

  if (!editingItem || !sectionId) {
    return null;
  }

  const handleSave = () => {
    onSave(editedItem);
  };

  const getElementTitle = () => {
    const titles: { [key: string]: string } = {
      'heading': 'Nagłówek',
      'text': 'Tekst',
      'image': 'Obrazek',
      'button': 'Przycisk',
      'video': 'Film',
      'icon': 'Ikona',
      'divider': 'Rozdzielacz',
      'spacer': 'Odstęp',
      'maps': 'Mapa',
      'carousel': 'Karuzela',
      'accordion': 'Akordeon',
      'counter': 'Licznik',
      'progress-bar': 'Pasek postępu',
      'rating': 'Ocena',
      'gallery': 'Galeria',
      'social-icons': 'Ikony społecznościowe',
      'alert': 'Ostrzeżenie',
      'testimonial': 'Referencja',
    };
    return titles[editingItem.type] || 'Element';
  };

  return (
    <Card className={cn("w-80 h-full border-r rounded-none bg-background", className)}>
      <CardHeader className="border-b p-4 space-y-0">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gap-2 px-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Elementy</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <CardTitle className="text-base">
          Edytuj {getElementTitle()}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 h-[calc(100%-140px)]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 m-4">
            <TabsTrigger value="content">Treść</TabsTrigger>
            <TabsTrigger value="style">Styl</TabsTrigger>
            <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4 pb-20">
            <TabsContent value="content" className="mt-0 space-y-4">
              {/* Heading */}
              {editingItem.type === 'heading' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="heading-text">Tekst nagłówka</Label>
                    <Input
                      id="heading-text"
                      value={editedItem.title || ''}
                      onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                      placeholder="Wpisz nagłówek"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heading-level">Poziom (H1-H6)</Label>
                    <Input
                      id="heading-level"
                      type="number"
                      min="1"
                      max="6"
                      value={(editedItem.cells as any[])?.[0]?.level || 2}
                      onChange={(e) => {
                        const cells = editedItem.cells as any[] || [];
                        cells[0] = { ...cells[0], level: parseInt(e.target.value) };
                        setEditedItem({ ...editedItem, cells });
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Text */}
              {editingItem.type === 'text' && (
                <div className="space-y-2">
                  <Label htmlFor="text-content">Treść</Label>
                  <Textarea
                    id="text-content"
                    rows={6}
                    value={editedItem.description || ''}
                    onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                    placeholder="Wpisz tekst"
                  />
                </div>
              )}

              {/* Image */}
              {editingItem.type === 'image' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image-url">URL obrazka</Label>
                    <Input
                      id="image-url"
                      value={editedItem.media_url || ''}
                      onChange={(e) => setEditedItem({ ...editedItem, media_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image-alt">Tekst alternatywny</Label>
                    <Input
                      id="image-alt"
                      value={editedItem.media_alt_text || ''}
                      onChange={(e) => setEditedItem({ ...editedItem, media_alt_text: e.target.value })}
                      placeholder="Opis obrazka"
                    />
                  </div>
                </div>
              )}

              {/* Button */}
              {editingItem.type === 'button' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="button-text">Tekst przycisku</Label>
                    <Input
                      id="button-text"
                      value={editedItem.title || ''}
                      onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                      placeholder="Kliknij tutaj"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="button-url">Link</Label>
                    <Input
                      id="button-url"
                      value={editedItem.url || ''}
                      onChange={(e) => setEditedItem({ ...editedItem, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              {/* Maps */}
              {editingItem.type === 'maps' && (
                <div className="space-y-2">
                  <Label htmlFor="maps-url">URL mapy (Google Maps iframe)</Label>
                  <Textarea
                    id="maps-url"
                    rows={4}
                    value={editedItem.url || ''}
                    onChange={(e) => setEditedItem({ ...editedItem, url: e.target.value })}
                    placeholder="Wklej URL embed z Google Maps"
                  />
                </div>
              )}

              {/* Generic editor for other types */}
              {!['heading', 'text', 'image', 'button', 'maps'].includes(editingItem.type) && (
                <div className="space-y-2">
                  <Label>Edytor dla typu: {editingItem.type}</Label>
                  <p className="text-sm text-muted-foreground">
                    Szczegółowa edycja tego elementu będzie dostępna wkrótce.
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Możesz otworzyć pełny edytor klikając prawym przyciskiem myszy na element i wybierając "Edytuj w dialogu".
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="style" className="mt-0 space-y-4">
              <div className="text-sm text-muted-foreground text-center py-8">
                Opcje stylowania będą dostępne wkrótce
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-0 space-y-4">
              <div className="text-sm text-muted-foreground text-center py-8">
                Zaawansowane opcje będą dostępne wkrótce
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        {/* Save button at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button onClick={handleSave} className="w-full">
            Zapisz zmiany
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
