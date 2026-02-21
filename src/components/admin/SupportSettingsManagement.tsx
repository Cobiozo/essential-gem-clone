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
import { Loader2, Pencil, GripVertical, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { IconPicker } from '@/components/cms/IconPicker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Json } from '@/integrations/supabase/types';

// ========== Types ==========

interface CustomCard {
  id: string;
  icon: string;
  label: string;
  value: string;
  visible: boolean;
  position: number;
}

interface CustomFormField {
  id: string;
  label: string;
  placeholder: string;
  type: 'input' | 'textarea';
  required: boolean;
  position: number;
  width: 'half' | 'full';
}

interface CustomInfoBox {
  id: string;
  icon: string;
  title: string;
  content: string;
  visible: boolean;
  position: number;
}

interface SupportSettings {
  id: string;
  header_title: string;
  header_description: string;
  form_title: string;
  submit_button_text: string;
  success_message: string;
  error_message: string;
  is_active: boolean;
  custom_cards: CustomCard[];
  custom_form_fields: CustomFormField[];
  custom_info_boxes: CustomInfoBox[];
}

// ========== Helpers ==========

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} />;
};

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ========== Sortable Card ==========

const SortableCard: React.FC<{
  card: CustomCard;
  onUpdate: (card: CustomCard) => void;
  onDelete: () => void;
}> = ({ card, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group bg-card border rounded-lg shadow-sm transition-all flex-1 min-w-[140px]',
        isDragging && 'opacity-50 shadow-lg z-50',
        'hover:ring-2 hover:ring-primary/30',
        !card.visible && 'opacity-40 border-dashed'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded z-10"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="cursor-pointer p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <DynamicIcon name={card.icon} className="h-6 w-6 text-primary" />
              </div>
              {card.visible && (
                <h3 className="font-semibold text-sm text-foreground">{card.label}</h3>
              )}
              <p className="text-sm text-muted-foreground mt-1">{card.value || '(brak wartości)'}</p>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-1 bg-primary/10 rounded-full">
                <Pencil className="h-3 w-3 text-primary" />
              </div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="center">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Edycja karty</h4>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { onDelete(); setIsOpen(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Ikona</Label>
              <IconPicker
                value={card.icon}
                onChange={(name) => onUpdate({ ...card, icon: name || 'HelpCircle' })}
                trigger={
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <DynamicIcon name={card.icon} className="h-4 w-4" />
                    <span>{card.icon}</span>
                  </Button>
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Etykieta</Label>
              <Input value={card.label} onChange={(e) => onUpdate({ ...card, label: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Wartość</Label>
              <Input value={card.value} onChange={(e) => onUpdate({ ...card, value: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Pokaż kartę</Label>
              <Switch checked={card.visible} onCheckedChange={(v) => onUpdate({ ...card, visible: v })} />
            </div>
            <Button onClick={() => setIsOpen(false)} className="w-full">Zastosuj</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ========== Sortable Form Field ==========

const SortableFormField: React.FC<{
  field: CustomFormField;
  onUpdate: (field: CustomFormField) => void;
  onDelete: () => void;
}> = ({ field, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative cursor-pointer rounded-md p-2 transition-all hover:bg-muted/50 hover:ring-2 hover:ring-primary/30',
        isDragging && 'opacity-50 z-50',
        field.width === 'full' ? 'col-span-2' : 'col-span-1'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded z-10"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="space-y-2 pl-4">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            {field.type === 'textarea' ? (
              <Textarea placeholder={field.placeholder} disabled rows={3} className="pointer-events-none" />
            ) : (
              <Input placeholder={field.placeholder} disabled className="pointer-events-none" />
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-1 bg-primary/10 rounded-full">
                <Pencil className="h-3 w-3 text-primary" />
              </div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Edycja pola</h4>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { onDelete(); setIsOpen(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Etykieta</Label>
              <Input value={field.label} onChange={(e) => onUpdate({ ...field, label: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input value={field.placeholder} onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Typ pola</Label>
              <Select value={field.type} onValueChange={(v) => onUpdate({ ...field, type: v as 'input' | 'textarea' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="input">Pole tekstowe</SelectItem>
                  <SelectItem value="textarea">Obszar tekstowy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Szerokość</Label>
              <Select value={field.width} onValueChange={(v) => onUpdate({ ...field, width: v as 'half' | 'full' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="half">Połowa</SelectItem>
                  <SelectItem value="full">Cała szerokość</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Wymagane</Label>
              <Switch checked={field.required} onCheckedChange={(v) => onUpdate({ ...field, required: v })} />
            </div>
            <Button onClick={() => setIsOpen(false)} className="w-full">Zastosuj</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ========== Sortable Info Box ==========

const SortableInfoBox: React.FC<{
  box: CustomInfoBox;
  onUpdate: (box: CustomInfoBox) => void;
  onDelete: () => void;
}> = ({ box, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: box.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn('group relative', isDragging && 'opacity-50 z-50', !box.visible && 'opacity-40')}>
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded z-10"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="cursor-pointer rounded-md transition-all hover:ring-2 hover:ring-primary/30 pl-6">
            <div className="flex items-start gap-3 p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg">
              <DynamicIcon name={box.icon} className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-foreground">{box.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{box.content}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-1 bg-primary/10 rounded-full">
                <Pencil className="h-3 w-3 text-primary" />
              </div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Edycja boxu</h4>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { onDelete(); setIsOpen(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Ikona</Label>
              <IconPicker
                value={box.icon}
                onChange={(icon) => onUpdate({ ...box, icon: icon || 'Info' })}
                trigger={
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <DynamicIcon name={box.icon} className="h-4 w-4" />
                    <span>{box.icon}</span>
                  </Button>
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tytuł</Label>
              <Input value={box.title} onChange={(e) => onUpdate({ ...box, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Treść</Label>
              <Textarea value={box.content} onChange={(e) => onUpdate({ ...box, content: e.target.value })} rows={3} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Widoczny</Label>
              <Switch checked={box.visible} onCheckedChange={(v) => onUpdate({ ...box, visible: v })} />
            </div>
            <Button onClick={() => setIsOpen(false)} className="w-full">Zastosuj</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ========== Editable Text ==========

const EditableText: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  variant?: 'heading' | 'subheading' | 'text' | 'multiline';
  placeholder?: string;
}> = ({ label, value, onChange, variant = 'text', placeholder = 'Wprowadź tekst...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleChange = (v: string) => { setEditValue(v); onChange(v); };

  const variantStyles = {
    heading: 'text-2xl font-bold text-foreground',
    subheading: 'text-muted-foreground',
    text: 'text-sm',
    multiline: 'text-sm whitespace-pre-wrap',
  };

  return (
    <Popover open={isOpen} onOpenChange={(o) => { if (o) setEditValue(value); setIsOpen(o); }}>
      <PopoverTrigger asChild>
        <div className={cn('group relative cursor-pointer rounded-md p-2 -m-2 transition-all hover:bg-muted/50 hover:ring-2 hover:ring-primary/30')}>
          <p className={cn(variantStyles[variant], !value && 'text-muted-foreground italic')}>{value || placeholder}</p>
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-1 bg-primary/10 rounded-full"><Pencil className="h-3 w-3 text-primary" /></div>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <Label>{label}</Label>
          {variant === 'multiline' ? (
            <Textarea value={editValue} onChange={(e) => handleChange(e.target.value)} placeholder={placeholder} rows={4} />
          ) : (
            <Input value={editValue} onChange={(e) => handleChange(e.target.value)} placeholder={placeholder} />
          )}
          <Button onClick={() => setIsOpen(false)} className="w-full">Zastosuj</Button>
        </div>
      </PopoverContent>
    </Popover>
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
      const { data, error } = await supabase
        .from('support_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const customCards = Array.isArray(data.custom_cards) ? (data.custom_cards as unknown as CustomCard[]) : [];
        const customFormFields = Array.isArray(data.custom_form_fields) ? (data.custom_form_fields as unknown as CustomFormField[]) : [];
        const customInfoBoxes = Array.isArray(data.custom_info_boxes) ? (data.custom_info_boxes as unknown as CustomInfoBox[]) : [];

        setSettings({
          id: data.id,
          header_title: data.header_title || '',
          header_description: data.header_description || '',
          form_title: data.form_title || '',
          submit_button_text: data.submit_button_text || '',
          success_message: data.success_message || '',
          error_message: data.error_message || '',
          is_active: data.is_active ?? true,
          custom_cards: customCards.sort((a, b) => a.position - b.position),
          custom_form_fields: customFormFields.sort((a, b) => a.position - b.position),
          custom_info_boxes: customInfoBoxes.sort((a, b) => a.position - b.position),
        });
      } else {
        const { data: newData, error: insertError } = await supabase
          .from('support_settings')
          .insert({})
          .select()
          .single();
        if (insertError) throw insertError;
        setSettings({
          id: newData.id,
          header_title: '', header_description: '', form_title: '',
          submit_button_text: '', success_message: '', error_message: '',
          is_active: true,
          custom_cards: [], custom_form_fields: [], custom_info_boxes: [],
        });
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
          header_title: settings.header_title,
          header_description: settings.header_description,
          form_title: settings.form_title,
          submit_button_text: settings.submit_button_text,
          success_message: settings.success_message,
          error_message: settings.error_message,
          is_active: settings.is_active,
          custom_cards: settings.custom_cards as unknown as Json,
          custom_form_fields: settings.custom_form_fields as unknown as Json,
          custom_info_boxes: settings.custom_info_boxes as unknown as Json,
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

  // ========== Card operations ==========
  const addCard = () => {
    if (!settings) return;
    const newCard: CustomCard = {
      id: generateId('card'),
      icon: 'HelpCircle',
      label: 'Nowa karta',
      value: '',
      visible: true,
      position: settings.custom_cards.length,
    };
    setSettings({ ...settings, custom_cards: [...settings.custom_cards, newCard] });
  };

  const updateCard = (updated: CustomCard) => {
    if (!settings) return;
    setSettings({ ...settings, custom_cards: settings.custom_cards.map(c => c.id === updated.id ? updated : c) });
  };

  const deleteCard = (id: string) => {
    if (!settings) return;
    setSettings({ ...settings, custom_cards: settings.custom_cards.filter(c => c.id !== id).map((c, i) => ({ ...c, position: i })) });
  };

  const handleCardDragEnd = (event: DragEndEvent) => {
    if (!settings) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = settings.custom_cards.findIndex(c => c.id === active.id);
      const newIndex = settings.custom_cards.findIndex(c => c.id === over.id);
      const reordered = arrayMove(settings.custom_cards, oldIndex, newIndex).map((c, i) => ({ ...c, position: i }));
      setSettings({ ...settings, custom_cards: reordered });
    }
  };

  // ========== Form field operations ==========
  const addFormField = () => {
    if (!settings) return;
    const newField: CustomFormField = {
      id: generateId('field'),
      label: 'Nowe pole',
      placeholder: 'Wprowadź wartość...',
      type: 'input',
      required: false,
      position: settings.custom_form_fields.length,
      width: 'full',
    };
    setSettings({ ...settings, custom_form_fields: [...settings.custom_form_fields, newField] });
  };

  const updateFormField = (updated: CustomFormField) => {
    if (!settings) return;
    setSettings({ ...settings, custom_form_fields: settings.custom_form_fields.map(f => f.id === updated.id ? updated : f) });
  };

  const deleteFormField = (id: string) => {
    if (!settings) return;
    if (settings.custom_form_fields.length <= 1) { toast.error('Musi być co najmniej 1 pole'); return; }
    setSettings({ ...settings, custom_form_fields: settings.custom_form_fields.filter(f => f.id !== id).map((f, i) => ({ ...f, position: i })) });
  };

  const handleFieldDragEnd = (event: DragEndEvent) => {
    if (!settings) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = settings.custom_form_fields.findIndex(f => f.id === active.id);
      const newIndex = settings.custom_form_fields.findIndex(f => f.id === over.id);
      const reordered = arrayMove(settings.custom_form_fields, oldIndex, newIndex).map((f, i) => ({ ...f, position: i }));
      setSettings({ ...settings, custom_form_fields: reordered });
    }
  };

  // ========== Info box operations ==========
  const addInfoBox = () => {
    if (!settings) return;
    const newBox: CustomInfoBox = {
      id: generateId('box'),
      icon: 'Info',
      title: 'Nowy box',
      content: 'Treść informacji...',
      visible: true,
      position: settings.custom_info_boxes.length,
    };
    setSettings({ ...settings, custom_info_boxes: [...settings.custom_info_boxes, newBox] });
  };

  const updateInfoBox = (updated: CustomInfoBox) => {
    if (!settings) return;
    setSettings({ ...settings, custom_info_boxes: settings.custom_info_boxes.map(b => b.id === updated.id ? updated : b) });
  };

  const deleteInfoBox = (id: string) => {
    if (!settings) return;
    setSettings({ ...settings, custom_info_boxes: settings.custom_info_boxes.filter(b => b.id !== id).map((b, i) => ({ ...b, position: i })) });
  };

  const handleBoxDragEnd = (event: DragEndEvent) => {
    if (!settings) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = settings.custom_info_boxes.findIndex(b => b.id === active.id);
      const newIndex = settings.custom_info_boxes.findIndex(b => b.id === over.id);
      const reordered = arrayMove(settings.custom_info_boxes, oldIndex, newIndex).map((b, i) => ({ ...b, position: i }));
      setSettings({ ...settings, custom_info_boxes: reordered });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!settings) {
    return <div className="text-center py-12 text-muted-foreground">Nie znaleziono ustawień</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wsparcie i pomoc</h2>
          <p className="text-muted-foreground">Kliknij na element aby edytować • Przeciągnij aby zmienić kolejność</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {saveStatus === 'saving' && <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Zapisywanie...</span>}
          {saveStatus === 'saved' && <span className="flex items-center gap-1.5 text-primary"><Check className="h-4 w-4" />Zapisano</span>}
          {saveStatus === 'error' && <span className="flex items-center gap-1.5 text-destructive"><AlertCircle className="h-4 w-4" />Błąd zapisu</span>}
        </div>
      </div>

      {/* WYSIWYG Preview */}
      <Card className="border-2 border-dashed">
        <CardContent className="p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="text-center space-y-2">
              <EditableText label="Tytuł nagłówka" value={settings.header_title} onChange={(v) => setSettings({ ...settings, header_title: v })} variant="heading" placeholder="Wsparcie techniczne" />
              <EditableText label="Opis nagłówka" value={settings.header_description} onChange={(v) => setSettings({ ...settings, header_description: v })} variant="subheading" placeholder="Masz pytania? Skontaktuj się z naszym zespołem wsparcia." />
            </div>

            {/* Dynamic Cards */}
            <div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
                <SortableContext items={settings.custom_cards.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {settings.custom_cards.map((card) => (
                      <SortableCard key={card.id} card={card} onUpdate={updateCard} onDelete={() => deleteCard(card.id)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Button variant="outline" size="sm" className="mt-3 w-full border-dashed" onClick={addCard}>
                <Plus className="h-4 w-4 mr-2" /> Dodaj kartę
              </Button>
            </div>

            {/* Dynamic Info Boxes */}
            <div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBoxDragEnd}>
                <SortableContext items={settings.custom_info_boxes.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {settings.custom_info_boxes.map((box) => (
                      <SortableInfoBox key={box.id} box={box} onUpdate={updateInfoBox} onDelete={() => deleteInfoBox(box.id)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Button variant="outline" size="sm" className="mt-3 w-full border-dashed" onClick={addInfoBox}>
                <Plus className="h-4 w-4 mr-2" /> Dodaj box informacyjny
              </Button>
            </div>

            {/* Dynamic Form Fields */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <EditableText label="Tytuł formularza" value={settings.form_title} onChange={(v) => setSettings({ ...settings, form_title: v })} variant="heading" placeholder="Napisz do nas" />

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                  <SortableContext items={settings.custom_form_fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-2 gap-4">
                      {settings.custom_form_fields.map((field) => (
                        <SortableFormField key={field.id} field={field} onUpdate={updateFormField} onDelete={() => deleteFormField(field.id)} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addFormField}>
                  <Plus className="h-4 w-4 mr-2" /> Dodaj pole formularza
                </Button>

                {/* Submit button editor */}
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="group relative cursor-pointer rounded-md transition-all hover:ring-2 hover:ring-primary/30">
                      <Button className="w-full pointer-events-none">{settings.submit_button_text || 'Wyślij wiadomość'}</Button>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-1 bg-primary/10 rounded-full"><Pencil className="h-3 w-3 text-primary" /></div>
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tekst przycisku</Label>
                        <Input value={settings.submit_button_text} onChange={(e) => setSettings({ ...settings, submit_button_text: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Komunikat sukcesu</Label>
                        <Input value={settings.success_message} onChange={(e) => setSettings({ ...settings, success_message: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Komunikat błędu</Label>
                        <Input value={settings.error_message} onChange={(e) => setSettings({ ...settings, error_message: e.target.value })} />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportSettingsManagement;
