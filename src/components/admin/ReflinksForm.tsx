import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { MediaUpload } from '@/components/MediaUpload';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Shield, Link as LinkIcon, Plus, ExternalLink, FileText, Copy, Clock, Key, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { usePublishedPages } from '@/hooks/usePublishedPages';

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
  pre_otp_message?: string | null;  // NEW: Message shown above OTP form on InfoLink page
  welcome_message?: string | null;
  protected_content?: string | null;
  otp_validity_hours?: number;
  otp_max_sessions?: number;
  // InfoLink URL fields
  infolink_url_type?: string | null;
  infolink_url?: string | null;
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
// Preview component for OTP InfoLink
const PreviewSection: React.FC<{ localData: ReflinkFormData }> = ({ localData }) => {
  const sampleOTP = 'ABC123';
  const infolinkUrl = getInfoLinkUrl(localData.slug || '');
  const validityHours = localData.otp_validity_hours ?? 24;

  const previewContent = useMemo(() => {
    let content = localData.welcome_message || '';
    content = content.replace(/\{\{OTP_CODE\}\}/g, sampleOTP);
    content = content.replace(/\{\{INFOLINK_URL\}\}/g, infolinkUrl);
    content = content.replace(/\{\{VALIDITY_HOURS\}\}/g, String(validityHours));
    return content;
  }, [localData.welcome_message, infolinkUrl, validityHours]);

  const plainTextContent = useMemo(() => {
    // Strip HTML tags for copying
    const temp = document.createElement('div');
    temp.innerHTML = previewContent;
    return temp.textContent || temp.innerText || '';
  }, [previewContent]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainTextContent);
      toast.success('Skopiowano podgląd do schowka!');
    } catch (err) {
      toast.error('Nie udało się skopiować');
    }
  };

  return (
    <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Eye className="h-4 w-4" />
        <span>Podgląd treści do skopiowania</span>
      </div>

      <div className="space-y-2 text-sm bg-background p-3 rounded border">
        {previewContent ? (
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        ) : (
          <p className="text-muted-foreground italic">
            Wpisz treść powitalną aby zobaczyć podgląd...
          </p>
        )}

        {!localData.welcome_message?.includes('{{OTP_CODE}}') && !localData.welcome_message?.includes('{{INFOLINK_URL}}') && (
          <div className="mt-3 pt-3 border-t border-dashed space-y-1">
            <p><strong>🔗 Link:</strong> {infolinkUrl}</p>
            <p><strong>🔐 Kod dostępu:</strong> {sampleOTP}</p>
            <p className="text-xs text-muted-foreground">(ważny przez {validityHours} godzin)</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Key className="h-3 w-3" />
          Kod OTP będzie generowany unikalnie dla każdego klienta
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!previewContent}
        >
          <Copy className="h-3 w-3 mr-1" />
          Kopiuj podgląd
        </Button>
      </div>
    </div>
  );
};

