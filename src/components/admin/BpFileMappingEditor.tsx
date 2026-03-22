import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, IText } from 'fabric';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from '@/hooks/use-toast';
import { VARIABLES_LEGEND, PREVIEW_PROFILE, resolveVariablesInText } from '@/lib/partnerVariables';
import {
  Save, Trash2, Type, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Eye, EyeOff,
  ChevronLeft, ChevronRight, Loader2, Plus, Variable
} from 'lucide-react';

interface MappingElement {
  id: string;
  type: 'text';
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: 'left' | 'center' | 'right';
  fontWeight: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  width?: number;
}

interface Props {
  file: {
    id: string;
    file_url: string;
    original_name: string;
    mime_type: string | null;
  };
  onClose: () => void;
}

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

const BpFileMappingEditor: React.FC<Props> = ({ file, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [containerScale, setContainerScale] = useState(1);

  // PDF state
  const isPdf = file.mime_type === 'application/pdf';
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected element properties
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [textDecoration, setTextDecoration] = useState<'none' | 'underline'>('none');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  const CANVAS_WIDTH = 842;
  const CANVAS_HEIGHT = 595;

  // Load PDF pages as images
  const loadPdfPages = useCallback(async (url: string) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);

      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push(canvas.toDataURL('image/png'));
      }
      setPdfPages(pages);
    } catch (err) {
      console.error('PDF load error:', err);
      toast({ title: 'Błąd ładowania PDF', variant: 'destructive' });
    }
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
    });

    setFabricCanvas(canvas);

    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      setSelectedObject(obj);
      syncPropertiesFromObject(obj);
    });
    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      setSelectedObject(obj);
      syncPropertiesFromObject(obj);
    });
    canvas.on('selection:cleared', () => setSelectedObject(null));

    return () => { canvas.dispose(); };
  }, []);

  // Sync UI properties from selected object
  const syncPropertiesFromObject = (obj: any) => {
    if (!obj || obj.type !== 'i-text') return;
    setTextColor(obj.fill?.toString() || '#000000');
    setFontSize(obj.fontSize || 24);
    setFontFamily(obj.fontFamily || 'Arial');
    setFontWeight(obj.fontWeight === 'bold' ? 'bold' : 'normal');
    setFontStyle(obj.fontStyle === 'italic' ? 'italic' : 'normal');
    setTextDecoration(obj.underline ? 'underline' : 'none');
    setTextAlign((obj.textAlign as any) || 'left');
  };

  // Load background image (for current page)
  const loadBackground = useCallback(async (canvas: FabricCanvas, imgUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Scale image to fit canvas while preserving aspect ratio
      const scaleX = CANVAS_WIDTH / img.width;
      const scaleY = CANVAS_HEIGHT / img.height;
      const scale = Math.min(scaleX, scaleY);

      const scaledW = img.width * scale;
      const scaledH = img.height * scale;

      // Create an offscreen canvas for the background
      const offCanvas = document.createElement('canvas');
      offCanvas.width = CANVAS_WIDTH;
      offCanvas.height = CANVAS_HEIGHT;
      const ctx = offCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, (CANVAS_WIDTH - scaledW) / 2, (CANVAS_HEIGHT - scaledH) / 2, scaledW, scaledH);

      canvas.set('backgroundImage', undefined);
      canvas.setDimensions({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

      import('fabric').then(({ FabricImage }) => {
        FabricImage.fromURL(offCanvas.toDataURL()).then((bgImg) => {
          bgImg.set({
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
            hasControls: false,
          });
          // Remove old background objects
          const oldBgs = canvas.getObjects().filter((o: any) => o._isBpBackground);
          oldBgs.forEach(o => canvas.remove(o));

          (bgImg as any)._isBpBackground = true;
          canvas.add(bgImg);
          // Move background to bottom
          const objects = canvas.getObjects();
          if (objects.length > 1) {
            canvas.sendObjectToBack(bgImg);
          }
          canvas.renderAll();
        });
      });
    };
    img.src = imgUrl;
  }, []);

  // Load PDF or image
  useEffect(() => {
    if (isPdf) {
      loadPdfPages(file.file_url);
    }
  }, [file.file_url, isPdf, loadPdfPages]);

  // When canvas is ready and background source is available, load it
  useEffect(() => {
    if (!fabricCanvas) return;
    setLoading(true);

    const bgUrl = isPdf ? pdfPages[currentPage] : file.file_url;
    if (!bgUrl) return;

    loadBackground(fabricCanvas, bgUrl).then(() => {
      loadMappingElements(fabricCanvas, currentPage);
    });
  }, [fabricCanvas, currentPage, pdfPages, isPdf, file.file_url, loadBackground]);

  // Load mapping elements from DB
  const loadMappingElements = async (canvas: FabricCanvas, pageIndex: number) => {
    const { data } = await supabase
      .from('bp_file_mappings')
      .select('elements')
      .eq('file_id', file.id)
      .eq('page_index', pageIndex)
      .maybeSingle();

    // Remove old text objects (keep background)
    const textObjs = canvas.getObjects().filter((o: any) => !o._isBpBackground);
    textObjs.forEach(o => canvas.remove(o));

    if (data?.elements && Array.isArray(data.elements)) {
      for (const el of data.elements as unknown as MappingElement[]) {
        if (el.type === 'text') {
          const displayContent = previewMode
            ? resolveVariablesInText(el.content, PREVIEW_PROFILE)
            : el.content;

          const text = new IText(displayContent, {
            left: el.x,
            top: el.y,
            fontSize: el.fontSize || 24,
            fontWeight: el.fontWeight || 'normal',
            fontStyle: (el.fontStyle as any) || 'normal',
            underline: el.textDecoration === 'underline',
            fill: el.color || '#000000',
            fontFamily: el.fontFamily || 'Arial',
            textAlign: el.align || 'left',
            width: el.width || 300,
          });
          (text as any)._mappingId = el.id;
          canvas.add(text);
        }
      }
    }

    canvas.renderAll();
    setLoading(false);
  };

  // Responsive scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const available = container.clientWidth - 32;
      setContainerScale(Math.min(available / CANVAS_WIDTH, 1));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // Collect elements from canvas
  const collectElements = (): MappingElement[] => {
    if (!fabricCanvas) return [];
    return fabricCanvas.getObjects()
      .filter((o: any) => !o._isBpBackground && (o.type === 'i-text' || o.type === 'text'))
      .map((obj, idx) => {
        const t = obj as IText;
        return {
          id: (t as any)._mappingId || `el-${Date.now()}-${idx}`,
          type: 'text' as const,
          content: t.text || '',
          x: Math.round(t.left || 0),
          y: Math.round(t.top || 0),
          fontSize: t.fontSize || 24,
          fontFamily: t.fontFamily || 'Arial',
          color: t.fill?.toString() || '#000000',
          align: (t.textAlign as 'left' | 'center' | 'right') || 'left',
          fontWeight: String(t.fontWeight || 'normal'),
          fontStyle: (t.fontStyle as 'normal' | 'italic') || 'normal',
          textDecoration: t.underline ? 'underline' as const : 'none' as const,
          width: Math.round((t.width || 300) * (t.scaleX || 1)),
        };
      });
  };

  // Save current page mapping
  const handleSave = async () => {
    setSaving(true);
    const elements = collectElements();

    const { error } = await supabase
      .from('bp_file_mappings')
      .upsert({
        file_id: file.id,
        page_index: currentPage,
        elements: elements as any,
      }, { onConflict: 'file_id,page_index' });

    setSaving(false);
    if (error) {
      toast({ title: 'Błąd zapisu', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Mapowanie zapisane' });
    }
  };

  // Add text element
  const addTextElement = (content: string = 'Tekst') => {
    if (!fabricCanvas) return;
    const text = new IText(content, {
      left: 100,
      top: 100,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      textAlign: 'left',
      width: 300,
    });
    (text as any)._mappingId = `el-${Date.now()}`;
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
  };

  // Insert variable as new text element
  const insertVariable = (variable: string) => {
    if (selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text')) {
      // Append variable to existing selected text
      const t = selectedObject as IText;
      t.set('text', (t.text || '') + variable);
      fabricCanvas?.renderAll();
    } else {
      addTextElement(variable);
    }
  };

  // Delete selected
  const handleDelete = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.remove(selectedObject);
    setSelectedObject(null);
    fabricCanvas.renderAll();
  };

  // Apply property to selected
  const applyProperty = (prop: string, value: any) => {
    if (!selectedObject || !fabricCanvas) return;
    if (prop === 'underline') {
      selectedObject.set('underline', value);
    } else {
      selectedObject.set(prop, value);
    }
    fabricCanvas.renderAll();
  };

  // Toggle preview mode
  const togglePreview = async () => {
    if (!fabricCanvas) return;
    const newMode = !previewMode;
    setPreviewMode(newMode);

    // Re-render elements with or without resolved variables
    const objects = fabricCanvas.getObjects().filter((o: any) => !o._isBpBackground);
    objects.forEach(obj => {
      if (obj.type === 'i-text' || obj.type === 'text') {
        const t = obj as IText;
        const currentText = t.text || '';
        if (newMode) {
          // Store original and show resolved
          (t as any)._originalContent = currentText;
          t.set('text', resolveVariablesInText(currentText, PREVIEW_PROFILE));
          t.set('editable', false);
        } else {
          // Restore original
          const original = (t as any)._originalContent;
          if (original !== undefined) {
            t.set('text', original);
            delete (t as any)._originalContent;
          }
          t.set('editable', true);
        }
      }
    });
    fabricCanvas.renderAll();
  };

  // Page navigation for PDF
  const goToPage = async (page: number) => {
    if (!fabricCanvas || page < 0 || page >= totalPages) return;
    // Save current page first
    await handleSave();
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30 flex-wrap shrink-0">
        <span className="text-sm font-medium text-foreground truncate max-w-[200px]" title={file.original_name}>
          {file.original_name}
        </span>

        <div className="h-5 w-px bg-border" />

        <Button size="sm" variant="outline" onClick={() => addTextElement()}>
          <Type className="w-4 h-4 mr-1" /> Tekst
        </Button>

        <Select onValueChange={(v) => insertVariable(v)}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Wstaw zmienną..." />
          </SelectTrigger>
          <SelectContent>
            {VARIABLES_LEGEND.map(v => (
              <SelectItem key={v.variable} value={v.variable}>
                <span className="flex items-center gap-1">
                  <Variable className="w-3 h-3" />
                  <code className="text-[10px]">{v.variable}</code>
                  <span className="text-muted-foreground text-[10px]">— {v.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-5 w-px bg-border" />

        <Button size="sm" variant={previewMode ? 'default' : 'outline'} onClick={togglePreview}>
          {previewMode ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
          {previewMode ? 'Edytuj' : 'Podgląd'}
        </Button>

        {selectedObject && (
          <Button size="sm" variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isPdf && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {currentPage + 1} / {totalPages}
              </span>
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage >= totalPages - 1} onClick={() => goToPage(currentPage + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          <Button size="sm" variant="action" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Zapisz
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 overflow-auto p-4 bg-muted/20 flex items-start justify-center">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <div style={{ transform: `scale(${containerScale})`, transformOrigin: 'top center' }}>
            <canvas ref={canvasRef} className="border border-border shadow-lg" />
          </div>
        </div>

        {/* Properties panel */}
        {selectedObject && !previewMode && (
          <div className="w-64 border-l border-border p-4 overflow-y-auto space-y-4 bg-background shrink-0">
            <h4 className="text-sm font-semibold text-foreground">Właściwości</h4>

            {/* Font Family */}
            <div className="space-y-1">
              <Label className="text-xs">Czcionka</Label>
              <Select value={fontFamily} onValueChange={(v) => { setFontFamily(v); applyProperty('fontFamily', v); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-1">
              <Label className="text-xs">Rozmiar</Label>
              <Input
                type="number"
                value={fontSize}
                onChange={e => { const v = Number(e.target.value); setFontSize(v); applyProperty('fontSize', v); }}
                className="h-8 text-xs"
                min={8}
                max={120}
              />
            </div>

            {/* Color */}
            <div className="space-y-1">
              <Label className="text-xs">Kolor</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={e => { setTextColor(e.target.value); applyProperty('fill', e.target.value); }}
                  className="w-8 h-8 rounded border border-input cursor-pointer"
                />
                <Input
                  value={textColor}
                  onChange={e => { setTextColor(e.target.value); applyProperty('fill', e.target.value); }}
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>

            {/* Style toggles */}
            <div className="space-y-1">
              <Label className="text-xs">Styl</Label>
              <ToggleGroup type="multiple" className="justify-start">
                <ToggleGroupItem
                  value="bold"
                  aria-label="Bold"
                  data-state={fontWeight === 'bold' ? 'on' : 'off'}
                  onClick={() => {
                    const nw = fontWeight === 'bold' ? 'normal' : 'bold';
                    setFontWeight(nw);
                    applyProperty('fontWeight', nw);
                  }}
                >
                  <Bold className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="italic"
                  aria-label="Italic"
                  data-state={fontStyle === 'italic' ? 'on' : 'off'}
                  onClick={() => {
                    const ns = fontStyle === 'italic' ? 'normal' : 'italic';
                    setFontStyle(ns);
                    applyProperty('fontStyle', ns);
                  }}
                >
                  <Italic className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="underline"
                  aria-label="Underline"
                  data-state={textDecoration === 'underline' ? 'on' : 'off'}
                  onClick={() => {
                    const nd = textDecoration === 'underline' ? 'none' : 'underline';
                    setTextDecoration(nd);
                    applyProperty('underline', nd === 'underline');
                  }}
                >
                  <Underline className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Alignment */}
            <div className="space-y-1">
              <Label className="text-xs">Wyrównanie</Label>
              <ToggleGroup
                type="single"
                value={textAlign}
                onValueChange={(v) => {
                  if (v) {
                    setTextAlign(v as any);
                    applyProperty('textAlign', v);
                  }
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="left" aria-label="Left"><AlignLeft className="w-4 h-4" /></ToggleGroupItem>
                <ToggleGroupItem value="center" aria-label="Center"><AlignCenter className="w-4 h-4" /></ToggleGroupItem>
                <ToggleGroupItem value="right" aria-label="Right"><AlignRight className="w-4 h-4" /></ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Quick variable insert */}
            <div className="space-y-1">
              <Label className="text-xs">Szybkie zmienne</Label>
              <div className="flex flex-wrap gap-1">
                {VARIABLES_LEGEND.slice(0, 6).map(v => (
                  <button
                    key={v.variable}
                    onClick={() => insertVariable(v.variable)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors font-mono"
                    title={v.label}
                  >
                    {v.variable}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BpFileMappingEditor;
