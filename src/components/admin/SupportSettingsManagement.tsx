import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Pencil, GripVertical, Check, AlertCircle, Plus, Trash2, Eye, EyeOff, Type, AlignLeft, LayoutGrid, Info, FileText, MousePointer } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { IconPicker } from '@/components/cms/IconPicker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Json } from '@/integrations/supabase/types';

// ========== Types ==========

interface CardItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  visible: boolean;
  position: number;
}

interface FormFieldItem {
  id: string;
  label: string;
  placeholder: string;
  type: 'input' | 'textarea';
  required: boolean;
  position: number;
  width: 'half' | 'full';
}

interface BlockData {
  // heading
  text?: string;
  level?: 'h1' | 'h2' | 'h3';
  alignment?: 'left' | 'center' | 'right';
  // cards_group
  cards?: CardItem[];
  // info_box
  icon?: string;
  title?: string;
  content?: string;
  // form
  fields?: FormFieldItem[];
  submit_text?: string;
  success_msg?: string;
  error_msg?: string;
  // button
  url?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

interface SupportBlock {
  id: string;
  type: 'heading' | 'text' | 'cards_group' | 'info_box' | 'form' | 'button';
  position: number;
  visible: boolean;
  data: BlockData;
}

interface SupportSettings {
  id: string;
  is_active: boolean;
  custom_blocks: SupportBlock[];
}

// ========== Helpers ==========

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} />;
};

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const BLOCK_TYPE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  heading: { label: 'Nagłówek', icon: <Type className="h-4 w-4" /> },
  text: { label: 'Tekst / opis', icon: <AlignLeft className="h-4 w-4" /> },
  cards_group: { label: 'Karty kontaktowe', icon: <LayoutGrid className="h-4 w-4" /> },
  info_box: { label: 'Box informacyjny', icon: <Info className="h-4 w-4" /> },
  form: { label: 'Formularz', icon: <FileText className="h-4 w-4" /> },
  button: { label: 'Przycisk / link', icon: <MousePointer className="h-4 w-4" /> },
};

// ========== Sortable Card inside cards_group ==========

