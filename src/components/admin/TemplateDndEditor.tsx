import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, IText, Rect, Circle, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Square, Circle as CircleIcon, Save, Trash2, Image as ImageIcon, ArrowUp, ArrowDown, MoveUp, MoveDown, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'line' | 'shape';
  content?: string;
  imageUrl?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

interface CertificateTemplate {
  id: string;
  name: string;
  layout: {
    elements: TemplateElement[];
    format?: { width: number; height: number };
    language?: 'pl' | 'en' | 'de';
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  template: CertificateTemplate;
  onSave: (layout: any) => Promise<void>;
  onClose: () => void;
}

const AI_STYLE_PRESETS = [
  { name: 'Elegancki', prompt: 'Elegant certificate with gold ornamental borders, cream background, subtle floral patterns' },
  { name: 'Nowoczesny', prompt: 'Modern minimalist certificate, clean geometric shapes, blue gradient accent' },
  { name: 'Korporacyjny', prompt: 'Professional corporate certificate, navy blue header, silver trim' },
  { name: 'Naturalny', prompt: 'Nature-inspired certificate with watercolor leaves, soft green tones' },
  { name: 'Klasyczny', prompt: 'Classic diploma style, parchment texture, red ribbon seal, traditional frame' },
];

const CERTIFICATE_LANGUAGES = [
  { code: 'pl', name: 'Polski', labels: { title: 'Certyfikat Ukończenia', userName: 'Imię i Nazwisko', moduleTitle: 'Tytuł Szkolenia', completionDate: 'Data ukończenia' } },
  { code: 'en', name: 'English', labels: { title: 'Certificate of Completion', userName: 'Full Name', moduleTitle: 'Training Title', completionDate: 'Completion Date' } },
  { code: 'de', name: 'Deutsch', labels: { title: 'Abschlusszertifikat', userName: 'Vollständiger Name', moduleTitle: 'Schulungstitel', completionDate: 'Abschlussdatum' } },
];

const TemplateDndEditor = ({ template, onSave, onClose }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(20);
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [uploading, setUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [autoArranging, setAutoArranging] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'pl' | 'en' | 'de'>(template.layout.language || 'pl');
  const { toast } = useToast();

  // Get dimensions from template or use A4 landscape defaults
  const CANVAS_WIDTH = template.layout.format?.width || 842;
  const CANVAS_HEIGHT = template.layout.format?.height || 595;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
    });

    setFabricCanvas(canvas);

    // Load existing template elements in order
    const loadElements = async () => {
      if (template.layout.elements) {
        for (const element of template.layout.elements) {
          if (element.type === 'text') {
            const text = new IText(element.content || '', {
              left: element.x,
              top: element.y,
              fontSize: element.fontSize || 16,
              fontWeight: element.fontWeight || 'normal',
              fill: element.color || '#000000',
              fontFamily: 'Arial',
            });
            canvas.add(text);
          } else if (element.type === 'image' && element.imageUrl) {
            try {
              const img = await FabricImage.fromURL(element.imageUrl);
              img.set({
                left: element.x,
                top: element.y,
                scaleX: (element.width || 100) / (img.width || 1),
                scaleY: (element.height || 100) / (img.height || 1),
              });
              canvas.add(img);
            } catch (error) {
              console.error('Error loading image:', error);
            }
          } else if (element.type === 'shape') {
            if (element.width && element.height && element.width === element.height) {
              const circle = new Circle({
                left: element.x,
                top: element.y,
                radius: element.width / 2,
                fill: '#e0e0e0',
                stroke: '#000000',
                strokeWidth: 2,
              });
              canvas.add(circle);
            } else {
              const rect = new Rect({
                left: element.x,
                top: element.y,
                width: element.width || 100,
                height: element.height || 100,
                fill: '#e0e0e0',
                stroke: '#000000',
                strokeWidth: 2,
              });
              canvas.add(rect);
            }
          }
        }
        canvas.renderAll();
      }
    };

    loadElements();

