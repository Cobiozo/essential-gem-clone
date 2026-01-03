import React, { useState } from 'react';
import { EmailBlock } from './types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Image, Upload, Link, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface BlockEditorProps {
  block: EmailBlock;
  onChange: (content: Record<string, any>) => void;
}

// Logo picker sub-component
const LogoPicker: React.FC<{
  logoUrl: string;
  onChange: (url: string) => void;
}> = ({ logoUrl, onChange }) => {
  const [tab, setTab] = useState<'library' | 'url' | 'upload'>('library');
  const [urlInput, setUrlInput] = useState(logoUrl || '');
  const [libraryImages, setLibraryImages] = useState<Array<{name: string, url: string}>>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const { toast } = useToast();
  const { uploadFile, isUploading, listFiles } = useLocalStorage();

  const loadLibrary = async () => {
    if (libraryImages.length > 0) return;
    setLoadingLibrary(true);
    try {
      const files = await listFiles('training-media');
      const images = files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
      );
      setLibraryImages(images.map(f => ({ name: f.name, url: f.url })));
    } catch (error) {
      console.error('Error loading library:', error);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Błąd', description: 'Wybierz plik obrazu', variant: 'destructive' });
      return;
    }

    try {
      const result = await uploadFile(file, { folder: 'email-logos' });
      onChange(result.url);
      toast({ title: 'Sukces', description: 'Logo zostało przesłane' });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  React.useEffect(() => {
    if (tab === 'library') {
      loadLibrary();
    }
  }, [tab]);

  // Extract filename from URL
  const getFilenameFromUrl = (url: string): string => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || '';
      return decodeURIComponent(filename);
    } catch {
      return url.split('/').pop() || url;
    }
  };

  return (
    <div className="space-y-3 w-full overflow-hidden">
      <Label>Logo</Label>
      
      {logoUrl && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md overflow-hidden">
          <img src={logoUrl} alt="Logo" className="h-8 w-8 flex-shrink-0 object-contain" />
          <span className="text-xs text-muted-foreground truncate flex-1 min-w-0" title={logoUrl}>
            {getFilenameFromUrl(logoUrl)}
          </span>
          <Button variant="ghost" size="sm" className="flex-shrink-0 h-7 px-2" onClick={() => onChange('')}>
            Usuń
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'library' | 'url' | 'upload')} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="library" className="text-xs px-1 py-1.5">
            <Image className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">Biblioteka</span>
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs px-1 py-1.5">
            <Link className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">URL</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-xs px-1 py-1.5">
            <Upload className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">Prześlij</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-2">
          {loadingLibrary ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Ładowanie...
            </div>
          ) : (
            <ScrollArea className="h-[120px] w-full">
              <div className="grid grid-cols-3 gap-1.5 p-1">
                {libraryImages.map((img) => (
                  <button
                    key={img.name}
                    className="aspect-square border rounded overflow-hidden hover:ring-2 hover:ring-primary transition-all bg-white"
                    onClick={() => onChange(img.url)}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-contain p-0.5" />
                  </button>
                ))}
                {libraryImages.length === 0 && (
                  <div className="col-span-3 text-center text-muted-foreground text-sm py-4">
                    Brak obrazów w bibliotece
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="url" className="mt-2 space-y-2">
          <Input
            placeholder="https://example.com/logo.png"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <Button size="sm" onClick={() => onChange(urlInput)} disabled={!urlInput}>
            Zastosuj URL
          </Button>
        </TabsContent>

        <TabsContent value="upload" className="mt-2">
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              id="logo-upload"
              disabled={isUploading}
            />
            <label htmlFor="logo-upload" className="cursor-pointer">
              {isUploading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Przesyłanie...
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <Upload className="h-6 w-6 mx-auto mb-2" />
                  Kliknij, aby przesłać logo
                </div>
              )}
            </label>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const BlockEditor: React.FC<BlockEditorProps> = ({ block, onChange }) => {
  const updateField = (field: string, value: any) => {
    onChange({ ...block.content, [field]: value });
  };

  switch (block.type) {
    case 'header':
      return (
        <div className="space-y-4">
          <div>
            <Label>Tekst nagłówka</Label>
            <Input
              value={block.content.text}
              onChange={(e) => updateField('text', e.target.value)}
            />
          </div>
          <div>
            <Label>Kolor tła</Label>
            <Input
              type="color"
              value={block.content.backgroundColor}
              onChange={(e) => updateField('backgroundColor', e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <div>
            <Label>Kolor tekstu</Label>
            <Input
              type="color"
              value={block.content.textColor}
              onChange={(e) => updateField('textColor', e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={block.content.showLogo}
              onCheckedChange={(checked) => updateField('showLogo', checked)}
            />
            <Label>Pokaż logo</Label>
          </div>
          {block.content.showLogo && (
            <LogoPicker
              logoUrl={block.content.logoUrl || ''}
              onChange={(url) => updateField('logoUrl', url)}
            />
          )}
        </div>
      );

    case 'text':
      return (
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Treść</Label>
            <RichTextEditor
              value={block.content.html || ''}
              onChange={(html) => updateField('html', html)}
              rows={6}
              compact
            />
          </div>
        </div>
      );

    case 'button':
      return (
        <div className="space-y-4">
          <div>
            <Label>Tekst przycisku</Label>
            <Input
              value={block.content.text}
              onChange={(e) => updateField('text', e.target.value)}
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={block.content.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Kolor tła</Label>
            <Input
              type="color"
              value={block.content.backgroundColor}
              onChange={(e) => updateField('backgroundColor', e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <div>
            <Label>Kolor tekstu</Label>
            <Input
              type="color"
              value={block.content.textColor}
              onChange={(e) => updateField('textColor', e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <div>
            <Label>Wyrównanie</Label>
            <Select value={block.content.align} onValueChange={(v) => updateField('align', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Lewo</SelectItem>
                <SelectItem value="center">Środek</SelectItem>
                <SelectItem value="right">Prawo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-4">
          <LogoPicker
            logoUrl={block.content.src || ''}
            onChange={(url) => updateField('src', url)}
          />
          <div>
            <Label>Tekst alternatywny</Label>
            <Input
              value={block.content.alt}
              onChange={(e) => updateField('alt', e.target.value)}
            />
          </div>
          <div>
            <Label>Szerokość (np. 100%, 300px)</Label>
            <Input
              value={block.content.width}
              onChange={(e) => updateField('width', e.target.value)}
            />
          </div>
          <div>
            <Label>Wyrównanie</Label>
            <Select value={block.content.align} onValueChange={(v) => updateField('align', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Lewo</SelectItem>
                <SelectItem value="center">Środek</SelectItem>
                <SelectItem value="right">Prawo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'box':
      return (
        <div className="space-y-4">
          <div>
            <Label>Wariant</Label>
            <Select value={block.content.variant} onValueChange={(v) => updateField('variant', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informacja</SelectItem>
                <SelectItem value="success">Sukces</SelectItem>
                <SelectItem value="warning">Ostrzeżenie</SelectItem>
                <SelectItem value="error">Błąd</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tytuł</Label>
            <Input
              value={block.content.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2 block">Treść</Label>
            <RichTextEditor
              value={block.content.content || ''}
              onChange={(html) => updateField('content', html)}
              rows={3}
              compact
            />
          </div>
        </div>
      );

    case 'separator':
      return (
        <div className="space-y-4">
          <div>
            <Label>Styl linii</Label>
            <Select value={block.content.style} onValueChange={(v) => updateField('style', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Ciągła</SelectItem>
                <SelectItem value="dashed">Przerywana</SelectItem>
                <SelectItem value="dotted">Kropkowana</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kolor</Label>
            <Input
              type="color"
              value={block.content.color}
              onChange={(e) => updateField('color', e.target.value)}
              className="h-10 w-full"
            />
          </div>
        </div>
      );

    case 'spacer':
      return (
        <div className="space-y-4">
          <div>
            <Label>Wysokość: {block.content.height}px</Label>
            <Slider
              value={[block.content.height]}
              onValueChange={([v]) => updateField('height', v)}
              min={10}
              max={100}
              step={5}
            />
          </div>
        </div>
      );

    case 'footer':
      return (
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Treść stopki</Label>
            <RichTextEditor
              value={block.content.html || ''}
              onChange={(html) => updateField('html', html)}
              rows={4}
              compact
            />
          </div>
        </div>
      );

    default:
      return <div className="text-muted-foreground">Brak edytora dla tego typu bloku</div>;
  }
};
