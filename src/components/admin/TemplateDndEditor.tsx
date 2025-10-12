import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, IText, Rect, Circle, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Square, Circle as CircleIcon, Save, Trash2, Image as ImageIcon, Upload, ArrowUp, ArrowDown, MoveUp, MoveDown } from 'lucide-react';
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

const TemplateDndEditor = ({ template, onSave, onClose }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(20);
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // A4 landscape dimensions at 72 DPI (standard for certificates)
  const CANVAS_WIDTH = 842;
  const CANVAS_HEIGHT = 595;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
    });

    setFabricCanvas(canvas);

    // Load existing template elements
    if (template.layout.elements) {
      template.layout.elements.forEach(async (element) => {
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
      });
    }

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
        return {
          id: `element-${index}`,
          type: 'image' as const,
          imageUrl: (imgObj as any).getSrc(),
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add">Dodaj</TabsTrigger>
            <TabsTrigger value="edit" disabled={!selectedObject}>Edytuj</TabsTrigger>
            <TabsTrigger value="layers" disabled={!selectedObject}>Warstwy</TabsTrigger>
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
        </Tabs>
      </Card>

      {/* Info card */}
      <Card className="p-4 bg-muted">
        <p className="text-sm text-muted-foreground mb-2">
          <strong>Dostępne zmienne:</strong> Możesz używać zmiennych w tekście, które zostaną automatycznie zastąpione danymi:
        </p>
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
