import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, ChevronDown, ChevronUp, Copy, Trash2, Plus,
  Heading as HeadingIcon, Type, Image as ImageIcon, Images, Video, FileDown,
  MousePointerClick, AlertCircle, Minus, Columns as ColumnsIcon, Table as TableIcon, Code2, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { RichTextEditor } from './RichTextEditor';
import { uploadNewsHubFile } from '@/hooks/useNewsHub';
import { toast } from 'sonner';
import {
  type NewsHubBlock, type NewsHubBlockType, type NewsHubBlockStyle,
  BLOCK_LABELS, createBlock, makeBlockId,
} from '@/types/newsHubBlocks';

const BLOCK_ICONS: Record<NewsHubBlockType, React.ComponentType<{ className?: string }>> = {
  heading: HeadingIcon,
  paragraph: Type,
  image: ImageIcon,
  gallery: Images,
  video: Video,
  file_download: FileDown,
  button_cta: MousePointerClick,
  callout: AlertCircle,
  divider: Minus,
  columns: ColumnsIcon,
  table: TableIcon,
  embed: Code2,
  legacy_html: FileText,
};

const ADDABLE_TYPES: NewsHubBlockType[] = [
  'heading', 'paragraph', 'image', 'gallery', 'video',
  'file_download', 'button_cta', 'callout', 'divider', 'columns', 'table', 'embed',
];

interface Props {
  value: NewsHubBlock[];
  onChange: (blocks: NewsHubBlock[]) => void;
}

