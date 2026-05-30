import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Save, Trash2, Eye, FileImage, GripVertical, Loader2, RotateCcw } from 'lucide-react';

const APP_URL = (import.meta.env.VITE_SUPABASE_URL as string).includes('localhost')
  ? 'http://localhost:5173' : 'https://purelife.lovable.app';

interface FieldDef {
  key: string;
  x: number; y: number;
  width?: number; height?: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
}

interface TemplateState {
  background_url: string | null;
  page_format: string;
  orientation: 'landscape' | 'portrait';
  width_px: number;
  height_px: number;
  fields: FieldDef[];
}

const FIELD_LABELS: Record<string, string> = {
  eventTitle: 'Tytuł wydarzenia',
  eventDate: 'Data',
  eventLocation: 'Lokalizacja',
  firstName: 'Imię',
  lastName: 'Nazwisko',
  ticketName: 'Nazwa biletu',
  ticketCode: 'Numer biletu',
  seatNumber: 'Numer miejsca',
  qr: 'Kod QR',
};

const DEFAULT_TEMPLATE: TemplateState = {
  background_url: null,
  page_format: 'A5',
  orientation: 'landscape',
  width_px: 1240,
  height_px: 874,
  fields: [
    { key: 'eventTitle', x: 60, y: 60, fontSize: 28, fontWeight: 'bold', color: '#111111' },
    { key: 'eventDate', x: 60, y: 110, fontSize: 14, color: '#444444' },
    { key: 'eventLocation', x: 60, y: 135, fontSize: 14, color: '#444444' },
    { key: 'firstName', x: 60, y: 320, fontSize: 22, fontWeight: 'bold', color: '#000000' },
    { key: 'lastName', x: 60, y: 360, fontSize: 22, fontWeight: 'bold', color: '#000000' },
    { key: 'ticketName', x: 60, y: 410, fontSize: 14, color: '#555555' },
    { key: 'ticketCode', x: 60, y: 440, fontSize: 12, color: '#888888' },
    { key: 'qr', x: 950, y: 320, width: 220, height: 220 },
  ],
};

interface Props { eventId: string; onDataChange?: () => void }

