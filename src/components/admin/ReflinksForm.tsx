import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { MediaUpload } from '@/components/MediaUpload';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Shield, Link as LinkIcon } from 'lucide-react';

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
  clipboard_content: string | null;
  // OTP fields
  requires_otp?: boolean;
  slug?: string | null;
  welcome_message?: string | null;
  protected_content?: string | null;
  otp_validity_hours?: number;
  otp_max_sessions?: number;
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

const getInfoLinkUrl = (slug: string) => {
  return `${window.location.origin}/infolink/${slug}`;
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

  // Handle text input changes - update local state AND sync with parent immediately
  const handleTextChange = useCallback((field: keyof ReflinkFormData, value: string) => {
    setLocalData(prev => {
      const updated = { ...prev, [field]: value };
      updateParent(updated);
      return updated;
    });
  }, [updateParent]);

  // Handle non-text field changes - update both local and parent immediately
  const handleSelectChange = useCallback((field: keyof ReflinkFormData, value: string | string[] | number | boolean) => {
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
              <SelectItem value="clipboard">Kopiuj do schowka</SelectItem>
              <SelectItem value="infolink">InfoLink (z kodem OTP)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* InfoLink OTP Settings */}
      {localData.link_type === 'infolink' && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-primary" />
            <span>Ustawienia InfoLinku z kodem OTP</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Wymagaj kodu OTP</Label>
              <p className="text-xs text-muted-foreground">
                Klient musi wpisać kod aby zobaczyć treść
              </p>
            </div>
            <Switch
              checked={localData.requires_otp ?? true}
              onCheckedChange={(checked) => handleSelectChange('requires_otp', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Slug URL *</Label>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                value={localData.slug || ''}
                onChange={(e) => handleTextChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="np. omega3-info"
              />
            </div>
            {localData.slug && (
              <p className="text-xs text-muted-foreground">
                Link: {getInfoLinkUrl(localData.slug)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Treść powitalna (do skopiowania przez partnera)</Label>
            <RichTextEditor
              value={localData.welcome_message || ''}
              onChange={(value) => handleTextChange('welcome_message', value)}
              placeholder="Witaj! Przesyłam Ci link do materiałów informacyjnych..."
              compact={true}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Ta treść zostanie skopiowana do schowka partnera wraz z linkiem i kodem OTP
            </p>
          </div>

          <div className="space-y-2">
            <Label>Treść chroniona (widoczna po wpisaniu kodu)</Label>
            <RichTextEditor
              value={localData.protected_content || ''}
              onChange={(value) => handleTextChange('protected_content', value)}
              placeholder="Tu wpisz treść, którą zobaczy klient po wpisaniu kodu OTP..."
              compact={true}
              rows={6}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ważność kodu OTP (godziny)</Label>
              <Input
                type="number"
                value={localData.otp_validity_hours ?? 24}
                onChange={(e) => handleSelectChange('otp_validity_hours', parseInt(e.target.value) || 24)}
                min={1}
                max={168}
              />
              <p className="text-xs text-muted-foreground">
                Po tym czasie kod wygaśnie
              </p>
            </div>
            <div className="space-y-2">
              <Label>Max sesji na kod</Label>
              <Input
                type="number"
                value={localData.otp_max_sessions ?? 1}
                onChange={(e) => handleSelectChange('otp_max_sessions', parseInt(e.target.value) || 1)}
                min={1}
                max={10}
              />
              <p className="text-xs text-muted-foreground">
                Ile razy można użyć kodu
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Nazwa widoczna dla użytkownika *</Label>
        <Input
          value={localData.title || ''}
          onChange={(e) => handleTextChange('title', e.target.value)}
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
            placeholder={localData.link_type === 'internal' ? '/strona' : 'https://example.com'}
          />
        </div>
      )}

      {localData.link_type === 'clipboard' && (
        <div className="space-y-2">
          <Label>Treść do skopiowania *</Label>
          <RichTextEditor
            value={localData.clipboard_content || ''}
            onChange={(value) => handleTextChange('clipboard_content', value)}
            placeholder="Wpisz tekst, który zostanie skopiowany do schowka..."
            compact={true}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Ta treść zostanie skopiowana do schowka użytkownika po kliknięciu przycisku. Możesz formatować tekst używając przycisków powyżej.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Opis (opcjonalny)</Label>
        <Input
          value={localData.description || ''}
          onChange={(e) => handleTextChange('description', e.target.value)}
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
