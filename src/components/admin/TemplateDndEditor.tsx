import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, IText, Rect, Circle, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Type, Square, Circle as CircleIcon, Save, Trash2, Image as ImageIcon, ArrowUp, ArrowDown, MoveUp, MoveDown, Sparkles, Loader2, Wand2, Lock, Unlock, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  // Nowe właściwości tekstu
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  lineHeight?: number;
  letterSpacing?: number;
  opacity?: number;
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

const AI_STYLE_PRESETS: Record<'pl' | 'en' | 'de', Array<{ name: string; prompt: string }>> = {
  pl: [
    { name: 'Elegancki', prompt: 'Elegancki certyfikat ze złotymi ozdobnymi ramkami, kremowe tło, subtelne motywy kwiatowe' },
    { name: 'Nowoczesny', prompt: 'Nowoczesny minimalistyczny certyfikat, czyste geometryczne kształty, niebieski gradient' },
    { name: 'Korporacyjny', prompt: 'Profesjonalny korporacyjny certyfikat, granatowy nagłówek, srebrne wykończenie' },
    { name: 'Naturalny', prompt: 'Certyfikat inspirowany naturą z akwarelowymi liśćmi, delikatne zielone tony' },
    { name: 'Klasyczny', prompt: 'Klasyczny dyplom, tekstura pergaminu, czerwona pieczęć z wstążką, tradycyjna ramka' },
  ],
  en: [
    { name: 'Elegant', prompt: 'Elegant certificate with gold ornamental borders, cream background, subtle floral patterns' },
    { name: 'Modern', prompt: 'Modern minimalist certificate, clean geometric shapes, blue gradient accent' },
    { name: 'Corporate', prompt: 'Professional corporate certificate, navy blue header, silver trim' },
    { name: 'Natural', prompt: 'Nature-inspired certificate with watercolor leaves, soft green tones' },
    { name: 'Classic', prompt: 'Classic diploma style, parchment texture, red ribbon seal, traditional frame' },
  ],
  de: [
    { name: 'Elegant', prompt: 'Elegantes Zertifikat mit goldenen Zierrahmen, cremefarbenem Hintergrund, dezenten Blumenmustern' },
    { name: 'Modern', prompt: 'Modernes minimalistisches Zertifikat, klare geometrische Formen, blauer Farbverlauf' },
    { name: 'Korporativ', prompt: 'Professionelles Firmenzertifikat, marineblaue Kopfzeile, silberne Verzierung' },
    { name: 'Natürlich', prompt: 'Naturinspiriertes Zertifikat mit Aquarellblättern, sanften Grüntönen' },
    { name: 'Klassisch', prompt: 'Klassisches Diplom, Pergamenttextur, rotes Bandsiegel, traditioneller Rahmen' },
  ],
};

const AI_UI_LABELS: Record<'pl' | 'en' | 'de', { 
  generateNewBg: string; 
  placeholder: string;
  generating: string;
  analyzing: string;
  autoArrange: string;
}> = {
  pl: {
    generateNewBg: 'Generuj nowe tło AI',
    placeholder: 'Opisz styl tła certyfikatu...',
    generating: 'Generowanie...',
    analyzing: 'Analizowanie...',
    autoArrange: 'Auto-rozmieść elementy',
  },
  en: {
    generateNewBg: 'Generate new AI background',
    placeholder: 'Describe the certificate background style...',
    generating: 'Generating...',
    analyzing: 'Analyzing...',
    autoArrange: 'Auto-arrange elements',
  },
  de: {
    generateNewBg: 'Neuen AI-Hintergrund generieren',
    placeholder: 'Beschreiben Sie den Zertifikat-Hintergrundstil...',
    generating: 'Wird generiert...',
    analyzing: 'Wird analysiert...',
    autoArrange: 'Elemente automatisch anordnen',
  },
};

const CERTIFICATE_LANGUAGES = [
  { code: 'pl', name: 'Polski', labels: { title: 'Certyfikat Ukończenia', userName: 'Imię i Nazwisko', moduleTitle: 'Tytuł Szkolenia', completionDate: 'Data ukończenia' } },
  { code: 'en', name: 'English', labels: { title: 'Certificate of Completion', userName: 'Full Name', moduleTitle: 'Training Title', completionDate: 'Completion Date' } },
  { code: 'de', name: 'Deutsch', labels: { title: 'Abschlusszertifikat', userName: 'Vollständiger Name', moduleTitle: 'Schulungstitel', completionDate: 'Abschlussdatum' } },
];