export const EventTicketTemplatePanel: React.FC<Props> = ({ eventId, onDataChange }) => {
  const { toast } = useToast();
  const [tpl, setTpl] = useState<TemplateState>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ key: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('event_ticket_templates').select('*').eq('event_id', eventId).maybeSingle();
      if (data) {
        setTpl({
          background_url: (data as any).background_url || null,
          page_format: (data as any).page_format || 'A5',
          orientation: ((data as any).orientation as any) || 'landscape',
          width_px: (data as any).width_px || 1240,
          height_px: (data as any).height_px || 874,
          fields: Array.isArray((data as any).fields) && (data as any).fields.length > 0
            ? (data as any).fields : DEFAULT_TEMPLATE.fields,
        });
      }
      setLoading(false);
    })();
  }, [eventId]);

  const onUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Plik za duży', description: 'Max 5MB', variant: 'destructive' }); return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `templates/${eventId}/bg.${ext}`;
      const { error: upErr } = await supabase.storage.from('event-tickets')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('event-tickets').getPublicUrl(path);
      // Bust cache so the preview shows the new image
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      // Get natural dimensions
      const img = new Image();
      img.onload = () => {
        setTpl((prev) => ({
          ...prev,
          background_url: url,
          width_px: img.naturalWidth || prev.width_px,
          height_px: img.naturalHeight || prev.height_px,
          orientation: (img.naturalWidth > img.naturalHeight) ? 'landscape' : 'portrait',
        }));
      };
      img.src = url;
      toast({ title: 'Tło wgrane' });
    } catch (e: any) {
      toast({ title: 'Błąd uploadu', description: e.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        event_id: eventId,
        background_url: tpl.background_url,
        page_format: tpl.page_format,
        orientation: tpl.orientation,
        width_px: tpl.width_px,
        height_px: tpl.height_px,
        fields: tpl.fields as any,
      };
      const { data: existing } = await supabase
        .from('event_ticket_templates').select('id').eq('event_id', eventId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('event_ticket_templates').update(payload).eq('event_id', eventId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('event_ticket_templates').insert(payload);
        if (error) throw error;
      }
      toast({ title: 'Szablon zapisany' });
      onDataChange?.();
    } catch (e: any) {
      toast({ title: 'Błąd zapisu', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const preview = async () => {
    try {
      await save();
      const { data, error } = await supabase.functions.invoke('generate-event-ticket-pdf', {
        body: { preview: true, eventId },
      });
      if (error) throw error;
      // Function returns binary PDF; invoke returns Blob in data when content-type pdf
      if (data instanceof Blob) {
        const url = URL.createObjectURL(data);
        window.open(url, '_blank');
      } else {
        // Fallback: open via direct fetch
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-event-ticket-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ preview: true, eventId }),
        });
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (e: any) {
      toast({ title: 'Błąd podglądu', description: e.message, variant: 'destructive' });
    }
  };

  const onPointerDown = (e: React.PointerEvent, key: string) => {
    e.preventDefault();
    const field = tpl.fields.find((f) => f.key === key);
    if (!field) return;
    setSelectedField(key);
    dragRef.current = { key, startX: e.clientX, startY: e.clientY, origX: field.x, origY: field.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = tpl.width_px / rect.width;
    const scaleY = tpl.height_px / rect.height;
    const dx = (e.clientX - d.startX) * scaleX;
    const dy = (e.clientY - d.startY) * scaleY;
    setTpl((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => f.key === d.key
        ? { ...f, x: Math.max(0, Math.round(d.origX + dx)), y: Math.max(0, Math.round(d.origY + dy)) }
        : f),
    }));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const updateField = (key: string, patch: Partial<FieldDef>) => {
    setTpl((prev) => ({ ...prev, fields: prev.fields.map((f) => f.key === key ? { ...f, ...patch } : f) }));
  };
  const removeField = (key: string) => setTpl((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.key !== key) }));
  const addField = (key: string) => {
    if (tpl.fields.some((f) => f.key === key)) return;
    const defaults: FieldDef = key === 'qr'
      ? { key, x: 100, y: 100, width: 200, height: 200 }
      : { key, x: 100, y: 100, fontSize: 16, color: '#000000' };
    setTpl((prev) => ({ ...prev, fields: [...prev.fields, defaults] }));
  };

  const resetTemplate = () => {
    if (!confirm('Przywrócić ustawienia domyślne?')) return;
    setTpl({ ...DEFAULT_TEMPLATE, background_url: tpl.background_url });
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  const selected = tpl.fields.find((f) => f.key === selectedField);
  const missingFields = Object.keys(FIELD_LABELS).filter((k) => !tpl.fields.some((f) => f.key === k));

  // Canvas display sized to container; preserve aspect ratio
  const aspect = `${tpl.width_px} / ${tpl.height_px}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileImage className="w-4 h-4" />Tło biletu</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="file" accept="image/png,image/jpeg" className="hidden"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            <Button asChild size="sm" variant="outline" disabled={uploading}>
              <span>{uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}Wgraj PNG/JPG (max 5MB)</span>
            </Button>
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Format</Label>
              <Select value={tpl.page_format} onValueChange={(v) => setTpl((p) => ({ ...p, page_format: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="A5">A5</SelectItem>
                  <SelectItem value="Letter">Letter</SelectItem>
                  <SelectItem value="ticket-105x148">Bilet 105×148mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Orientacja</Label>
              <Select value={tpl.orientation} onValueChange={(v: any) => setTpl((p) => ({ ...p, orientation: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Pozioma</SelectItem>
                  <SelectItem value="portrait">Pionowa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Płótno (px)</Label>
              <div className="flex gap-1">
                <Input className="h-9" type="number" value={tpl.width_px} onChange={(e) => setTpl((p) => ({ ...p, width_px: Number(e.target.value) || 1240 }))} />
                <Input className="h-9" type="number" value={tpl.height_px} onChange={(e) => setTpl((p) => ({ ...p, height_px: Number(e.target.value) || 874 }))} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Edytor pól (przeciągnij)</CardTitle>
          <Button size="sm" variant="ghost" onClick={resetTemplate}><RotateCcw className="w-4 h-4 mr-1" />Reset</Button>
        </CardHeader>
        <CardContent>
          <div
            ref={canvasRef}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="relative w-full border-2 border-dashed border-border bg-muted/30 select-none overflow-hidden"
            style={{ aspectRatio: aspect, backgroundImage: tpl.background_url ? `url(${tpl.background_url})` : undefined, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}
          >
            {tpl.fields.map((f) => {
              const left = `${(f.x / tpl.width_px) * 100}%`;
              const top = `${(f.y / tpl.height_px) * 100}%`;
              const isSelected = selectedField === f.key;
              if (f.key === 'qr') {
                const w = `${((f.width || 200) / tpl.width_px) * 100}%`;
                const h = `${((f.height || 200) / tpl.height_px) * 100}%`;
                return (
                  <div key={f.key}
                    onPointerDown={(e) => onPointerDown(e, f.key)}
                    className={`absolute border-2 ${isSelected ? 'border-primary' : 'border-foreground/50'} bg-foreground/10 flex items-center justify-center cursor-move`}
                    style={{ left, top, width: w, height: h }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider">QR</span>
                  </div>
                );
              }
              return (
                <div key={f.key}
                  onPointerDown={(e) => onPointerDown(e, f.key)}
                  className={`absolute cursor-move px-1 ${isSelected ? 'outline outline-2 outline-primary outline-offset-1' : 'outline outline-1 outline-foreground/30'} bg-background/40 whitespace-nowrap`}
                  style={{ left, top, fontSize: `${((f.fontSize || 14) / tpl.height_px) * 100}cqh`, color: f.color, fontWeight: f.fontWeight === 'bold' ? 700 : 400 }}>
                  {FIELD_LABELS[f.key] || f.key}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Przeciągnij pole na podgląd. Pozycje są w pikselach względem rozmiaru płótna ({tpl.width_px}×{tpl.height_px}).
          </p>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><GripVertical className="w-4 h-4" />{FIELD_LABELS[selected.key] || selected.key}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => { removeField(selected.key); setSelectedField(null); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">X</Label><Input type="number" value={selected.x} onChange={(e) => updateField(selected.key, { x: Number(e.target.value) })} className="h-8" /></div>
              <div><Label className="text-xs">Y</Label><Input type="number" value={selected.y} onChange={(e) => updateField(selected.key, { y: Number(e.target.value) })} className="h-8" /></div>
              {selected.key === 'qr' ? (
                <>
                  <div><Label className="text-xs">Szerokość</Label><Input type="number" value={selected.width || 200} onChange={(e) => updateField(selected.key, { width: Number(e.target.value) })} className="h-8" /></div>
                  <div><Label className="text-xs">Wysokość</Label><Input type="number" value={selected.height || 200} onChange={(e) => updateField(selected.key, { height: Number(e.target.value) })} className="h-8" /></div>
                </>
              ) : (
                <>
                  <div><Label className="text-xs">Rozmiar</Label><Input type="number" value={selected.fontSize || 14} onChange={(e) => updateField(selected.key, { fontSize: Number(e.target.value) })} className="h-8" /></div>
                  <div><Label className="text-xs">Kolor</Label><Input type="color" value={selected.color || '#000000'} onChange={(e) => updateField(selected.key, { color: e.target.value })} className="h-8 p-1" /></div>
                  <div className="col-span-2"><Label className="text-xs">Waga</Label>
                    <Select value={selected.fontWeight || 'normal'} onValueChange={(v: any) => updateField(selected.key, { fontWeight: v })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="normal">Normalna</SelectItem><SelectItem value="bold">Pogrubiona</SelectItem></SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {missingFields.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Dodaj pole</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {missingFields.map((k) => (
              <Button key={k} size="sm" variant="outline" onClick={() => addField(k)}>+ {FIELD_LABELS[k]}</Button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 sticky bottom-0 bg-background/95 backdrop-blur p-3 border-t -mx-4">
        <Button onClick={save} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Zapisz szablon
        </Button>
        <Button onClick={preview} variant="outline" disabled={saving}>
          <Eye className="w-4 h-4 mr-1" />Podgląd PDF
        </Button>
      </div>
    </div>
  );
};

export default EventTicketTemplatePanel;