    // Handle object selection
    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0]);
    });

    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0]);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // Constrain objects within canvas bounds
    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (!obj) return;

      const bound = obj.getBoundingRect();
      
      // Check boundaries and constrain position
      if (bound.left < 0) {
        obj.left = Math.max(obj.left || 0, obj.left! - bound.left);
      }
      if (bound.top < 0) {
        obj.top = Math.max(obj.top || 0, obj.top! - bound.top);
      }
      if (bound.left + bound.width > CANVAS_WIDTH) {
        obj.left = Math.min(obj.left || 0, CANVAS_WIDTH - bound.width + (obj.left! - bound.left));
      }
      if (bound.top + bound.height > CANVAS_HEIGHT) {
        obj.top = Math.min(obj.top || 0, CANVAS_HEIGHT - bound.height + (obj.top! - bound.top));
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [template]);

  const addText = () => {
    if (!fabricCanvas) return;

    const text = new IText('Nowy tekst', {
      left: 100,
      top: 100,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fill: textColor,
      fontFamily: 'Arial',
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fabricCanvas) return;

    setUploading(true);
    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `certificate-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cms-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cms-images')
        .getPublicUrl(filePath);

      // Add image to canvas
      const img = await FabricImage.fromURL(publicUrl);
      
      // Scale image to fit within reasonable bounds
      const maxWidth = 300;
      const maxHeight = 300;
      const scale = Math.min(maxWidth / (img.width || 1), maxHeight / (img.height || 1), 1);
      
      img.set({
        left: 100,
        top: 100,
        scaleX: scale,
        scaleY: scale,
      });

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();

      toast({
        title: "Sukces",
        description: "Obraz został dodany do szablonu",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać obrazu",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const updateSelectedText = () => {
    if (!selectedObject || selectedObject.type !== 'i-text') return;

    selectedObject.set({
      fill: textColor,
      fontSize: fontSize,
      fontWeight: fontWeight,
    });

    fabricCanvas?.renderAll();
  };

  useEffect(() => {
    if (selectedObject && selectedObject.type === 'i-text') {
      setTextColor(selectedObject.fill?.toString() || '#000000');
      setFontSize(selectedObject.fontSize || 20);
      setFontWeight(selectedObject.fontWeight === 'bold' ? 'bold' : 'normal');
    }
  }, [selectedObject]);

  const addShape = (shapeType: 'rectangle' | 'circle') => {
    if (!fabricCanvas) return;

    let shape;
    if (shapeType === 'rectangle') {
      shape = new Rect({
        left: 100,
        top: 100,
        fill: '#e0e0e0',
        width: 200,
        height: 100,
        stroke: '#000000',
        strokeWidth: 2,
      });
    } else {
      shape = new Circle({
        left: 100,
        top: 100,
        fill: '#e0e0e0',
        radius: 50,
        stroke: '#000000',
        strokeWidth: 2,
      });
    }

    fabricCanvas.add(shape);
    fabricCanvas.setActiveObject(shape);
    fabricCanvas.renderAll();
  };

  const deleteSelected = () => {
    if (!fabricCanvas || !selectedObject) return;

    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
    setSelectedObject(null);
  };

  const bringToFront = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.bringObjectToFront(selectedObject);
    fabricCanvas.renderAll();
  };

  const sendToBack = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.sendObjectToBack(selectedObject);
    fabricCanvas.renderAll();
  };

  const bringForward = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.bringObjectForward(selectedObject);
    fabricCanvas.renderAll();
  };

  const sendBackward = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.sendObjectBackwards(selectedObject);
    fabricCanvas.renderAll();
  };

  const generateNewBackground = async () => {
    if (!fabricCanvas || !aiPrompt.trim()) {
      toast({
        title: "Błąd",
        description: "Wprowadź opis stylu tła",
        variant: "destructive"
      });
      return;
    }

    setAiGenerating(true);

    try {
      toast({
        title: "Generowanie...",
        description: "AI tworzy nowe tło. To może potrwać kilka sekund.",
      });

      const { data, error } = await supabase.functions.invoke('generate-certificate-background', {
        body: { 
          prompt: aiPrompt,
          action: 'generate-background',
          format: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
          language: selectedLanguage
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Generation failed');

      let storedImageUrl = data.imageUrl;
      
      // Upload to storage if base64
      if (data.imageUrl.startsWith('data:')) {
        try {
          const base64Data = data.imageUrl.split(',')[1];
          const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          const blob = new Blob([byteArray], { type: 'image/png' });
          
          const fileName = `ai-bg-${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from('cms-images')
            .upload(`certificate-backgrounds/${fileName}`, blob);

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('cms-images')
              .getPublicUrl(`certificate-backgrounds/${fileName}`);
            storedImageUrl = urlData.publicUrl;
          }
        } catch (e) {
          console.log('Using base64 directly');
        }
      }

      // Remove existing background images
      const objects = fabricCanvas.getObjects();
      const bgImages = objects.filter(obj => obj.type === 'image' && obj.left === 0 && obj.top === 0);
      bgImages.forEach(img => fabricCanvas.remove(img));

      // Add new background
      const img = await FabricImage.fromURL(storedImageUrl);
      img.set({
        left: 0,
        top: 0,
        scaleX: CANVAS_WIDTH / (img.width || 1),
        scaleY: CANVAS_HEIGHT / (img.height || 1),
        selectable: true,
        evented: true
      });
      
      fabricCanvas.add(img);
      fabricCanvas.sendObjectToBack(img);
      fabricCanvas.renderAll();

      toast({
        title: "Sukces",
        description: "Nowe tło zostało wygenerowane!",
      });
    } catch (error) {
      console.error('Error generating background:', error);
      toast({
        title: "Błąd",
        description: error instanceof Error ? error.message : "Nie udało się wygenerować tła",
        variant: "destructive"
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const autoArrangePlaceholders = async () => {
    if (!fabricCanvas) return;

    setAutoArranging(true);

    try {
      // Find background image
      const objects = fabricCanvas.getObjects();
      const bgImage = objects.find(obj => 
        obj.type === 'image' && 
        obj.left === 0 && 
        obj.top === 0 &&
        ((obj.width || 0) * (obj.scaleX || 1)) >= CANVAS_WIDTH * 0.9
      );

      let imageUrl = '';
      if (bgImage) {
        imageUrl = (bgImage as any).getSrc?.() || '';
      }

      if (!imageUrl) {
        // Use default placements without AI analysis
        toast({
          title: "Info",
          description: "Brak obrazu tła do analizy. Używam domyślnego rozmieszczenia.",
        });
        
        applyDefaultPlacements();
        return;
      }

      toast({
        title: "Analizowanie...",
        description: "AI analizuje tło i oblicza optymalne pozycje.",
      });

      const { data, error } = await supabase.functions.invoke('generate-certificate-background', {
        body: { 
          action: 'analyze-and-arrange',
          imageUrl,
          format: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
          language: selectedLanguage
        }
      });

      if (error) throw error;

      const placements = data?.suggestedPlacements || [];
      
      if (placements.length === 0) {
        applyDefaultPlacements();
        return;
      }

      // Remove existing text elements
      const textObjects = objects.filter(obj => obj.type === 'i-text' || obj.type === 'text');
      textObjects.forEach(obj => fabricCanvas.remove(obj));

      // Add new text elements based on AI suggestions
      placements.forEach((placement: any, index: number) => {
        const text = new IText(placement.label || placement.placeholder, {
          left: placement.x,
          top: placement.y,
          fontSize: placement.fontSize || 20,
          fontWeight: placement.fontWeight || 'normal',
          fill: placement.color || '#000000',
          fontFamily: 'Arial',
          originX: 'center',
          originY: 'center'
        });
        fabricCanvas.add(text);
      });

      fabricCanvas.renderAll();

      toast({
        title: "Sukces",
        description: "Elementy zostały automatycznie rozmieszczone!",
      });
    } catch (error) {
      console.error('Error auto-arranging:', error);
      applyDefaultPlacements();
    } finally {
      setAutoArranging(false);
    }
  };

  const applyDefaultPlacements = () => {
    if (!fabricCanvas) return;

    const langConfig = CERTIFICATE_LANGUAGES.find(l => l.code === selectedLanguage) || CERTIFICATE_LANGUAGES[0];
    const labels = langConfig.labels;
    const centerX = Math.round(CANVAS_WIDTH / 2);

    const defaultPlacements = [
      { content: labels.title, x: centerX, y: Math.round(CANVAS_HEIGHT * 0.15), fontSize: Math.round(36 * (CANVAS_WIDTH / 842)), fontWeight: 'bold', color: '#1a1a2e' },
      { content: '{userName}', x: centerX, y: Math.round(CANVAS_HEIGHT * 0.40), fontSize: Math.round(28 * (CANVAS_WIDTH / 842)), fontWeight: 'bold', color: '#1a1a2e' },
      { content: '{moduleTitle}', x: centerX, y: Math.round(CANVAS_HEIGHT * 0.54), fontSize: Math.round(20 * (CANVAS_WIDTH / 842)), fontWeight: 'normal', color: '#333333' },
      { content: '{completionDate}', x: centerX, y: Math.round(CANVAS_HEIGHT * 0.82), fontSize: Math.round(14 * (CANVAS_WIDTH / 842)), fontWeight: 'normal', color: '#666666' }
    ];

    // Remove existing text elements
    const objects = fabricCanvas.getObjects();
    const textObjects = objects.filter(obj => obj.type === 'i-text' || obj.type === 'text');
    textObjects.forEach(obj => fabricCanvas.remove(obj));

    // Add default elements
    defaultPlacements.forEach((placement) => {
      const text = new IText(placement.content, {
        left: placement.x,
        top: placement.y,
        fontSize: placement.fontSize,
        fontWeight: placement.fontWeight as 'normal' | 'bold',
        fill: placement.color,
        fontFamily: 'Arial',
        originX: 'center',
        originY: 'center'
      });
      fabricCanvas.add(text);
    });

    fabricCanvas.renderAll();
    
    toast({
      title: "Gotowe",
      description: "Zastosowano domyślne rozmieszczenie elementów.",
    });
  };

  const handleSave = async () => {
    if (!fabricCanvas) return;

    const objects = fabricCanvas.getObjects();
    const elements: TemplateElement[] = objects.map((obj, index) => {
      if (obj.type === 'i-text' || obj.type === 'text') {
        const textObj = obj as IText;
        return {
          id: `element-${index}`,
          type: 'text' as const,
          content: textObj.text || '',
          x: textObj.left || 0,
          y: textObj.top || 0,
          fontSize: textObj.fontSize || 16,
          fontWeight: String(textObj.fontWeight || 'normal'),
          color: textObj.fill?.toString() || '#000000',
          align: 'left' as const,
        };
      } else if (obj.type === 'image') {
        const imgObj = obj as FabricImage;
        const imgSrc = (imgObj as any).getSrc();
        return {
          id: `element-${index}`,
          type: 'image' as const,
          imageUrl: imgSrc,
          x: obj.left || 0,
          y: obj.top || 0,
          width: (obj.width || 0) * (obj.scaleX || 1),
          height: (obj.height || 0) * (obj.scaleY || 1),
        };
      } else if (obj.type === 'rect') {
        return {
          id: `element-${index}`,
          type: 'shape' as const,
          x: obj.left || 0,
          y: obj.top || 0,
          width: (obj.width || 0) * (obj.scaleX || 1),
          height: (obj.height || 0) * (obj.scaleY || 1),
        };
      } else if (obj.type === 'circle') {
        const circleObj = obj as Circle;
        return {
          id: `element-${index}`,
          type: 'shape' as const,
          x: obj.left || 0,
          y: obj.top || 0,
          width: (circleObj.radius || 50) * 2 * (obj.scaleX || 1),
          height: (circleObj.radius || 50) * 2 * (obj.scaleY || 1),
        };
      }
      return {
        id: `element-${index}`,
        type: 'text' as const,
        x: obj.left || 0,
        y: obj.top || 0,
      };
    });

    await onSave({ elements });
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Toolbar */}
      <Card className="p-4 sticky top-0 z-10 bg-background shadow-md">
        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="add">Dodaj</TabsTrigger>
            <TabsTrigger value="edit" disabled={!selectedObject}>Edytuj</TabsTrigger>
            <TabsTrigger value="layers" disabled={!selectedObject}>Warstwy</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-1" />
              AI
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="add" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={addText} size="sm" variant="outline">
                <Type className="h-4 w-4 mr-2" />
                Dodaj tekst
              </Button>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                size="sm" 
                variant="outline"
                disabled={uploading}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {uploading ? 'Wysyłanie...' : 'Dodaj obraz'}
              </Button>
              <Button onClick={() => addShape('rectangle')} size="sm" variant="outline">
                <Square className="h-4 w-4 mr-2" />
                Dodaj prostokąt
              </Button>
              <Button onClick={() => addShape('circle')} size="sm" variant="outline">
                <CircleIcon className="h-4 w-4 mr-2" />
                Dodaj okrąg
              </Button>
            </div>

            {/* Text formatting options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="textColor">Kolor tekstu</Label>
                <Input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fontSize">Rozmiar czcionki</Label>
                <Input
                  id="fontSize"
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  min="8"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fontWeight">Pogrubienie</Label>
                <Select value={fontWeight} onValueChange={(val: 'normal' | 'bold') => setFontWeight(val)}>
                  <SelectTrigger id="fontWeight">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normalne</SelectItem>
                    <SelectItem value="bold">Pogrubione</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="space-y-4">
            {selectedObject && selectedObject.type === 'i-text' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editColor">Kolor tekstu</Label>
                    <Input
                      id="editColor"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editFontSize">Rozmiar czcionki</Label>
                    <Input
                      id="editFontSize"
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      min="8"
                      max="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editFontWeight">Pogrubienie</Label>
                    <Select value={fontWeight} onValueChange={(val: 'normal' | 'bold') => setFontWeight(val)}>
                      <SelectTrigger id="editFontWeight">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normalne</SelectItem>
                        <SelectItem value="bold">Pogrubione</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={updateSelectedText} size="sm" className="w-full sm:w-auto">
                  Zastosuj zmiany
                </Button>
              </>
            )}
            {selectedObject && (
              <Button onClick={deleteSelected} size="sm" variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń zaznaczony element
              </Button>
            )}
          </TabsContent>

          <TabsContent value="layers" className="space-y-4">
            {selectedObject && (
              <div className="space-y-2">
                <Label>Zarządzanie warstwami</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={bringToFront} size="sm" variant="outline" className="w-full">
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Na wierzch
                  </Button>
                  <Button onClick={sendToBack} size="sm" variant="outline" className="w-full">
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Na spód
                  </Button>
                  <Button onClick={bringForward} size="sm" variant="outline" className="w-full">
                    <MoveUp className="h-4 w-4 mr-2" />
                    W górę
                  </Button>
                  <Button onClick={sendBackward} size="sm" variant="outline" className="w-full">
                    <MoveDown className="h-4 w-4 mr-2" />
                    W dół
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Język etykiet</Label>
                <Select value={selectedLanguage} onValueChange={(v) => setSelectedLanguage(v as 'pl' | 'en' | 'de')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CERTIFICATE_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Generuj nowe tło AI</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Opisz styl tła certyfikatu..."
                  className="min-h-[60px]"
                />
              </div>
              
              <div className="flex flex-wrap gap-1">
                {AI_STYLE_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => setAiPrompt(preset.prompt)}
                    className="text-xs"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>

              <Button 
                onClick={generateNewBackground} 
                disabled={aiGenerating || !aiPrompt.trim()}
                className="w-full"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generowanie...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generuj nowe tło
                  </>
                )}
              </Button>

              <div className="border-t pt-3 mt-3">
                <Button 
                  onClick={autoArrangePlaceholders} 
                  disabled={autoArranging}
                  variant="secondary"
                  className="w-full"
                >
                  {autoArranging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analizowanie...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Auto-rozmieść elementy
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  AI przeanalizuje tło i zasugeruje optymalne pozycje dla tekstu
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Info card */}
      <Card className="p-4 bg-muted">
        <div className="flex justify-between items-start mb-2">
          <p className="text-sm text-muted-foreground">
            <strong>Dostępne zmienne:</strong> Możesz używać zmiennych w tekście, które zostaną automatycznie zastąpione danymi:
          </p>
          <Badge variant="outline" className="text-xs">
            {CANVAS_WIDTH}×{CANVAS_HEIGHT}px
          </Badge>
        </div>
        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
          <li><code>{'{userName}'}</code> - Imię i nazwisko użytkownika</li>
          <li><code>{'{moduleTitle}'}</code> - Tytuł modułu szkolenia</li>
          <li><code>{'{completionDate}'}</code> - Data ukończenia</li>
        </ul>
      </Card>

      {/* Canvas */}
      <div className="border rounded-lg overflow-auto bg-gray-50 p-2 sm:p-4">
        <div className="inline-block">
          <canvas ref={canvasRef} className="shadow-lg max-w-full h-auto" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sticky bottom-0 bg-background p-4 border-t">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Anuluj
        </Button>
        <Button onClick={handleSave} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          Zapisz szablon
        </Button>
      </div>
    </div>
  );
};

export default TemplateDndEditor;
