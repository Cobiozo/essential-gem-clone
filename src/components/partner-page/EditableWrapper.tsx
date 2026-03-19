import React, { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImageUploadInput } from './ImageUploadInput';

interface EditableWrapperProps {
  elementId: string;
  config: Record<string, any>;
  overrides: Record<string, any>;
  onSave: (fieldName: string, value: string) => void;
  isEditing: boolean;
  children: React.ReactNode;
}

const FIELD_LABELS: Record<string, string> = {
  headline: 'Nagłówek',
  description: 'Opis',
  subtitle: 'Podtytuł',
  cta_text: 'Tekst przycisku',
  cta_url: 'Link przycisku',
  'cta_primary.text': 'Tekst przycisku głównego',
  'cta_primary.url': 'Link przycisku głównego',
  'cta_secondary.text': 'Tekst przycisku dodatkowego',
  'cta_secondary.url': 'Link przycisku dodatkowego',
  title: 'Tytuł',
  text: 'Tekst',
  image_url: 'Obrazek',
  hero_image_url: 'Obraz Hero',
  logo_url: 'Logo',
  brand_name: 'Nazwa marki',
  email: 'Email',
  phone: 'Telefon',
  company_name: 'Nazwa firmy',
  copyright_text: 'Tekst praw autorskich',
  heading: 'Nagłówek',
  success_message: 'Komunikat sukcesu',
  'social.facebook': 'Facebook URL',
  'social.instagram': 'Instagram URL',
  'social.linkedin': 'LinkedIn URL',
  'social.youtube': 'YouTube URL',
  'social.messenger': 'Messenger URL',
  'social.whatsapp': 'WhatsApp URL',
  'social.telegram': 'Telegram URL',
};

const isImageField = (field: string) =>
  field.includes('image') || field.includes('logo');

const isLongField = (field: string) =>
  ['description', 'text', 'subtitle', 'copyright_text', 'success_message'].includes(field);

const getNestedValue = (obj: Record<string, any>, path: string): string => {
  if (!path.includes('.')) return obj?.[path] ?? '';
  const [parent, child] = path.split('.');
  return obj?.[parent]?.[child] ?? '';
};

const EditableWrapper: React.FC<EditableWrapperProps> = ({
  elementId,
  config,
  overrides,
  onSave,
  isEditing,
  children,
}) => {
  const editableFields: string[] = config?.editable_fields || [];

  if (!isEditing || editableFields.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="group/edit relative">
      {children}
      <EditOverlay
        elementId={elementId}
        config={config}
        overrides={overrides}
        editableFields={editableFields}
        onSave={onSave}
      />
    </div>
  );
};

interface EditOverlayProps {
  elementId: string;
  config: Record<string, any>;
  overrides: Record<string, any>;
  editableFields: string[];
  onSave: (fieldName: string, value: string) => void;
}

const EditOverlay: React.FC<EditOverlayProps> = ({
  config,
  overrides,
  editableFields,
  onSave,
}) => {
  const [openField, setOpenField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleOpen = (field: string) => {
    const currentVal = overrides?.[field] !== undefined
      ? overrides[field]
      : getNestedValue(config, field);
    setEditValue(String(currentVal));
    setOpenField(field);
  };

  const handleConfirm = () => {
    if (openField) {
      onSave(openField, editValue);
      setOpenField(null);
    }
  };

  return (
    <div className="absolute inset-0 opacity-0 group-hover/edit:opacity-100 transition-opacity pointer-events-none z-10">
      <div className="absolute top-2 right-2 flex gap-1 pointer-events-auto">
        {editableFields.map((field) => (
          <Popover
            key={field}
            open={openField === field}
            onOpenChange={(open) => {
              if (!open) setOpenField(null);
            }}
          >
            <PopoverTrigger asChild>
              <button
                onClick={() => handleOpen(field)}
                className="flex items-center gap-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md shadow-md hover:opacity-90 transition-opacity"
                title={FIELD_LABELS[field] || field}
              >
                <Pencil className="w-3 h-3" />
                <span className="max-w-[100px] truncate">{FIELD_LABELS[field] || field}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {FIELD_LABELS[field] || field}
                </Label>
                {isImageField(field) ? (
                  <ImageUploadInput
                    value={editValue}
                    onChange={(url) => {
                      setEditValue(url);
                    }}
                    compact
                  />
                ) : isLongField(field) ? (
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                ) : (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-sm"
                  />
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenField(null)}
                  >
                    <X className="w-4 h-4 mr-1" /> Anuluj
                  </Button>
                  <Button size="sm" onClick={handleConfirm}>
                    <Check className="w-4 h-4 mr-1" /> Zapisz
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>
    </div>
  );
};

export default EditableWrapper;