export const ReflinksForm: React.FC<ReflinksFormProps> = ({
  initialData, 
  onDataChange,
  isEdit = false 
}) => {
  // Fetch published pages for internal link selection
  const { data: publishedPages = [] } = usePublishedPages();
  
  // Local state for form fields - prevents parent re-renders during typing
  const [localData, setLocalData] = useState<ReflinkFormData>(initialData);
  
  // Track the ID to detect when we're editing a different reflink
  const initialDataIdRef = useRef<string | undefined>(undefined);
  const isFirstRender = useRef(true);

  // Sync local state ONLY when the reflink ID changes (e.g., when opening edit modal for different item)
  useEffect(() => {
    const currentId = (initialData as any)?.id;
    if (currentId !== initialDataIdRef.current) {
      setLocalData(initialData);
      initialDataIdRef.current = currentId;
      isFirstRender.current = true; // Reset first render flag for new item
    }
  }, [initialData]);

  // Notify parent of changes with debounce to prevent loops
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;
  
  useEffect(() => {
    // Skip first render to avoid initial sync loop
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Use ref to call onDataChange without adding it to dependencies
    onDataChangeRef.current(localData);
  }, [localData]);

  // Handle text input changes - update local state only (parent sync via useEffect)
  const handleTextChange = useCallback((field: keyof ReflinkFormData, value: string) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle non-text field changes - update local state only (parent sync via useEffect)
  const handleSelectChange = useCallback((field: keyof ReflinkFormData, value: string | string[] | number | boolean) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleVisibleRole = useCallback((role: string) => {
    setLocalData(prev => {
      const roles = prev.visible_to_roles || [];
      const newRoles = roles.includes(role) 
        ? roles.filter(r => r !== role)
        : [...roles, role];
      return { ...prev, visible_to_roles: newRoles };
    });
  }, []);

  const handleMediaUploaded = useCallback((url: string) => {
    setLocalData(prev => ({ ...prev, image_url: url }));
  }, []);

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

          {/* URL Type Selection */}
          <div className="space-y-2">
            <Label>Typ linku do strony</Label>
            <Select
              value={localData.infolink_url_type || 'external'}
              onValueChange={(value) => handleSelectChange('infolink_url_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Wewnętrzny (strona w aplikacji)
                  </div>
                </SelectItem>
                <SelectItem value="external">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Zewnętrzny (dowolny URL)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Internal page selection */}
          {localData.infolink_url_type === 'internal' && (
            <div className="space-y-2">
              <Label>Wybierz stronę wewnętrzną</Label>
              <Select
                value={localData.infolink_url || ''}
                onValueChange={(value) => handleSelectChange('infolink_url', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz stronę..." />
                </SelectTrigger>
                <SelectContent>
                  {publishedPages.map((page) => (
                    <SelectItem key={page.id} value={`/page/${page.slug}`}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {localData.infolink_url && (
                <p className="text-xs text-muted-foreground">
                  Link: {window.location.origin}{localData.infolink_url}
                </p>
              )}
            </div>
          )}

          {/* External URL input */}
          {localData.infolink_url_type === 'external' && (
            <div className="space-y-2">
              <Label>URL zewnętrzny</Label>
              <Input
                value={localData.infolink_url || ''}
                onChange={(e) => handleTextChange('infolink_url', e.target.value)}
                placeholder="https://example.com/materialy"
              />
            </div>
          )}

          {/* Insert link button */}
          {localData.infolink_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const fullUrl = localData.infolink_url_type === 'internal' 
                  ? `${window.location.origin}${localData.infolink_url}`
                  : localData.infolink_url;
                const currentMessage = localData.welcome_message || '';
                const newMessage = currentMessage 
                  ? `${currentMessage}\n\nLink: ${fullUrl}`
                  : `Link do materiałów: ${fullUrl}`;
                handleTextChange('welcome_message', newMessage);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Wstaw link do treści powitalnej
            </Button>
          )}

          {/* Pre-OTP message - displayed on InfoLink page above OTP form */}
          <div className="space-y-2">
            <Label>Tekst na stronie (powyżej formularza OTP)</Label>
            <RichTextEditor
              value={localData.pre_otp_message || ''}
              onChange={(value) => handleTextChange('pre_otp_message', value)}
              placeholder="Witaj! Poniżej znajdziesz formularz z kodem dostępu..."
              compact={true}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Ten tekst wyświetla się klientowi na stronie InfoLink powyżej formularza z kodem OTP
            </p>
          </div>

          <div className="space-y-2">
            <Label>Treść powitalna (do skopiowania przez partnera)</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentMessage = localData.welcome_message || '';
                  handleTextChange('welcome_message', currentMessage + '{{OTP_CODE}}');
                }}
              >
                <Key className="h-3 w-3 mr-1" />
                + Kod OTP
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentMessage = localData.welcome_message || '';
                  handleTextChange('welcome_message', currentMessage + '{{INFOLINK_URL}}');
                }}
              >
                <LinkIcon className="h-3 w-3 mr-1" />
                + Link InfoLink
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentMessage = localData.welcome_message || '';
                  handleTextChange('welcome_message', currentMessage + '{{VALIDITY_HOURS}}h');
                }}
              >
                <Clock className="h-3 w-3 mr-1" />
                + Ważność
              </Button>
            </div>
            <RichTextEditor
              value={localData.welcome_message || ''}
              onChange={(value) => handleTextChange('welcome_message', value)}
              placeholder="Witaj! Przesyłam Ci link do materiałów informacyjnych..."
              compact={true}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Użyj placeholderów powyżej aby wstawić kod OTP, link i ważność - zostaną automatycznie zamienione
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

          {/* OTP Preview Section */}
          {localData.slug && (
            <PreviewSection localData={localData} />
          )}
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
            setLocalData(prev => ({ ...prev, position: parseInt(String(prev.position)) || 0 }));
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
