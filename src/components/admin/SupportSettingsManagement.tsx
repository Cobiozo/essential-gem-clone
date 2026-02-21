import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Pencil, GripVertical, Info, Check, AlertCircle } from 'lucide-react';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Json } from '@/integrations/supabase/types';

interface SupportSettings {
  id: string;
  header_title: string;
  header_description: string;
  email_address: string;
  email_label: string;
  email_icon: string;
  phone_number: string;
  phone_label: string;
  phone_icon: string;
  working_hours: string;
  working_hours_label: string;
  working_hours_icon: string;
  info_box_title: string;
  info_box_content: string;
  info_box_icon: string;
  form_title: string;
  name_label: string;
  name_placeholder: string;
  email_field_label: string;
  email_placeholder: string;
  subject_label: string;
  subject_placeholder: string;
  message_label: string;
  message_placeholder: string;
  submit_button_text: string;
  success_message: string;
  error_message: string;
  is_active: boolean;
  // New fields
  email_label_visible: boolean;
  phone_label_visible: boolean;
  working_hours_label_visible: boolean;
  cards_order: string[];
}

// Dynamic icon rendering
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} />;
};

// Sortable Info Card Component
interface SortableInfoCardProps {
  id: string;
  iconName: string;
  label: string;
  value: string;
  labelVisible: boolean;
  onUpdate: (data: {
    iconName?: string;
    label?: string;
    value?: string;
    labelVisible?: boolean;
  }) => void;
}