// Dostępne czcionki
const FONT_FAMILIES = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Palatino', label: 'Palatino' },
  { value: 'Garamond', label: 'Garamond' },
];

const TemplateDndEditor = ({ template, onSave, onClose }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(20);
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  // Nowe stany dla rozszerzonych opcji tekstu
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [textDecoration, setTextDecoration] = useState<'none' | 'underline'>('none');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [charSpacing, setCharSpacing] = useState(0);
  const [opacity, setOpacity] = useState(100);
  
  const [uploading, setUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [autoArranging, setAutoArranging] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'pl' | 'en' | 'de'>(template.layout.language || 'pl');
  const [backgroundLocked, setBackgroundLocked] = useState(true);
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
              fontFamily: element.fontFamily || 'Arial',
              fontStyle: element.fontStyle || 'normal',
              underline: element.textDecoration === 'underline',
              charSpacing: (element.letterSpacing || 0) * 10,
              opacity: (element.opacity ?? 100) / 100,
              textAlign: element.align || 'left',
            });
            canvas.add(text);
          } else if (element.type === 'image' && element.imageUrl) {
            try {
              const img = await FabricImage.fromURL(element.imageUrl);
              // Check if this is a background image (position 0,0 and covers most of canvas)
              const isBackground = element.x === 0 && element.y === 0 && 
                (element.width || 0) >= CANVAS_WIDTH * 0.9 && 
                (element.height || 0) >= CANVAS_HEIGHT * 0.9;
              
              img.set({
                left: element.x,
                top: element.y,
                scaleX: (element.width || 100) / (img.width || 1),
                scaleY: (element.height || 100) / (img.height || 1),
                selectable: !isBackground,
                evented: !isBackground,
                hasControls: !isBackground,
                hasBorders: !isBackground,
                lockMovementX: isBackground,
                lockMovementY: isBackground,
                hoverCursor: isBackground ? 'default' : 'move',
              });
              (img as any).isBackground = isBackground;
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
      fontFamily: fontFamily,
      fontStyle: fontStyle,
      underline: textDecoration === 'underline',
      charSpacing: charSpacing * 10,
      opacity: opacity / 100,
      textAlign: textAlign,
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
      fontFamily: fontFamily,
      fontStyle: fontStyle,
      underline: textDecoration === 'underline',
      charSpacing: charSpacing * 10,
      opacity: opacity / 100,
      textAlign: textAlign,
    });

    fabricCanvas?.renderAll();
  };

  useEffect(() => {
    if (selectedObject && selectedObject.type === 'i-text') {
      setTextColor(selectedObject.fill?.toString() || '#000000');
      setFontSize(selectedObject.fontSize || 20);
      setFontWeight(selectedObject.fontWeight === 'bold' ? 'bold' : 'normal');
      setFontFamily(selectedObject.fontFamily || 'Arial');
      setFontStyle(selectedObject.fontStyle === 'italic' ? 'italic' : 'normal');
      setTextDecoration(selectedObject.underline ? 'underline' : 'none');
      setCharSpacing(Math.round((selectedObject.charSpacing || 0) / 10));
      setOpacity(Math.round((selectedObject.opacity ?? 1) * 100));
      setTextAlign(selectedObject.textAlign || 'left');
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
    if ((selectedObject as any).isBackground && backgroundLocked) {
      toast({ title: "Info", description: "Tło jest zablokowane. Odblokuj je w zakładce AI." });
      return;
    }
    fabricCanvas.bringObjectToFront(selectedObject);
    fabricCanvas.renderAll();
  };

  const sendToBack = () => {
    if (!fabricCanvas || !selectedObject) return;
    if ((selectedObject as any).isBackground && backgroundLocked) {
      toast({ title: "Info", description: "Tło jest zablokowane. Odblokuj je w zakładce AI." });
      return;
    }
    fabricCanvas.sendObjectToBack(selectedObject);
    fabricCanvas.renderAll();
  };

  const bringForward = () => {
    if (!fabricCanvas || !selectedObject) return;
    if ((selectedObject as any).isBackground && backgroundLocked) {
      toast({ title: "Info", description: "Tło jest zablokowane. Odblokuj je w zakładce AI." });
      return;
    }
    fabricCanvas.bringObjectForward(selectedObject);
    fabricCanvas.renderAll();
  };

  const sendBackward = () => {
    if (!fabricCanvas || !selectedObject) return;
    if ((selectedObject as any).isBackground && backgroundLocked) {
      toast({ title: "Info", description: "Tło jest zablokowane. Odblokuj je w zakładce AI." });
      return;
    }
    fabricCanvas.sendObjectBackwards(selectedObject);
    fabricCanvas.renderAll();
  };

  const toggleBackgroundLock = () => {
    if (!fabricCanvas) return;
    const bgImage = fabricCanvas.getObjects().find(obj => (obj as any).isBackground);
    if (bgImage) {
      const newLocked = !backgroundLocked;
      bgImage.set({
        selectable: !newLocked,
        evented: !newLocked,
        hasControls: !newLocked,
        hasBorders: !newLocked,
        hoverCursor: newLocked ? 'default' : 'move',
      });
      setBackgroundLocked(newLocked);
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      toast({
        title: newLocked ? "Tło zablokowane" : "Tło odblokowane",
        description: newLocked ? "Tło jest teraz chronione przed edycją" : "Możesz teraz edytować tło",
      });
    } else {
      toast({ title: "Info", description: "Brak obrazu tła do zablokowania/odblokowania" });
    }
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

      // Add new background - locked by default
      const img = await FabricImage.fromURL(storedImageUrl);
      img.set({
        left: 0,
        top: 0,
        scaleX: CANVAS_WIDTH / (img.width || 1),
        scaleY: CANVAS_HEIGHT / (img.height || 1),
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        hoverCursor: 'default',
      });
      (img as any).isBackground = true;
      setBackgroundLocked(true);
      
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
      const clearZone = data?.clearZone;
      
      console.log('Received placements:', placements);
      console.log('Received clear zone:', clearZone);
      
      if (placements.length === 0) {
        applyDefaultPlacements();
        return;
      }

      // Validate and adjust X positions - use clear zone center if available
      const validateX = (x: number): number => {
        // Use clear zone center if available
        if (clearZone?.centerX) {
          return Math.round(clearZone.centerX);
        }
        
        // If x is too close to edges, use canvas center
        const minX = CANVAS_WIDTH * 0.15;
        const maxX = CANVAS_WIDTH * 0.85;
        if (x < minX || x > maxX) {
          console.log(`Correcting X from ${x} to center ${CANVAS_WIDTH / 2}`);
          return Math.round(CANVAS_WIDTH / 2);
        }
        return Math.round(x);
      };

      // Remove existing text elements
      const textObjects = objects.filter(obj => obj.type === 'i-text' || obj.type === 'text');
      textObjects.forEach(obj => fabricCanvas.remove(obj));

      // Add new text elements based on AI suggestions with validated positions
      placements.forEach((placement: any, index: number) => {
        const validatedX = validateX(placement.x);
        console.log(`Placement ${placement.placeholder}: original x=${placement.x}, validated x=${validatedX}`);
        
        const text = new IText(placement.label || placement.placeholder, {
          left: validatedX,
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
          align: (textObj.textAlign as 'left' | 'center' | 'right') || 'left',
          fontFamily: textObj.fontFamily || 'Arial',
          fontStyle: (textObj.fontStyle as 'normal' | 'italic') || 'normal',
          textDecoration: textObj.underline ? 'underline' : 'none',
          letterSpacing: Math.round((textObj.charSpacing || 0) / 10),
          opacity: Math.round((textObj.opacity ?? 1) * 100),
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

    await onSave({ 
      elements,
      format: template.layout.format,
      language: template.layout.language
    });
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Czcionka</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger id="fontFamily">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fontSize">Rozmiar</Label>
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
                <Label htmlFor="textColor">Kolor</Label>
                <Input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Styl</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={fontWeight === 'bold' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                    className="flex-1"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={fontStyle === 'italic' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                    className="flex-1"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={textDecoration === 'underline' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTextDecoration(textDecoration === 'underline' ? 'none' : 'underline')}
                    className="flex-1"
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Wyrównanie</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={textAlign === 'left' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTextAlign('left')}
                    className="flex-1"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={textAlign === 'center' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTextAlign('center')}
                    className="flex-1"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={textAlign === 'right' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTextAlign('right')}
                    className="flex-1"
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="charSpacing">Odstęp liter ({charSpacing})</Label>
                <Slider
                  id="charSpacing"
                  value={[charSpacing]}
                  onValueChange={(v) => setCharSpacing(v[0])}
                  min={-5}
                  max={30}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opacity">Przezroczystość ({opacity}%)</Label>
                <Slider
                  id="opacity"
                  value={[opacity]}
                  onValueChange={(v) => setOpacity(v[0])}
                  min={10}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="space-y-4">
            {selectedObject && selectedObject.type === 'i-text' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFontFamily">Czcionka</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger id="editFontFamily">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editFontSize">Rozmiar</Label>
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
                    <Label htmlFor="editColor">Kolor</Label>
                    <Input
                      id="editColor"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Styl</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={fontWeight === 'bold' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                        className="flex-1"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={fontStyle === 'italic' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                        className="flex-1"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={textDecoration === 'underline' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTextDecoration(textDecoration === 'underline' ? 'none' : 'underline')}
                        className="flex-1"
                      >
                        <Underline className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Wyrównanie</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={textAlign === 'left' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTextAlign('left')}
                        className="flex-1"
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={textAlign === 'center' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTextAlign('center')}
                        className="flex-1"
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={textAlign === 'right' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTextAlign('right')}
                        className="flex-1"
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editCharSpacing">Odstęp liter ({charSpacing})</Label>
                    <Slider
                      id="editCharSpacing"
                      value={[charSpacing]}
                      onValueChange={(v) => setCharSpacing(v[0])}
                      min={-5}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editOpacity">Przezroczystość ({opacity}%)</Label>
                    <Slider
                      id="editOpacity"
                      value={[opacity]}
                      onValueChange={(v) => setOpacity(v[0])}
                      min={10}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
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
                <Label>{AI_UI_LABELS[selectedLanguage].generateNewBg}</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={AI_UI_LABELS[selectedLanguage].placeholder}
                  className="min-h-[60px]"
                />
              </div>
              
              <div className="flex flex-wrap gap-1">
                {AI_STYLE_PRESETS[selectedLanguage].map((preset) => (
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
                    {AI_UI_LABELS[selectedLanguage].generating}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {AI_UI_LABELS[selectedLanguage].generateNewBg}
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
                      {AI_UI_LABELS[selectedLanguage].analyzing}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      {AI_UI_LABELS[selectedLanguage].autoArrange}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  AI przeanalizuje tło i zasugeruje optymalne pozycje dla tekstu
                </p>
              </div>

              <div className="border-t pt-3 mt-3">
                <Button 
                  onClick={toggleBackgroundLock} 
                  variant="outline"
                  className="w-full"
                >
                  {backgroundLocked ? (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      Odblokuj tło do edycji
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Zablokuj tło
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {backgroundLocked 
                    ? "Tło jest zablokowane - kliknij aby umożliwić jego edycję" 
                    : "Tło jest odblokowane - kliknij aby je zabezpieczyć"}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li><code>{'{userName}'}</code> - Pełne imię i nazwisko</li>
            <li><code>{'{firstName}'}</code> - Imię</li>
            <li><code>{'{lastName}'}</code> - Nazwisko</li>
            <li><code>{'{eqId}'}</code> - Numer EQID</li>
            <li><code>{'{email}'}</code> - Email użytkownika</li>
            <li><code>{'{city}'}</code> - Miasto</li>
          </ul>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li><code>{'{country}'}</code> - Kraj</li>
            <li><code>{'{moduleTitle}'}</code> - Tytuł szkolenia</li>
            <li><code>{'{completionDate}'}</code> - Data ukończenia</li>
            <li><code>{'{certificateNumber}'}</code> - Numer certyfikatu</li>
            <li><code>{'{currentYear}'}</code> - Bieżący rok</li>
            <li><code>{'{issueDate}'}</code> - Data wydania</li>
          </ul>
        </div>
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
