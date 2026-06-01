import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Save, Trash2, Eye, FileImage, GripVertical, Loader2, RotateCcw } from 'lucide-react';

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
  eventDate: 'Data rozpoczęcia',
  eventEndDate: 'Data zakończenia',
  eventLocation: 'Lokalizacja',
  firstName: 'Imię',
  lastName: 'Nazwisko',
  fullName: 'Imię i nazwisko',
  email: 'E-mail uczestnika',
  phone: 'Telefon uczestnika',
  ticketName: 'Nazwa biletu',
  ticketCode: 'Numer biletu',
  orderNumber: 'Numer zamówienia',
  seatNumber: 'Numer miejsca',
  qr: 'Kod QR',
};

const FIELD_DESCRIPTIONS: Record<string, string> = {
  eventTitle: 'Pełny tytuł wydarzenia',
  eventDate: 'Data i godzina rozpoczęcia (PL)',
  eventEndDate: 'Data i godzina zakończenia (PL)',
  eventLocation: 'Miasto / adres / online',
  firstName: 'Imię uczestnika z rezerwacji',
  lastName: 'Nazwisko uczestnika z rezerwacji',
  fullName: 'Imię + nazwisko w jednej linii',
  email: 'Adres e-mail z rezerwacji',
  phone: 'Numer telefonu z rezerwacji',
  ticketName: 'Nazwa rodzaju biletu',
  ticketCode: 'Unikalny kod biletu (np. EVJT5GJXJVYJ)',
  orderNumber: 'Identyfikator zamówienia',
  seatNumber: 'Numer miejsca (bilety grupowe)',
  qr: 'Kod QR z linkiem do weryfikacji biletu',
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
  const tplRef = useRef<TemplateState>(DEFAULT_TEMPLATE);
  useEffect(() => { tplRef.current = tpl; }, [tpl]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const persist = async (state: TemplateState) => {
    const payload = {
      event_id: eventId,
      background_url: state.background_url,
      page_format: state.page_format,
      orientation: state.orientation,
      width_px: state.width_px,
      height_px: state.height_px,
      fields: state.fields as any,
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
  };

  const onUpload = async (file: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      toast({ title: 'Nieobsługiwany format', description: 'Tylko PNG lub JPG', variant: 'destructive' }); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Plik za duży', description: 'Max 5MB', variant: 'destructive' }); return;
    }
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('eventId', eventId);
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-ticket-template-bg`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: fd,
        }
      );
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);
      const url: string = json.url;
      const img = new Image();
      img.onload = async () => {
        const next: TemplateState = {
          ...tplRef.current,
          background_url: url,
          width_px: img.naturalWidth || tplRef.current.width_px,
          height_px: img.naturalHeight || tplRef.current.height_px,
          orientation: (img.naturalWidth > img.naturalHeight) ? 'landscape' : 'portrait',
        };
        setTpl(next);
        try { await persist(next); } catch (e: any) {
          toast({ title: 'Zapis tła nie powiódł się', description: e.message, variant: 'destructive' });
        }
        toast({ title: 'Tło wgrane i zapisane' });
        onDataChange?.();
      };
      img.onerror = () => toast({ title: 'Nie udało się załadować obrazu', variant: 'destructive' });
      img.src = url;
    } catch (e: any) {
      toast({ title: 'Błąd uploadu', description: e.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await persist(tplRef.current);
      toast({ title: 'Szablon zapisany' });
      onDataChange?.();
    } catch (e: any) {
      toast({ title: 'Błąd zapisu', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const preview = async () => {
    try {
      await save();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-event-ticket-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ preview: true, eventId }),
      });
      const ct = resp.headers.get('content-type') || '';
      if (!resp.ok || !ct.includes('application/pdf')) {
        const txt = await resp.text();
        let msg = txt;
        try { msg = JSON.parse(txt).error || txt; } catch {}
        throw new Error(msg || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e: any) {
      toast({ title: 'Błąd podglądu PDF', description: e.message, variant: 'destructive' });
    }
  };

  // ---- Drag / resize (window-bound, no pointer capture) ----
  const beginDrag = (e: React.PointerEvent, key: string, mode: 'move' | 'resize') => {
    e.preventDefault(); e.stopPropagation();
    setSelectedField(key);
    const field = tplRef.current.fields.find((f) => f.key === key);
    if (!field || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = tplRef.current.width_px / rect.width;
    const scaleY = tplRef.current.height_px / rect.height;
    const startX = e.clientX, startY = e.clientY;
    const origX = field.x, origY = field.y;
    const origW = field.width || 200, origH = field.height || 200;

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) * scaleX;
      const dy = (ev.clientY - startY) * scaleY;
      setTpl((prev) => ({
        ...prev,
        fields: prev.fields.map((f) => {
          if (f.key !== key) return f;
          if (mode === 'move') {
            return { ...f, x: Math.max(0, Math.round(origX + dx)), y: Math.max(0, Math.round(origY + dy)) };
          }
          return { ...f, width: Math.max(40, Math.round(origW + dx)), height: Math.max(40, Math.round(origH + dy)) };
        }),
      }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

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
  const aspect = `${tpl.width_px} / ${tpl.height_px}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileImage className="w-4 h-4" />Tło biletu</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
          <Button size="sm" variant="outline" disabled={uploading}
            onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            Wgraj PNG/JPG (max 5MB)
          </Button>
          {tpl.background_url && (
            <p className="text-xs text-muted-foreground break-all">Aktualne tło: {tpl.background_url.split('/').pop()?.split('?')[0]}</p>
          )}
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
            onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedField(null); }}
            className="relative w-full border-2 border-dashed border-border bg-muted/30 select-none overflow-hidden touch-none"
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
                    onPointerDown={(e) => beginDrag(e, f.key, 'move')}
                    className={`absolute border-2 ${isSelected ? 'border-primary' : 'border-foreground/50'} bg-foreground/10 flex items-center justify-center cursor-move touch-none`}
                    style={{ left, top, width: w, height: h }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider">QR</span>
                    <div
                      onPointerDown={(e) => beginDrag(e, f.key, 'resize')}
                      className="absolute -right-1 -bottom-1 w-3 h-3 bg-primary cursor-nwse-resize touch-none"
                      title="Zmień rozmiar"
                    />
                  </div>
                );
              }
              return (
                <div key={f.key}
                  onPointerDown={(e) => beginDrag(e, f.key, 'move')}
                  className={`absolute cursor-move px-1 ${isSelected ? 'outline outline-2 outline-primary outline-offset-1' : 'outline outline-1 outline-foreground/30'} bg-background/40 whitespace-nowrap touch-none`}
                  style={{ left, top, fontSize: `${((f.fontSize || 14) / tpl.height_px) * 100}cqh`, color: f.color, fontWeight: f.fontWeight === 'bold' ? 700 : 400 }}>
                  {FIELD_LABELS[f.key] || f.key}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Kliknij pole, aby je zaznaczyć; przeciągnij, aby zmienić pozycję. QR ma uchwyt w prawym dolnym rogu do zmiany rozmiaru. Rozmiar płótna: {tpl.width_px}×{tpl.height_px} px.
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Legenda skrótów (auto-podstawiane dane)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-1 pr-3 font-medium">Klucz</th>
                  <th className="py-1 pr-3 font-medium">Pole</th>
                  <th className="py-1 pr-3 font-medium">Co podstawia system</th>
                  <th className="py-1 font-medium text-right">Akcja</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(FIELD_LABELS).map((k) => {
                  const onCanvas = tpl.fields.some((f) => f.key === k);
                  return (
                    <tr key={k} className="border-b last:border-b-0">
                      <td className="py-1.5 pr-3 font-mono text-foreground">{k}</td>
                      <td className="py-1.5 pr-3">{FIELD_LABELS[k]}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{FIELD_DESCRIPTIONS[k]}</td>
                      <td className="py-1.5 text-right">
                        {onCanvas ? (
                          <span className="text-muted-foreground">na płótnie</span>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => addField(k)}>+ Dodaj</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Wartości są podstawiane automatycznie przy generowaniu PDF biletu z danych zamówienia/wydarzenia.
          </p>
        </CardContent>
      </Card>

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
