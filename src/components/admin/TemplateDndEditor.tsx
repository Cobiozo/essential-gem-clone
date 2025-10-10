import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, IText, Rect, Circle } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Square, Circle as CircleIcon, Save, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'line' | 'shape';
  content?: string;
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
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
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
      template.layout.elements.forEach((element) => {
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

    return () => {
      canvas.dispose();
    };
  }, [template]);

  const addText = () => {
    if (!fabricCanvas) return;

    const text = new IText('Nowy tekst', {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: '#000000',
      fontFamily: 'Arial',
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
  };

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
      } else if (obj.type === 'rect') {
        return {
          id: `element-${index}`,
          type: 'shape' as const,
          x: obj.left || 0,
          y: obj.top || 0,
          width: obj.width || 0,
          height: obj.height || 0,
        };
      } else if (obj.type === 'circle') {
        return {
          id: `element-${index}`,
          type: 'shape' as const,
          x: obj.left || 0,
          y: obj.top || 0,
          width: (obj as any).radius * 2,
          height: (obj as any).radius * 2,
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
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={addText} size="sm" variant="outline">
            <Type className="h-4 w-4 mr-2" />
            Dodaj tekst
          </Button>
          <Button onClick={() => addShape('rectangle')} size="sm" variant="outline">
            <Square className="h-4 w-4 mr-2" />
            Dodaj prostokąt
          </Button>
          <Button onClick={() => addShape('circle')} size="sm" variant="outline">
            <CircleIcon className="h-4 w-4 mr-2" />
            Dodaj okrąg
          </Button>
          {selectedObject && (
            <Button onClick={deleteSelected} size="sm" variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Usuń
            </Button>
          )}
        </div>
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
      <div className="border rounded-lg overflow-auto bg-gray-50 p-4">
        <div className="inline-block">
          <canvas ref={canvasRef} className="shadow-lg" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Anuluj
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Zapisz szablon
        </Button>
      </div>
    </div>
  );
};

export default TemplateDndEditor;