const SortableCardItem: React.FC<{
  card: CardItem;
  onUpdate: (card: CardItem) => void;
  onDelete: () => void;
}> = ({ card, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn('relative group bg-card border rounded-lg shadow-sm flex-1 min-w-[120px]', isDragging && 'opacity-50 z-50', !card.visible && 'opacity-40 border-dashed')}>
      <div {...attributes} {...listeners} className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded z-10">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="cursor-pointer p-3">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <DynamicIcon name={card.icon} className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-xs text-foreground">{card.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{card.value || '(brak)'}</p>
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-0.5 bg-primary/10 rounded-full"><Pencil className="h-2.5 w-2.5 text-primary" /></div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Edycja karty</h4>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { onDelete(); setIsOpen(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Ikona</Label>
              <IconPicker value={card.icon} onChange={(name) => onUpdate({ ...card, icon: name || 'HelpCircle' })} trigger={
                <Button variant="outline" className="w-full justify-start gap-2"><DynamicIcon name={card.icon} className="h-4 w-4" /><span>{card.icon}</span></Button>
              } />
            </div>
            <div className="space-y-1"><Label>Etykieta</Label><Input value={card.label} onChange={(e) => onUpdate({ ...card, label: e.target.value })} /></div>
            <div className="space-y-1"><Label>Wartość</Label><Input value={card.value} onChange={(e) => onUpdate({ ...card, value: e.target.value })} /></div>
            <div className="flex items-center justify-between"><Label>Widoczna</Label><Switch checked={card.visible} onCheckedChange={(v) => onUpdate({ ...card, visible: v })} /></div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ========== Sortable Form Field inside form block ==========

const SortableFormFieldItem: React.FC<{
  field: FormFieldItem;
  onUpdate: (field: FormFieldItem) => void;
  onDelete: () => void;
}> = ({ field, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn('group relative cursor-pointer rounded-md p-2 transition-all hover:bg-muted/50 hover:ring-2 hover:ring-primary/30', isDragging && 'opacity-50 z-50', field.width === 'full' ? 'col-span-2' : 'col-span-1')}>
      <div {...attributes} {...listeners} className="absolute left-0 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded z-10">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="space-y-2 pl-4">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            {field.type === 'textarea' ? <Textarea placeholder={field.placeholder} disabled rows={3} className="pointer-events-none" /> : <Input placeholder={field.placeholder} disabled className="pointer-events-none" />}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-1 bg-primary/10 rounded-full"><Pencil className="h-3 w-3 text-primary" /></div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Edycja pola</h4>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { onDelete(); setIsOpen(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1"><Label>Etykieta</Label><Input value={field.label} onChange={(e) => onUpdate({ ...field, label: e.target.value })} /></div>
            <div className="space-y-1"><Label>Placeholder</Label><Input value={field.placeholder} onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Typ</Label>
              <Select value={field.type} onValueChange={(v) => onUpdate({ ...field, type: v as 'input' | 'textarea' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="input">Pole tekstowe</SelectItem><SelectItem value="textarea">Obszar tekstowy</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Szerokość</Label>
              <Select value={field.width} onValueChange={(v) => onUpdate({ ...field, width: v as 'half' | 'full' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="half">Połowa</SelectItem><SelectItem value="full">Cała szerokość</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between"><Label>Wymagane</Label><Switch checked={field.required} onCheckedChange={(v) => onUpdate({ ...field, required: v })} /></div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ========== Block Editors ==========

const HeadingBlockEditor: React.FC<{ data: BlockData; onChange: (d: BlockData) => void }> = ({ data, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1"><Label>Tekst nagłówka</Label><Input value={data.text || ''} onChange={(e) => onChange({ ...data, text: e.target.value })} /></div>
    <div className="space-y-1">
      <Label>Poziom</Label>
      <Select value={data.level || 'h2'} onValueChange={(v) => onChange({ ...data, level: v as any })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="h1">H1 – Duży</SelectItem><SelectItem value="h2">H2 – Średni</SelectItem><SelectItem value="h3">H3 – Mały</SelectItem></SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label>Wyrównanie</Label>
      <Select value={data.alignment || 'left'} onValueChange={(v) => onChange({ ...data, alignment: v as any })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="left">Do lewej</SelectItem><SelectItem value="center">Wyśrodkowane</SelectItem><SelectItem value="right">Do prawej</SelectItem></SelectContent>
      </Select>
    </div>
  </div>
);

const TextBlockEditor: React.FC<{ data: BlockData; onChange: (d: BlockData) => void }> = ({ data, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1"><Label>Treść</Label><Textarea value={data.text || ''} onChange={(e) => onChange({ ...data, text: e.target.value })} rows={4} /></div>
    <div className="space-y-1">
      <Label>Wyrównanie</Label>
      <Select value={data.alignment || 'left'} onValueChange={(v) => onChange({ ...data, alignment: v as any })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="left">Do lewej</SelectItem><SelectItem value="center">Wyśrodkowane</SelectItem><SelectItem value="right">Do prawej</SelectItem></SelectContent>
      </Select>
    </div>
  </div>
);

const InfoBoxBlockEditor: React.FC<{ data: BlockData; onChange: (d: BlockData) => void }> = ({ data, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label>Ikona</Label>
      <IconPicker value={data.icon || 'Info'} onChange={(icon) => onChange({ ...data, icon: icon || 'Info' })} trigger={
        <Button variant="outline" className="w-full justify-start gap-2"><DynamicIcon name={data.icon || 'Info'} className="h-4 w-4" /><span>{data.icon || 'Info'}</span></Button>
      } />
    </div>
    <div className="space-y-1"><Label>Tytuł</Label><Input value={data.title || ''} onChange={(e) => onChange({ ...data, title: e.target.value })} /></div>
    <div className="space-y-1"><Label>Treść</Label><Textarea value={data.content || ''} onChange={(e) => onChange({ ...data, content: e.target.value })} rows={3} /></div>
  </div>
);

const ButtonBlockEditor: React.FC<{ data: BlockData; onChange: (d: BlockData) => void }> = ({ data, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1"><Label>Tekst</Label><Input value={data.text || ''} onChange={(e) => onChange({ ...data, text: e.target.value })} /></div>
    <div className="space-y-1"><Label>URL (opcjonalnie)</Label><Input value={data.url || ''} onChange={(e) => onChange({ ...data, url: e.target.value })} placeholder="https://..." /></div>
    <div className="space-y-1">
      <Label>Ikona</Label>
      <IconPicker value={data.icon || ''} onChange={(icon) => onChange({ ...data, icon: icon || '' })} trigger={
        <Button variant="outline" className="w-full justify-start gap-2">
          {data.icon ? <DynamicIcon name={data.icon} className="h-4 w-4" /> : null}
          <span>{data.icon || 'Brak ikony'}</span>
        </Button>
      } />
    </div>
    <div className="space-y-1">
      <Label>Wariant</Label>
      <Select value={data.variant || 'default'} onValueChange={(v) => onChange({ ...data, variant: v as any })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="default">Wypełniony</SelectItem><SelectItem value="outline">Obramowanie</SelectItem><SelectItem value="ghost">Ghost</SelectItem></SelectContent>
      </Select>
    </div>
  </div>
);

// ========== Sortable Block Wrapper ==========

const SortableBlock: React.FC<{
  block: SupportBlock;
  onUpdate: (block: SupportBlock) => void;
  onDelete: () => void;
  sensors: ReturnType<typeof useSensors>;
}> = ({ block, onUpdate, onDelete, sensors }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const updateData = (data: BlockData) => onUpdate({ ...block, data });
  const meta = BLOCK_TYPE_META[block.type];

  // Cards group: internal DnD for cards
  const handleCardDragEnd = (event: DragEndEvent) => {
    const cards = block.data.cards || [];
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex(c => c.id === active.id);
      const newIndex = cards.findIndex(c => c.id === over.id);
      const reordered = arrayMove(cards, oldIndex, newIndex).map((c, i) => ({ ...c, position: i }));
      updateData({ ...block.data, cards: reordered });
    }
  };

  const addCard = () => {
    const cards = block.data.cards || [];
    const newCard: CardItem = { id: generateId('card'), icon: 'HelpCircle', label: 'Nowa karta', value: '', visible: true, position: cards.length };
    updateData({ ...block.data, cards: [...cards, newCard] });
  };

  // Form block: internal DnD for fields
  const handleFieldDragEnd = (event: DragEndEvent) => {
    const fields = block.data.fields || [];
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id);
      const newIndex = fields.findIndex(f => f.id === over.id);
      const reordered = arrayMove(fields, oldIndex, newIndex).map((f, i) => ({ ...f, position: i }));
      updateData({ ...block.data, fields: reordered });
    }
  };

  const addFormField = () => {
    const fields = block.data.fields || [];
    const newField: FormFieldItem = { id: generateId('field'), label: 'Nowe pole', placeholder: 'Wprowadź wartość...', type: 'input', required: false, position: fields.length, width: 'full' };
    updateData({ ...block.data, fields: [...fields, newField] });
  };

  const renderBlockPreview = () => {
    switch (block.type) {
      case 'heading': {
        const level = block.data.level || 'h2';
        const align = block.data.alignment || 'left';
        const sizeClass = level === 'h1' ? 'text-3xl font-bold' : level === 'h2' ? 'text-2xl font-bold' : 'text-xl font-semibold';
        return <div className={cn(sizeClass, 'text-foreground', align === 'center' && 'text-center', align === 'right' && 'text-right')}>{block.data.text || 'Nagłówek...'}</div>;
      }
      case 'text': {
        const align = block.data.alignment || 'left';
        return <p className={cn('text-muted-foreground whitespace-pre-wrap', align === 'center' && 'text-center', align === 'right' && 'text-right')}>{block.data.text || 'Treść tekstu...'}</p>;
      }
      case 'cards_group': {
        const cards = block.data.cards || [];
        return (
          <div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
              <SortableContext items={cards.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {cards.map(card => (
                    <SortableCardItem key={card.id} card={card}
                      onUpdate={(updated) => updateData({ ...block.data, cards: cards.map(c => c.id === updated.id ? updated : c) })}
                      onDelete={() => updateData({ ...block.data, cards: cards.filter(c => c.id !== card.id).map((c, i) => ({ ...c, position: i })) })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <Button variant="outline" size="sm" className="mt-2 w-full border-dashed" onClick={addCard}>
              <Plus className="h-3 w-3 mr-1" /> Dodaj kartę
            </Button>
          </div>
        );
      }
      case 'info_box':
        return (
          <div className="flex items-start gap-3 p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg">
            <DynamicIcon name={block.data.icon || 'Info'} className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">{block.data.title || 'Tytuł'}</h4>
              <p className="text-sm text-muted-foreground mt-1">{block.data.content || 'Treść...'}</p>
            </div>
          </div>
        );
      case 'form': {
        const fields = block.data.fields || [];
        return (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Popover>
                <PopoverTrigger asChild>
                  <div className="group relative cursor-pointer rounded-md p-1 -m-1 hover:bg-muted/50 hover:ring-2 hover:ring-primary/30">
                    <h3 className="text-lg font-semibold">{block.data.title || 'Formularz'}</h3>
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-1 bg-primary/10 rounded-full"><Pencil className="h-3 w-3 text-primary" /></div>
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <div className="space-y-1"><Label>Tytuł formularza</Label><Input value={block.data.title || ''} onChange={(e) => updateData({ ...block.data, title: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Tekst przycisku</Label><Input value={block.data.submit_text || ''} onChange={(e) => updateData({ ...block.data, submit_text: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Komunikat sukcesu</Label><Input value={block.data.success_msg || ''} onChange={(e) => updateData({ ...block.data, success_msg: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Komunikat błędu</Label><Input value={block.data.error_msg || ''} onChange={(e) => updateData({ ...block.data, error_msg: e.target.value })} /></div>
                  </div>
                </PopoverContent>
              </Popover>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-2 gap-3">
                    {fields.map(field => (
                      <SortableFormFieldItem key={field.id} field={field}
                        onUpdate={(updated) => updateData({ ...block.data, fields: fields.map(f => f.id === updated.id ? updated : f) })}
                        onDelete={() => {
                          if (fields.length <= 1) { toast.error('Musi być co najmniej 1 pole'); return; }
                          updateData({ ...block.data, fields: fields.filter(f => f.id !== field.id).map((f, i) => ({ ...f, position: i })) });
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addFormField}>
                <Plus className="h-3 w-3 mr-1" /> Dodaj pole
              </Button>

              <Button className="w-full pointer-events-none">{block.data.submit_text || 'Wyślij'}</Button>
            </CardContent>
          </Card>
        );
      }
      case 'button': {
        const variant = block.data.variant || 'default';
        return (
          <div className="flex justify-center">
            <Button variant={variant as any} className="pointer-events-none">
              {block.data.icon && <DynamicIcon name={block.data.icon} className="h-4 w-4 mr-2" />}
              {block.data.text || 'Przycisk'}
            </Button>
          </div>
        );
      }
      default:
        return <div className="text-muted-foreground text-sm">Nieznany typ bloku</div>;
    }
  };

  // For cards_group and form, the preview handles its own editing inline
  const needsPopoverEditor = !['cards_group', 'form'].includes(block.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border bg-card p-4 transition-all',
        isDragging && 'opacity-50 shadow-lg z-50',
        !block.visible && 'opacity-40 border-dashed',
      )}
    >
      {/* Block toolbar */}
      <div className="absolute -top-3 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="flex items-center gap-1 bg-background border rounded-full px-2 py-0.5 shadow-sm text-xs text-muted-foreground">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 hover:text-foreground">
            <GripVertical className="h-3 w-3" />
          </div>
          <span>{meta?.label}</span>
          <button onClick={() => onUpdate({ ...block, visible: !block.visible })} className="p-0.5 hover:text-foreground">
            {block.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
          <button onClick={onDelete} className="p-0.5 hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {needsPopoverEditor ? (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="cursor-pointer rounded-md transition-all hover:ring-2 hover:ring-primary/30">
              {renderBlockPreview()}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">{meta?.label}</h4>
              {block.type === 'heading' && <HeadingBlockEditor data={block.data} onChange={updateData} />}
              {block.type === 'text' && <TextBlockEditor data={block.data} onChange={updateData} />}
              {block.type === 'info_box' && <InfoBoxBlockEditor data={block.data} onChange={updateData} />}
              {block.type === 'button' && <ButtonBlockEditor data={block.data} onChange={updateData} />}
              <Button onClick={() => setIsOpen(false)} className="w-full" size="sm">Zastosuj</Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        renderBlockPreview()
      )}
    </div>
  );
};

// ========== Main Component ==========

export const SupportSettingsManagement: React.FC = () => {
  const [settings, setSettings] = useState<SupportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('support_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;

      if (data) {
        const blocks = Array.isArray(data.custom_blocks) ? (data.custom_blocks as unknown as SupportBlock[]) : [];
        setSettings({
          id: data.id,
          is_active: data.is_active ?? true,
          custom_blocks: blocks.sort((a, b) => a.position - b.position),
        });
      } else {
        const { data: newData, error: insertError } = await supabase.from('support_settings').insert({}).select().single();
        if (insertError) throw insertError;
        setSettings({ id: newData.id, is_active: true, custom_blocks: [] });
      }
    } catch (error) {
      console.error('Error fetching support settings:', error);
      toast.error('Błąd podczas pobierania ustawień');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaveStatus('saving');
    try {
      const { data, error } = await supabase
        .from('support_settings')
        .update({
          custom_blocks: settings.custom_blocks as unknown as Json,
          is_active: settings.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setSaveStatus('error');
        toast.error('Nie udało się zapisać. Sprawdź czy jesteś zalogowany jako administrator.');
        return;
      }
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving support settings:', error);
      setSaveStatus('error');
      toast.error('Błąd podczas zapisywania ustawień');
    }
  }, [settings]);

  // Debounced auto-save
  useEffect(() => {
    if (isInitialLoad.current) { isInitialLoad.current = false; return; }
    if (!settings) return;
    setSaveStatus('idle');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => { handleSave(); }, 1000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [settings, handleSave]);

  // Block operations
  const addBlock = (type: SupportBlock['type']) => {
    if (!settings) return;
    const defaultData: Record<string, BlockData> = {
      heading: { text: 'Nowy nagłówek', level: 'h2', alignment: 'left' },
      text: { text: 'Nowy tekst...', alignment: 'left' },
      cards_group: { cards: [] },
      info_box: { icon: 'Info', title: 'Informacja', content: 'Treść...' },
      form: { title: 'Formularz', fields: [{ id: generateId('field'), label: 'Email', placeholder: 'jan@example.com', type: 'input', required: true, position: 0, width: 'full' }], submit_text: 'Wyślij', success_msg: 'Wysłano!', error_msg: 'Błąd wysyłania' },
      button: { text: 'Przycisk', url: '', icon: '', variant: 'default' },
    };
    const newBlock: SupportBlock = {
      id: generateId('block'),
      type,
      position: settings.custom_blocks.length,
      visible: true,
      data: defaultData[type] || {},
    };
    setSettings({ ...settings, custom_blocks: [...settings.custom_blocks, newBlock] });
  };

  const updateBlock = (updated: SupportBlock) => {
    if (!settings) return;
    setSettings({ ...settings, custom_blocks: settings.custom_blocks.map(b => b.id === updated.id ? updated : b) });
  };

  const deleteBlock = (id: string) => {
    if (!settings) return;
    setSettings({ ...settings, custom_blocks: settings.custom_blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, position: i })) });
  };

  const handleBlockDragEnd = (event: DragEndEvent) => {
    if (!settings) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = settings.custom_blocks.findIndex(b => b.id === active.id);
      const newIndex = settings.custom_blocks.findIndex(b => b.id === over.id);
      const reordered = arrayMove(settings.custom_blocks, oldIndex, newIndex).map((b, i) => ({ ...b, position: i }));
      setSettings({ ...settings, custom_blocks: reordered });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!settings) return <div className="text-center py-12 text-muted-foreground">Nie znaleziono ustawień</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wsparcie i pomoc</h2>
          <p className="text-muted-foreground text-sm">Kliknij na element aby edytować • Przeciągnij aby zmienić kolejność</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {saveStatus === 'saving' && <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Zapisywanie...</span>}
          {saveStatus === 'saved' && <span className="flex items-center gap-1.5 text-primary"><Check className="h-4 w-4" />Zapisano</span>}
          {saveStatus === 'error' && <span className="flex items-center gap-1.5 text-destructive"><AlertCircle className="h-4 w-4" />Błąd zapisu</span>}
        </div>
      </div>

      {/* Block Editor */}
      <Card className="border-2 border-dashed">
        <CardContent className="p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
              <SortableContext items={settings.custom_blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                {settings.custom_blocks.map(block => (
                  <SortableBlock key={block.id} block={block} sensors={sensors} onUpdate={updateBlock} onDelete={() => deleteBlock(block.id)} />
                ))}
              </SortableContext>
            </DndContext>

            {settings.custom_blocks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                Brak bloków. Dodaj pierwszy blok poniżej.
              </div>
            )}

            {/* Add block menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full border-dashed">
                  <Plus className="h-4 w-4 mr-2" /> Dodaj blok
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {Object.entries(BLOCK_TYPE_META).map(([type, meta]) => (
                  <DropdownMenuItem key={type} onClick={() => addBlock(type as SupportBlock['type'])}>
                    {meta.icon}
                    <span className="ml-2">{meta.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportSettingsManagement;
