import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';
import { getFieldLabel } from '@/lib/mergePartnerConfig';
import { ImageUploadInput } from './ImageUploadInput';
import type { TemplateElement } from '@/types/partnerPage';

interface PartnerPageInlineEditorProps {
  template: TemplateElement[];
  customData: Record<string, any>;
  onCustomDataChange: (data: Record<string, any>) => void;
}

const isImageField = (field: string) =>
  field.includes('image') || field.includes('logo');

interface EditableFieldProps {
  elementId: string;
  fieldName: string;
  templateValue: any;
  overrideValue: any;
  onChange: (elementId: string, fieldName: string, value: string) => void;
}

const EditableField: React.FC<EditableFieldProps> = ({
  elementId,
  fieldName,
  templateValue,
  overrideValue,
  onChange,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const currentValue = overrideValue !== undefined ? overrideValue : (templateValue || '');
  const isOverridden = overrideValue !== undefined && overrideValue !== templateValue;
  const label = getFieldLabel(fieldName);

  const startEdit = () => {
    setDraft(currentValue);
    setEditing(true);
  };

  const confirmEdit = () => {
    onChange(elementId, fieldName, draft);
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  if (editing) {
    const isLongText = currentValue.length > 60 || fieldName === 'description';
    return (
      <div className="space-y-1.5 p-3 border border-primary/30 rounded-lg bg-primary/5">
        <Label className="text-xs font-medium text-primary">{label}</Label>
        {isImageField(fieldName) ? (
          <ImageUploadInput value={draft} onChange={setDraft} />
        ) : isLongText ? (
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus />
        ) : (
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && confirmEdit()} />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={confirmEdit}>
            <Check className="w-3 h-3 mr-1" /> Zapisz
          </Button>
          <Button size="sm" variant="outline" onClick={cancelEdit}>
            <X className="w-3 h-3 mr-1" /> Anuluj
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5 ${
        isOverridden ? 'border-primary/20 bg-primary/5' : 'border-border'
      }`}
      onClick={startEdit}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
        {isImageField(fieldName) && currentValue ? (
          <img src={currentValue} alt={label} className="w-full h-20 object-cover rounded border" />
        ) : (
          <p className="text-sm text-foreground truncate">
            {currentValue || <span className="text-muted-foreground italic">Kliknij, aby edytować...</span>}
          </p>
        )}
        {isOverridden && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Domyślnie: <span className="italic">{templateValue}</span>
          </p>
        )}
      </div>
      <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
    </div>
  );
};

export const PartnerPageInlineEditor: React.FC<PartnerPageInlineEditorProps> = ({
  template,
  customData,
  onCustomDataChange,
}) => {
  const handleFieldChange = (elementId: string, fieldName: string, value: string) => {
    const elementOverrides = customData[elementId] || {};
    const updated = {
      ...customData,
      [elementId]: { ...elementOverrides, [fieldName]: value },
    };
    onCustomDataChange(updated);
  };

  const editableGroups = template
    .filter((el) => {
      const cfg = el.config || {};
      const editableFields: string[] = cfg.editable_fields || [];
      return editableFields.length > 0;
    })
    .map((el) => {
      const cfg = el.config || {};
      const editableFields: string[] = cfg.editable_fields || [];
      return { element: el, fields: editableFields, config: cfg };
    });

  if (editableGroups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Ten szablon nie ma pól do edycji. Skontaktuj się z administratorem.
        </CardContent>
      </Card>
    );
  }

  const sectionLabels: Record<string, string> = {
    hero: 'Sekcja Hero',
    header: 'Nagłówek strony',
    text_image: 'Tekst + Obraz',
    steps: 'Kroki',
    timeline: 'Oś czasu',
    testimonials: 'Opinie',
    products_grid: 'Produkty',
    faq: 'FAQ',
    cta_banner: 'Baner CTA',
    contact_form: 'Formularz kontaktowy',
    footer: 'Stopka',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Pencil className="w-5 h-5" />
          Personalizacja strony
        </CardTitle>
        <CardDescription>
          Kliknij w pole, aby zmienić jego treść. Twoje zmiany nadpiszą domyślne wartości szablonu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {editableGroups.map(({ element, fields, config }) => {
          const elementOverrides = customData[element.id] || {};
          return (
            <div key={element.id} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {sectionLabels[element.type] || element.label || element.type}
              </h3>
              <div className="space-y-2">
                {fields.map((fieldName) => {
                  let templateValue: any;
                  if (fieldName.includes('.')) {
                    const [parent, child] = fieldName.split('.');
                    templateValue = config[parent]?.[child] ?? '';
                  } else {
                    templateValue = config[fieldName] ?? '';
                  }

                  return (
                    <EditableField
                      key={`${element.id}-${fieldName}`}
                      elementId={element.id}
                      fieldName={fieldName}
                      templateValue={templateValue}
                      overrideValue={elementOverrides[fieldName]}
                      onChange={handleFieldChange}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