export const BlockListEditor: React.FC<Props> = ({ value, onChange }) => {
  const blocks = value || [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const updateBlock = (id: string, patch: Partial<NewsHubBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };
  const updateData = (id: string, dataPatch: Record<string, any>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...dataPatch } } : b)));
  };
  const updateStyle = (id: string, stylePatch: NewsHubBlockStyle) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, style: { ...(b.style || {}), ...stylePatch } } : b)));
  };
  const removeBlock = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const copy = { ...blocks[idx], id: makeBlockId() };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };
  const addBlock = (type: NewsHubBlockType) => onChange([...blocks, createBlock(type)]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex((b) => b.id === active.id);
    const newIdx = blocks.findIndex((b) => b.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onChange(arrayMove(blocks, oldIdx, newIdx));
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Brak bloków. Dodaj pierwszy blok poniżej.
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((b) => (
            <BlockItem
              key={b.id}
              block={b}
              onChangeData={(p) => updateData(b.id, p)}
              onChangeStyle={(p) => updateStyle(b.id, p)}
              onChangeBlock={(p) => updateBlock(b.id, p)}
              onDelete={() => removeBlock(b.id)}
              onDuplicate={() => duplicateBlock(b.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full gap-2"><Plus className="h-4 w-4" /> Dodaj blok</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 max-h-[60vh] overflow-y-auto">
          {ADDABLE_TYPES.map((t) => {
            const Icon = BLOCK_ICONS[t];
            return (
              <DropdownMenuItem key={t} onClick={() => addBlock(t)} className="gap-2">
                <Icon className="h-4 w-4" /> {BLOCK_LABELS[t]}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

interface ItemProps {
  block: NewsHubBlock;
  onChangeData: (patch: Record<string, any>) => void;
  onChangeStyle: (patch: NewsHubBlockStyle) => void;
  onChangeBlock: (patch: Partial<NewsHubBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const BlockItem: React.FC<ItemProps> = ({ block, onChangeData, onChangeStyle, onChangeBlock, onDelete, onDuplicate }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [open, setOpen] = useState(true);
  const [showStyle, setShowStyle] = useState(false);
  const Icon = BLOCK_ICONS[block.type];

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={cn('rounded-lg border border-border bg-card', isDragging && 'ring-2 ring-primary')}>
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
        <button {...attributes} {...listeners} className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing" title="Przeciągnij">
          <GripVertical className="h-4 w-4" />
        </button>
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">{BLOCK_LABELS[block.type]}</span>
        <div className="ml-auto flex items-center">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowStyle((v) => !v)} title="Styl bloku">
            <span className={cn('text-[10px] font-bold', showStyle && 'text-primary')}>STYL</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplikuj"><Copy className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Usuń"><Trash2 className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen((v) => !v)} title={open ? 'Zwiń' : 'Rozwiń'}>
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="p-3 space-y-3">
          <BlockDataEditor block={block} onChangeData={onChangeData} onChangeBlock={onChangeBlock} />
          {showStyle && <BlockStyleEditor style={block.style || {}} onChange={onChangeStyle} />}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const BlockDataEditor: React.FC<{ block: NewsHubBlock; onChangeData: (p: Record<string, any>) => void; onChangeBlock: (p: Partial<NewsHubBlock>) => void }> = ({ block, onChangeData }) => {
  const d: any = block.data || {};

  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Poziom</Label>
              <Select value={String(d.level || 2)} onValueChange={(v) => onChangeData({ level: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                  <SelectItem value="4">H4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Wyrównanie</Label>
              <Select value={d.align || 'left'} onValueChange={(v) => onChangeData({ align: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Lewo</SelectItem>
                  <SelectItem value="center">Środek</SelectItem>
                  <SelectItem value="right">Prawo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Tekst</Label>
            <Input value={d.text || ''} onChange={(e) => onChangeData({ text: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Kolor</Label>
            <Input type="color" value={d.color || '#ffffff'} onChange={(e) => onChangeData({ color: e.target.value })} className="h-8 w-20 p-1" />
          </div>
        </div>
      );

    case 'paragraph':
      return <RichTextEditor value={d.html || ''} onChange={(html) => onChangeData({ html })} placeholder="Treść akapitu..." />;

    case 'image':
      return (
        <div className="space-y-2">
          <ImageUpload value={d.url} onChange={(url) => onChangeData({ url })} folder="media" />
          <Input placeholder="Opis (alt)" value={d.alt || ''} onChange={(e) => onChangeData({ alt: e.target.value })} />
          <Input placeholder="Podpis (opcjonalnie)" value={d.caption || ''} onChange={(e) => onChangeData({ caption: e.target.value })} />
          <Input placeholder="Link po kliknięciu (opcjonalnie)" value={d.href || ''} onChange={(e) => onChangeData({ href: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Dopasowanie</Label>
              <Select value={d.fit || 'cover'} onValueChange={(v) => onChangeData({ fit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Wypełnij</SelectItem>
                  <SelectItem value="contain">Dopasuj</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Wysokość (px)</Label>
              <Input type="number" placeholder="auto" value={d.height || ''} onChange={(e) => onChangeData({ height: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </div>
        </div>
      );

    case 'gallery':
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Kolumny</Label>
            <Select value={String(d.columns || 3)} onValueChange={(v) => onChangeData({ columns: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <GalleryUpload images={d.images || []} onChange={(imgs) => onChangeData({ images: imgs })} />
        </div>
      );

    case 'video':
      return (
        <div className="space-y-2">
          <FileUploadInput
            value={d.url}
            accept="video/*"
            label="Wgraj wideo"
            folder="media"
            kind="video"
            onChange={(url) => onChangeData({ url })}
          />
          <Input placeholder="...lub wklej URL YouTube / Vimeo / mp4" value={d.url || ''} onChange={(e) => onChangeData({ url: e.target.value })} />
          <Input placeholder="Podpis (opcjonalnie)" value={d.caption || ''} onChange={(e) => onChangeData({ caption: e.target.value })} />
        </div>
      );

    case 'file_download':
      return (
        <div className="space-y-2">
          <FileUploadInput value={d.url} fileName={d.name} onChange={(url, name, size) => onChangeData({ url, name, size })} />
          <Input placeholder="Nazwa pliku" value={d.name || ''} onChange={(e) => onChangeData({ name: e.target.value })} />
          <Input placeholder="Opis" value={d.description || ''} onChange={(e) => onChangeData({ description: e.target.value })} />
        </div>
      );

    case 'button_cta':
      return (
        <div className="space-y-2">
          <Input placeholder="Tekst" value={d.text || ''} onChange={(e) => onChangeData({ text: e.target.value })} />
          <Input placeholder="URL" value={d.url || ''} onChange={(e) => onChangeData({ url: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Wariant</Label>
              <Select value={d.variant || 'default'} onValueChange={(v) => onChangeData({ variant: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Wypełniony</SelectItem>
                  <SelectItem value="outline">Obrysowany</SelectItem>
                  <SelectItem value="secondary">Drugorzędny</SelectItem>
                  <SelectItem value="ghost">Tekst</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Wyrównanie</Label>
              <Select value={d.align || 'left'} onValueChange={(v) => onChangeData({ align: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Lewo</SelectItem>
                  <SelectItem value="center">Środek</SelectItem>
                  <SelectItem value="right">Prawo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );

    case 'callout':
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Wariant</Label>
            <Select value={d.variant || 'info'} onValueChange={(v) => onChangeData({ variant: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Sukces</SelectItem>
                <SelectItem value="warning">Ostrzeżenie</SelectItem>
                <SelectItem value="danger">Niebezpieczeństwo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Tytuł (opcjonalnie)" value={d.title || ''} onChange={(e) => onChangeData({ title: e.target.value })} />
          <Textarea placeholder="Treść" value={d.text || ''} onChange={(e) => onChangeData({ text: e.target.value })} rows={3} />
        </div>
      );

    case 'divider':
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Grubość (px)</Label>
            <Input type="number" value={d.thickness || 1} onChange={(e) => onChangeData({ thickness: Number(e.target.value) || 1 })} />
          </div>
          <div>
            <Label className="text-xs">Kolor</Label>
            <Input type="color" value={d.color || '#444444'} onChange={(e) => onChangeData({ color: e.target.value })} className="h-8 w-20 p-1" />
          </div>
        </div>
      );

    case 'columns':
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Układ kolumn</Label>
            <Select value={d.ratio || '1-1'} onValueChange={(v) => {
              const colsCount = v === '1-1-1' ? 3 : 2;
              const prev = Array.isArray(d.columns) ? d.columns : [];
              const next = Array.from({ length: colsCount }, (_, i) => prev[i] || []);
              onChangeData({ ratio: v, columns: next });
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1-1">2 równe</SelectItem>
                <SelectItem value="1-2">1 / 2</SelectItem>
                <SelectItem value="2-1">2 / 1</SelectItem>
                <SelectItem value="1-1-1">3 równe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            {(Array.isArray(d.columns) ? d.columns : []).map((col: NewsHubBlock[], i: number) => (
              <div key={i} className="rounded-md border border-dashed border-border p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Kolumna {i + 1}</div>
                <BlockListEditor value={col} onChange={(next) => {
                  const cols = [...(d.columns || [])];
                  cols[i] = next;
                  onChangeData({ columns: cols });
                }} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'table': {
      const rows: string[][] = Array.isArray(d.rows) ? d.rows : [];
      const cols = rows[0]?.length || 0;
      const setRows = (next: string[][]) => onChangeData({ rows: next });
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-2">
              <Switch checked={d.headerRow !== false} onCheckedChange={(v) => onChangeData({ headerRow: v })} />
              Pierwszy wiersz to nagłówek
            </Label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, ci) => (
                      <td key={ci} className="p-0.5">
                        <Input value={c} onChange={(e) => {
                          const next = rows.map((rr) => [...rr]);
                          next[ri][ci] = e.target.value;
                          setRows(next);
                        }} className="h-7 text-xs" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRows([...rows, Array(cols || 2).fill('')])}>+ Wiersz</Button>
            <Button size="sm" variant="outline" onClick={() => setRows(rows.map((r) => [...r, '']))}>+ Kolumna</Button>
            <Button size="sm" variant="ghost" className="text-destructive" disabled={rows.length <= 1} onClick={() => setRows(rows.slice(0, -1))}>− Wiersz</Button>
            <Button size="sm" variant="ghost" className="text-destructive" disabled={cols <= 1} onClick={() => setRows(rows.map((r) => r.slice(0, -1)))}>− Kolumna</Button>
          </div>
        </div>
      );
    }

    case 'embed':
      return (
        <Textarea placeholder="<iframe ...></iframe>" value={d.html || ''} onChange={(e) => onChangeData({ html: e.target.value })} rows={5} className="font-mono text-xs" />
      );

    case 'legacy_html':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Treść przeniesiona ze starego edytora. Możesz ją edytować jako HTML.</Label>
          <Textarea value={d.html || ''} onChange={(e) => onChangeData({ html: e.target.value })} rows={6} className="font-mono text-xs" />
        </div>
      );
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────

const BlockStyleEditor: React.FC<{ style: NewsHubBlockStyle; onChange: (p: NewsHubBlockStyle) => void }> = ({ style, onChange }) => (
  <div className="rounded-md border border-dashed border-border p-2 space-y-2 bg-muted/20">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Styl bloku</div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-xs">Margines góra</Label>
        <Input type="number" placeholder="0" value={style.mt ?? ''} onChange={(e) => onChange({ mt: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <Label className="text-xs">Margines dół</Label>
        <Input type="number" placeholder="0" value={style.mb ?? ''} onChange={(e) => onChange({ mb: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div className="col-span-2">
        <Label className="text-xs">Tło (CSS color/gradient)</Label>
        <Input placeholder="np. #1a1a2e lub linear-gradient(...)" value={style.bg || ''} onChange={(e) => onChange({ bg: e.target.value || undefined })} />
      </div>
      <div>
        <Label className="text-xs">Max szerokość (px)</Label>
        <Input type="number" placeholder="brak" value={style.maxWidth ?? ''} onChange={(e) => onChange({ maxWidth: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <Label className="text-xs">Zaokr. (px)</Label>
        <Input type="number" placeholder="0" value={style.radius ?? ''} onChange={(e) => onChange({ radius: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <Label className="text-xs">Padding X</Label>
        <Input type="number" placeholder="0" value={style.paddingX ?? ''} onChange={(e) => onChange({ paddingX: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <Label className="text-xs">Padding Y</Label>
        <Input type="number" placeholder="0" value={style.paddingY ?? ''} onChange={(e) => onChange({ paddingY: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
    </div>
    <div className="flex items-center gap-4 pt-1">
      <Label className="text-xs flex items-center gap-2">
        <Switch checked={!!style.hideMobile} onCheckedChange={(v) => onChange({ hideMobile: v })} /> Ukryj na mobile
      </Label>
      <Label className="text-xs flex items-center gap-2">
        <Switch checked={!!style.hideDesktop} onCheckedChange={(v) => onChange({ hideDesktop: v })} /> Ukryj na desktop
      </Label>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

const ImageUpload: React.FC<{ value?: string; onChange: (url: string) => void; folder?: 'media' | 'covers' | 'files' }> = ({ value, onChange, folder = 'media' }) => {
  const [uploading, setUploading] = useState(false);
  const handle = async (file: File) => {
    setUploading(true);
    const url = await uploadNewsHubFile(file, folder);
    setUploading(false);
    if (url) onChange(url);
    else toast.error('Błąd uploadu');
  };
  return (
    <div className="space-y-2">
      {value && <img src={value} alt="" className="h-20 w-full object-cover rounded-md border border-border" />}
      <div className="flex gap-2">
        <Input placeholder="URL obrazka" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        <Label className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-border bg-card hover:bg-muted cursor-pointer text-xs whitespace-nowrap">
          {uploading ? '...' : 'Wgraj'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
        </Label>
      </div>
    </div>
  );
};

const GalleryUpload: React.FC<{ images: string[]; onChange: (imgs: string[]) => void }> = ({ images, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const addFiles = async (files: FileList) => {
    setUploading(true);
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const url = await uploadNewsHubFile(f, 'media');
      if (url) urls.push(url);
    }
    setUploading(false);
    if (urls.length) onChange([...(images || []), ...urls]);
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border">
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center">×</button>
          </div>
        ))}
      </div>
      <Label className="inline-flex items-center justify-center w-full h-9 rounded-md border border-dashed border-border hover:bg-muted cursor-pointer text-xs">
        {uploading ? 'Wgrywanie...' : '+ Dodaj obrazki'}
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
      </Label>
    </div>
  );
};

const FileUploadInput: React.FC<{ value?: string; fileName?: string; accept?: string; label?: string; folder?: 'covers' | 'media' | 'files'; onChange: (url: string, name: string, size: number) => void }> = ({ value, accept, label, folder = 'files', onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const handle = async (file: File) => {
    setUploading(true);
    setPct(0);
    try {
      const url = await uploadNewsHubFile(file, folder, { onProgress: setPct });
      if (url) onChange(url, file.name, file.size);
      else toast.error('Błąd uploadu');
    } catch (err: any) {
      toast.error(err?.message || 'Błąd uploadu');
    } finally {
      setUploading(false);
      setPct(0);
    }
  };
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input placeholder="URL pliku" value={value || ''} readOnly className="text-xs" />
        <Label className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-border bg-card hover:bg-muted cursor-pointer text-xs whitespace-nowrap">
          {uploading ? (pct > 0 ? `${pct}%` : '...') : (label || 'Wgraj plik')}
          <input type="file" accept={accept} className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
        </Label>
      </div>
      {uploading && pct > 0 && (
        <div className="h-1 w-full bg-muted rounded overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
};