const SortableInfoCard: React.FC<SortableInfoCardProps> = ({
  id,
  iconName,
  label,
  value,
  labelVisible,
  onUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editIconName, setEditIconName] = useState(iconName);
  const [editLabel, setEditLabel] = useState(label);
  const [editValue, setEditValue] = useState(value);
  const [editLabelVisible, setEditLabelVisible] = useState(labelVisible);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFieldChange = (updates: Partial<{ iconName: string; label: string; value: string; labelVisible: boolean }>) => {
    const newIconName = updates.iconName ?? editIconName;
    const newLabel = updates.label ?? editLabel;
    const newValue = updates.value ?? editValue;
    const newLabelVisible = updates.labelVisible ?? editLabelVisible;
    if (updates.iconName !== undefined) setEditIconName(newIconName);
    if (updates.label !== undefined) setEditLabel(newLabel);
    if (updates.value !== undefined) setEditValue(newValue);
    if (updates.labelVisible !== undefined) setEditLabelVisible(newLabelVisible);
    onUpdate({ iconName: newIconName, label: newLabel, value: newValue, labelVisible: newLabelVisible });
  };

  const handleApply = () => {
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEditIconName(iconName);
      setEditLabel(label);
      setEditValue(value);
      setEditLabelVisible(labelVisible);
    }
    setIsOpen(open);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group bg-card border rounded-lg shadow-sm transition-all flex-1',
        isDragging && 'opacity-50 shadow-lg z-50',
        'hover:ring-2 hover:ring-primary/30',
        !labelVisible && 'opacity-40 border-dashed'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded z-10"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Card content */}
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <div className="cursor-pointer p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <DynamicIcon name={iconName} className="h-6 w-6 text-primary" />
              </div>
              {labelVisible && (
                <h3 className="font-semibold text-sm text-foreground">
                  {label}
                </h3>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {value || '(brak wartości)'}
              </p>
            </div>
            
            {/* Edit indicator */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-1 bg-primary/10 rounded-full">
                <Pencil className="h-3 w-3 text-primary" />
              </div>
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-80" align="center">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Edycja karty</h4>
            
            <div className="space-y-2">
              <Label>Ikona</Label>
              <IconPicker
                value={editIconName}
                onChange={(name) => handleFieldChange({ iconName: name || 'HelpCircle' })}
                trigger={
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <DynamicIcon name={editIconName} className="h-4 w-4" />
                    <span>{editIconName}</span>
                  </Button>
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Etykieta</Label>
              <Input
                value={editLabel}
                onChange={(e) => handleFieldChange({ label: e.target.value })}
                placeholder="Np. E-mail"
              />
            </div>

            <div className="space-y-2">
              <Label>Wartość</Label>
              <Input
                value={editValue}
                onChange={(e) => handleFieldChange({ value: e.target.value })}
                placeholder="Np. support@example.com"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor={`label-visible-${id}`}>Pokaż kartę</Label>
              <Switch
                id={`label-visible-${id}`}
                checked={editLabelVisible}
                onCheckedChange={(checked) => handleFieldChange({ labelVisible: checked })}
              />
            </div>

            <Button onClick={handleApply} className="w-full">
              Zastosuj
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Editable Text Element Component
interface EditableTextProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  variant?: 'heading' | 'subheading' | 'text' | 'multiline';
  placeholder?: string;
}

const EditableText: React.FC<EditableTextProps> = ({
  label,
  value,
  onChange,
  variant = 'text',
  placeholder = 'Wprowadź tekst...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleChange = (newValue: string) => {
    setEditValue(newValue);
    onChange(newValue);
  };

  const handleApply = () => {
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEditValue(value);
    }
    setIsOpen(open);
  };

  const variantStyles = {
    heading: 'text-2xl font-bold text-foreground',
    subheading: 'text-muted-foreground',
    text: 'text-sm',
    multiline: 'text-sm whitespace-pre-wrap',
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'group relative cursor-pointer rounded-md p-2 -m-2 transition-all',
            'hover:bg-muted/50 hover:ring-2 hover:ring-primary/30'
          )}
        >
          <p className={cn(variantStyles[variant], !value && 'text-muted-foreground italic')}>
            {value || placeholder}
          </p>
          
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-1 bg-primary/10 rounded-full">
              <Pencil className="h-3 w-3 text-primary" />
            </div>
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <Label>{label}</Label>
          
          {variant === 'multiline' ? (
            <Textarea
              value={editValue}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder}
              rows={4}
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder}
            />
          )}

          <Button onClick={handleApply} className="w-full">
            Zastosuj
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Editable Form Field Component
interface EditableFormFieldProps {
  fieldLabel: string;
  fieldPlaceholder: string;
  onLabelChange: (value: string) => void;
  onPlaceholderChange: (value: string) => void;
  type?: 'input' | 'textarea';
}

const EditableFormField: React.FC<EditableFormFieldProps> = ({
  fieldLabel,
  fieldPlaceholder,
  onLabelChange,
  onPlaceholderChange,
  type = 'input',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editLabel, setEditLabel] = useState(fieldLabel);
  const [editPlaceholder, setEditPlaceholder] = useState(fieldPlaceholder);

  const handleLabelChange = (newValue: string) => {
    setEditLabel(newValue);
    onLabelChange(newValue);
  };

  const handlePlaceholderChange = (newValue: string) => {
    setEditPlaceholder(newValue);
    onPlaceholderChange(newValue);
  };

  const handleApply = () => {
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEditLabel(fieldLabel);
      setEditPlaceholder(fieldPlaceholder);
    }
    setIsOpen(open);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className="space-y-2 group relative cursor-pointer rounded-md p-2 -m-2 transition-all hover:bg-muted/50 hover:ring-2 hover:ring-primary/30">
          <Label>{fieldLabel}</Label>
          {type === 'input' ? (
            <Input placeholder={fieldPlaceholder} disabled className="pointer-events-none" />
          ) : (
            <Textarea placeholder={fieldPlaceholder} disabled rows={3} className="pointer-events-none" />
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
          <div className="space-y-2">
            <Label>Etykieta pola</Label>
            <Input
              value={editLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={editPlaceholder}
              onChange={(e) => handlePlaceholderChange(e.target.value)}
            />
          </div>
          <Button onClick={handleApply} className="w-full">
            Zastosuj
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Main Component
export const SupportSettingsManagement: React.FC = () => {
  const [settings, setSettings] = useState<SupportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('support_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Parse cards_order from Json to string[]
        const cardsOrder = Array.isArray(data.cards_order) 
          ? data.cards_order as string[]
          : ['email', 'phone', 'working_hours'];
        
        setSettings({
          ...data,
          email_label_visible: data.email_label_visible ?? true,
          phone_label_visible: data.phone_label_visible ?? true,
          working_hours_label_visible: data.working_hours_label_visible ?? true,
          cards_order: cardsOrder,
        } as SupportSettings);
      } else {
        const { data: newData, error: insertError } = await supabase
          .from('support_settings')
          .insert({})
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        const cardsOrder = Array.isArray(newData.cards_order) 
          ? newData.cards_order as string[]
          : ['email', 'phone', 'working_hours'];
        
        setSettings({
          ...newData,
          email_label_visible: newData.email_label_visible ?? true,
          phone_label_visible: newData.phone_label_visible ?? true,
          working_hours_label_visible: newData.working_hours_label_visible ?? true,
          cards_order: cardsOrder,
        } as SupportSettings);
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

    setSaving(true);
    setSaveStatus('saving');
    try {
      const { data, error } = await supabase
        .from('support_settings')
        .update({
          header_title: settings.header_title,
          header_description: settings.header_description,
          email_address: settings.email_address,
          email_label: settings.email_label,
          email_icon: settings.email_icon,
          phone_number: settings.phone_number,
          phone_label: settings.phone_label,
          phone_icon: settings.phone_icon,
          working_hours: settings.working_hours,
          working_hours_label: settings.working_hours_label,
          working_hours_icon: settings.working_hours_icon,
          info_box_title: settings.info_box_title,
          info_box_content: settings.info_box_content,
          info_box_icon: settings.info_box_icon,
          form_title: settings.form_title,
          name_label: settings.name_label,
          name_placeholder: settings.name_placeholder,
          email_field_label: settings.email_field_label,
          email_placeholder: settings.email_placeholder,
          subject_label: settings.subject_label,
          subject_placeholder: settings.subject_placeholder,
          message_label: settings.message_label,
          message_placeholder: settings.message_placeholder,
          submit_button_text: settings.submit_button_text,
          success_message: settings.success_message,
          error_message: settings.error_message,
          is_active: settings.is_active,
          email_label_visible: settings.email_label_visible,
          phone_label_visible: settings.phone_label_visible,
          working_hours_label_visible: settings.working_hours_label_visible,
          cards_order: settings.cards_order as unknown as Json,
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
    } finally {
      setSaving(false);
    }
  }, [settings]);

  // Debounced auto-save
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (!settings) return;

    setSaveStatus('idle');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings, handleSave]);

  const updateField = <K extends keyof SupportSettings>(field: K, value: SupportSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = settings?.cards_order.indexOf(active.id as string) ?? -1;
      const newIndex = settings?.cards_order.indexOf(over.id as string) ?? -1;

      if (oldIndex !== -1 && newIndex !== -1 && settings) {
        const newOrder = arrayMove(settings.cards_order, oldIndex, newIndex);
        updateField('cards_order', newOrder);
      }
    }
  };

  const getCardData = (cardId: string) => {
    if (!settings) return null;
    
    switch (cardId) {
      case 'email':
        return {
          iconName: settings.email_icon || 'Mail',
          label: settings.email_label || 'Email',
          value: settings.email_address || '',
          labelVisible: settings.email_label_visible,
          onUpdate: (data: any) => {
            if (data.iconName !== undefined) updateField('email_icon', data.iconName);
            if (data.label !== undefined) updateField('email_label', data.label);
            if (data.value !== undefined) updateField('email_address', data.value);
            if (data.labelVisible !== undefined) updateField('email_label_visible', data.labelVisible);
          },
        };
      case 'phone':
        return {
          iconName: settings.phone_icon || 'Phone',
          label: settings.phone_label || 'Telefon',
          value: settings.phone_number || '',
          labelVisible: settings.phone_label_visible,
          onUpdate: (data: any) => {
            if (data.iconName !== undefined) updateField('phone_icon', data.iconName);
            if (data.label !== undefined) updateField('phone_label', data.label);
            if (data.value !== undefined) updateField('phone_number', data.value);
            if (data.labelVisible !== undefined) updateField('phone_label_visible', data.labelVisible);
          },
        };
      case 'working_hours':
        return {
          iconName: settings.working_hours_icon || 'Clock',
          label: settings.working_hours_label || 'Godziny pracy',
          value: settings.working_hours || '',
          labelVisible: settings.working_hours_label_visible,
          onUpdate: (data: any) => {
            if (data.iconName !== undefined) updateField('working_hours_icon', data.iconName);
            if (data.label !== undefined) updateField('working_hours_label', data.label);
            if (data.value !== undefined) updateField('working_hours', data.value);
            if (data.labelVisible !== undefined) updateField('working_hours_label_visible', data.labelVisible);
          },
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nie znaleziono ustawień
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wsparcie i pomoc</h2>
          <p className="text-muted-foreground">
            Kliknij na element aby edytować • Przeciągnij karty aby zmienić kolejność
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Zapisywanie...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-green-600">
              <Check className="h-4 w-4" />
              Zapisano
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Błąd zapisu
            </span>
          )}
        </div>
      </div>

      {/* WYSIWYG Preview */}
      <Card className="border-2 border-dashed">
        <CardContent className="p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="text-center space-y-2">
              <EditableText
                label="Tytuł nagłówka"
                value={settings.header_title}
                onChange={(v) => updateField('header_title', v)}
                variant="heading"
                placeholder="Wsparcie techniczne"
              />
              <EditableText
                label="Opis nagłówka"
                value={settings.header_description}
                onChange={(v) => updateField('header_description', v)}
                variant="subheading"
                placeholder="Masz pytania? Skontaktuj się z naszym zespołem wsparcia."
              />
            </div>

            {/* Info Cards - Sortable */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={settings.cards_order}
                strategy={horizontalListSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {settings.cards_order.map((cardId) => {
                    const cardData = getCardData(cardId);
                    if (!cardData) return null;
                    
                    return (
                      <SortableInfoCard
                        key={cardId}
                        id={cardId}
                        {...cardData}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {/* Info Box */}
            <Popover>
              <PopoverTrigger asChild>
                <div className="group relative cursor-pointer rounded-md transition-all hover:ring-2 hover:ring-primary/30">
                  <div className="flex items-start gap-3 p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg">
                    <DynamicIcon name={settings.info_box_icon || 'Clock'} className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">
                        {settings.info_box_title || 'Informacja'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {settings.info_box_content || 'W przypadku dużej ilości zgłoszeń odpowiedź może potrwać do 24h.'}
                      </p>
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
                  <h4 className="font-medium text-sm">Edycja boxu informacyjnego</h4>
                  <div className="space-y-2">
                    <Label>Ikona</Label>
                    <IconPicker
                      value={settings.info_box_icon}
                      onChange={(icon) => updateField('info_box_icon', icon || 'Info')}
                      trigger={
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <DynamicIcon name={settings.info_box_icon || 'Info'} className="h-4 w-4" />
                          <span>{settings.info_box_icon || 'Info'}</span>
                        </Button>
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tytuł</Label>
                    <Input
                      value={settings.info_box_title}
                      onChange={(e) => updateField('info_box_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Treść</Label>
                    <Textarea
                      value={settings.info_box_content}
                      onChange={(e) => updateField('info_box_content', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Contact Form Preview */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <EditableText
                  label="Tytuł formularza"
                  value={settings.form_title}
                  onChange={(v) => updateField('form_title', v)}
                  variant="heading"
                  placeholder="Napisz do nas"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableFormField
                    fieldLabel={settings.name_label || 'Imię i nazwisko'}
                    fieldPlaceholder={settings.name_placeholder || 'Jan Kowalski'}
                    onLabelChange={(v) => updateField('name_label', v)}
                    onPlaceholderChange={(v) => updateField('name_placeholder', v)}
                  />
                  <EditableFormField
                    fieldLabel={settings.email_field_label || 'Email'}
                    fieldPlaceholder={settings.email_placeholder || 'jan@example.com'}
                    onLabelChange={(v) => updateField('email_field_label', v)}
                    onPlaceholderChange={(v) => updateField('email_placeholder', v)}
                  />
                </div>

                <EditableFormField
                  fieldLabel={settings.subject_label || 'Temat'}
                  fieldPlaceholder={settings.subject_placeholder || 'W czym możemy pomóc?'}
                  onLabelChange={(v) => updateField('subject_label', v)}
                  onPlaceholderChange={(v) => updateField('subject_placeholder', v)}
                />

                <EditableFormField
                  fieldLabel={settings.message_label || 'Wiadomość'}
                  fieldPlaceholder={settings.message_placeholder || 'Opisz swoje pytanie...'}
                  onLabelChange={(v) => updateField('message_label', v)}
                  onPlaceholderChange={(v) => updateField('message_placeholder', v)}
                  type="textarea"
                />

                <Popover>
                  <PopoverTrigger asChild>
                    <div className="group relative cursor-pointer rounded-md transition-all hover:ring-2 hover:ring-primary/30">
                      <Button className="w-full pointer-events-none">
                        {settings.submit_button_text || 'Wyślij wiadomość'}
                      </Button>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-1 bg-primary/10 rounded-full">
                          <Pencil className="h-3 w-3 text-primary" />
                        </div>
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tekst przycisku</Label>
                        <Input
                          value={settings.submit_button_text}
                          onChange={(e) => updateField('submit_button_text', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Komunikat sukcesu</Label>
                        <Input
                          value={settings.success_message}
                          onChange={(e) => updateField('success_message', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Komunikat błędu</Label>
                        <Input
                          value={settings.error_message}
                          onChange={(e) => updateField('error_message', e.target.value)}
                        />
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
