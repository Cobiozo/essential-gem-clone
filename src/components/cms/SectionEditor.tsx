import React from 'react';
import { CMSSection } from '@/types/cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SectionEditorProps {
  section?: Partial<CMSSection> | null;
  onSave: (updated: Partial<CMSSection>) => void | Promise<void>;
  onCancel?: () => void;
  isNew?: boolean;
  allowSizeEditing?: boolean; // when false, do not send width/height fields on save
  trigger?: React.ReactNode; // optional trigger to open as a dialog
}

// Reasonable defaults for a new section
const defaultSection: Partial<CMSSection> = {
  title: '',
  description: '',
  position: 1,
  is_active: true,
  visible_to_everyone: true,
  visible_to_clients: true,
  visible_to_partners: false,
  visible_to_specjalista: false,
  visible_to_anonymous: true,
  background_color: 'hsl(var(--background))',
  text_color: 'hsl(var(--foreground))',
  font_size: 16,
  alignment: 'left',
  padding: 16,
  section_type: 'section',
};

const InnerForm: React.FC<{
  edited: Partial<CMSSection>;
  setEdited: React.Dispatch<React.SetStateAction<Partial<CMSSection>>>;
  isNew: boolean;
  allowSizeEditing: boolean;
  onSave: (payload: Partial<CMSSection>) => void | Promise<void>;
  onCancel: () => void;
}> = ({ edited, setEdited, isNew, allowSizeEditing, onSave, onCancel }) => {
  const handleChange = (key: keyof CMSSection) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckbox = (key: keyof CMSSection) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setEdited((prev) => ({ ...prev, [key]: e.target.checked }));

  const handleSave = () => {
    const cleaned: Partial<CMSSection> = {
      ...edited,
      title: (edited.title ?? '').toString().trim(),
      description: (edited.description ?? '').toString(),
    };

    if (!allowSizeEditing) {
      const { width_type, custom_width, height_type, custom_height, max_width, ...rest } = cleaned as any;
      onSave(rest);
    } else {
      onSave(cleaned);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sec-title">Tytuł sekcji</Label>
          <Input
            id="sec-title"
            value={edited.title ?? ''}
            onChange={handleChange('title')}
            placeholder="Tytuł"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="sec-position">Pozycja</Label>
          <Input
            id="sec-position"
            type="number"
            value={edited.position ?? 1}
            onChange={handleChange('position')}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="sec-desc">Opis</Label>
        <Textarea
          id="sec-desc"
          value={edited.description ?? ''}
          onChange={handleChange('description')}
          rows={3}
          className="mt-1 resize-none"
          placeholder="Opis sekcji..."
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Widoczność</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!edited.visible_to_everyone}
              onChange={handleCheckbox('visible_to_everyone')}
            />
            Dla wszystkich
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!edited.visible_to_clients}
              onChange={handleCheckbox('visible_to_clients')}
            />
            Klient
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!edited.visible_to_partners}
              onChange={handleCheckbox('visible_to_partners')}
            />
            Partner
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!edited.visible_to_specjalista}
              onChange={handleCheckbox('visible_to_specjalista')}
            />
            Specjalista
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!edited.visible_to_anonymous}
              onChange={handleCheckbox('visible_to_anonymous')}
            />
            Niezalogowani
          </label>
        </div>
      </div>

      {allowSizeEditing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="sec-width-type">Typ szerokości</Label>
            <Input
              id="sec-width-type"
              value={edited.width_type ?? ''}
              onChange={handleChange('width_type')}
              placeholder="full | custom"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sec-custom-width">Szerokość (px)</Label>
            <Input
              id="sec-custom-width"
              type="number"
              value={edited.custom_width ?? 0}
              onChange={handleChange('custom_width')}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sec-max-width">Max width (px)</Label>
            <Input
              id="sec-max-width"
              type="number"
              value={edited.max_width ?? 0}
              onChange={handleChange('max_width')}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sec-height-type">Typ wysokości</Label>
            <Input
              id="sec-height-type"
              value={edited.height_type ?? ''}
              onChange={handleChange('height_type')}
              placeholder="auto | custom"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sec-custom-height">Wysokość (px)</Label>
            <Input
              id="sec-custom-height"
              type="number"
              value={edited.custom_height ?? 0}
              onChange={handleChange('custom_height')}
              className="mt-1"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" onClick={handleSave}>
          {isNew ? 'Dodaj sekcję' : 'Zapisz zmiany'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </div>
  );
};

export const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  onSave,
  onCancel = () => {},
  isNew = false,
  allowSizeEditing = true,
  trigger,
}) => {
  const [edited, setEdited] = React.useState<Partial<CMSSection>>(
    section ?? defaultSection
  );
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setEdited(section ?? defaultSection);
  }, [section]);

  const wrappedOnSave = async (payload: Partial<CMSSection>) => {
    await onSave(payload);
    setOpen(false);
  };

  const wrappedOnCancel = () => {
    onCancel();
    setOpen(false);
  };

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] sm:max-h-[90vh] flex flex-col gap-0">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Dodaj nową sekcję' : 'Edytuj sekcję'}</DialogTitle>
            <DialogDescription>
              Skonfiguruj wygląd i zawartość sekcji
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1 pb-2">
            <InnerForm
              edited={edited}
              setEdited={setEdited}
              isNew={isNew}
              allowSizeEditing={allowSizeEditing}
              onSave={wrappedOnSave}
              onCancel={wrappedOnCancel}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <InnerForm
      edited={edited}
      setEdited={setEdited}
      isNew={isNew}
      allowSizeEditing={allowSizeEditing}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};
