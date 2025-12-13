import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MediaUpload } from '@/components/MediaUpload';

interface ReflinkFormData {
  target_role: string;
  reflink_code: string;
  description: string | null;
  title: string | null;
  image_url: string | null;
  link_url: string | null;
  link_type: string;
  visible_to_roles: string[];
  position: number;
}

interface ReflinksFormProps {
  initialData: ReflinkFormData;
  onDataChange: (data: ReflinkFormData) => void;
  isEdit?: boolean;
}

const availableRoles = [
  { value: 'partner', label: 'Partner' },
  { value: 'specjalista', label: 'Specjalista' },
  { value: 'client', label: 'Klient' },
];

const getFullReflink = (code: string) => {
  return `${window.location.origin}/auth?ref=${code}`;
};

export const ReflinksForm: React.FC<ReflinksFormProps> = ({ 
  initialData, 
  onDataChange,
  isEdit = false 
}) => {
  // Local state for form fields - prevents parent re-renders during typing
  const [localData, setLocalData] = useState<ReflinkFormData>(initialData);

  // Sync local state when initialData changes (e.g., when opening edit modal)
  useEffect(() => {
    setLocalData(initialData);
  }, [initialData]);

  // Notify parent of changes (used for non-text fields and final sync)
  const updateParent = useCallback((newData: ReflinkFormData) => {
    onDataChange(newData);
  }, [onDataChange]);

  // Handle text input changes - only update local state
  const handleTextChange = useCallback((field: keyof ReflinkFormData, value: string) => {
    setLocalData(prev => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
  }, []);

  // Handle text input blur - sync with parent
  const handleTextBlur = useCallback(() => {
    updateParent(localData);
  }, [localData, updateParent]);

  // Handle non-text field changes - update both local and parent immediately
  const handleSelectChange = useCallback((field: keyof ReflinkFormData, value: string | string[] | number) => {
    setLocalData(prev => {
      const updated = { ...prev, [field]: value };
      updateParent(updated);
      return updated;
    });
  }, [updateParent]);

  const toggleVisibleRole = useCallback((role: string) => {
    setLocalData(prev => {
      const roles = prev.visible_to_roles || [];
      const newRoles = roles.includes(role) 
        ? roles.filter(r => r !== role)
        : [...roles, role];
      const updated = { ...prev, visible_to_roles: newRoles };
      updateParent(updated);
      return updated;
    });
  }, [updateParent]);

  const handleMediaUploaded = useCallback((url: string) => {
    setLocalData(prev => {
      const updated = { ...prev, image_url: url };
      updateParent(updated);
      return updated;
    });
  }, [updateParent]);

  return (
    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Przycisk (rola docelowa)</Label>
          <Select
            value={localData.target_role}
            onValueChange={(value) => handleSelectChange('target_role', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="klient">Klient</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="specjalista">Specjalista</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Typ linku</Label>
          <Select
            value={localData.link_type}
            onValueChange={(value) => handleSelectChange('link_type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reflink">Reflink (rejestracja)</SelectItem>
              <SelectItem value="internal">Link wewnętrzny</SelectItem>
              <SelectItem value="external">Link zewnętrzny</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nazwa widoczna dla użytkownika *</Label>
        <Input
          value={localData.title || ''}
          onChange={(e) => handleTextChange('title', e.target.value)}
          onBlur={handleTextBlur}
          placeholder="np. Zarejestruj się jako partner"
          required
        />
        <p className="text-xs text-muted-foreground">
          Ta nazwa będzie wyświetlana użytkownikowi w menu reflinków
        </p>
      </div>

      {localData.link_type === 'reflink' && (
        <div className="space-y-2">
          <Label>Kod reflinku (unikalny)</Label>
          <Input
            value={localData.reflink_code || ''}
            onChange={(e) => handleTextChange('reflink_code', e.target.value)}
            onBlur={handleTextBlur}
            placeholder="np. partner-jan-2024"
          />
          <p className="text-xs text-muted-foreground">
            Pełny link: {getFullReflink(localData.reflink_code || 'kod')}
          </p>
        </div>
      )}

      {(localData.link_type === 'internal' || localData.link_type === 'external') && (
        <div className="space-y-2">
          <Label>URL linku</Label>
          <Input
            value={localData.link_url || ''}
            onChange={(e) => handleTextChange('link_url', e.target.value)}
            onBlur={handleTextBlur}
            placeholder={localData.link_type === 'internal' ? '/strona' : 'https://example.com'}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Opis (opcjonalny)</Label>
        <Input
          value={localData.description || ''}
          onChange={(e) => handleTextChange('description', e.target.value)}
          onBlur={handleTextBlur}
          placeholder="np. Link dla nowych partnerów"
        />
      </div>

      <div className="space-y-2">
        <Label>Grafika (opcjonalna)</Label>
        <MediaUpload
          onMediaUploaded={handleMediaUploaded}
          currentMediaUrl={localData.image_url || ''}
          allowedTypes={['image']}
        />
      </div>

      <div className="space-y-2">
        <Label>Pozycja (kolejność)</Label>
        <Input
          type="number"
          value={localData.position}
          onChange={(e) => handleTextChange('position', e.target.value)}
          onBlur={() => {
            // Parse position as number on blur
            setLocalData(prev => {
              const updated = { ...prev, position: parseInt(String(prev.position)) || 0 };
              updateParent(updated);
              return updated;
            });
          }}
          min={0}
        />
      </div>

      <div className="space-y-2">
        <Label>Widoczny dla ról</Label>
        <div className="flex flex-wrap gap-3 pt-1">
          {availableRoles.map(role => (
            <div key={role.value} className="flex items-center gap-2">
              <Checkbox
                id={`role-${role.value}-${isEdit ? 'edit' : 'new'}`}
                checked={(localData.visible_to_roles || []).includes(role.value)}
                onCheckedChange={() => toggleVisibleRole(role.value)}
              />
              <Label htmlFor={`role-${role.value}-${isEdit ? 'edit' : 'new'}`} className="cursor-pointer">
                {role.label}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Tylko zalogowani użytkownicy z wybranymi rolami zobaczą ten reflink
        </p>
      </div>
    </div>
  );
};
