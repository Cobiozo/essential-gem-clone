import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertElement } from '@/components/elements/AlertElement';
import { Globe, Save, Copy, ExternalLink, Check, Package, Upload, Loader2, Layout, ArrowLeft, Eye, Lock } from 'lucide-react';
import { usePartnerPage } from '@/hooks/usePartnerPage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TemplateElement, PartnerPageTemplate } from '@/types/partnerPage';
import { PartnerPageInlineEditor } from '@/components/partner-page/PartnerPageInlineEditor';

// ─── Template Gallery (with active indicator & cooldown) ───
const TemplateGallery: React.FC<{
  templates: PartnerPageTemplate[];
  activeTemplateId: string | null;
  canChange: boolean;
  daysUntilChange: number;
  isRestored: (id: string) => boolean;
  onSelect: (id: string) => void;
  onBack: (() => void) | null;
  selecting: boolean;
}> = ({ templates, activeTemplateId, canChange, daysUntilChange, isRestored, onSelect, onBack, selecting }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Layout className="w-5 h-5" />
          {activeTemplateId ? 'Zmień szablon strony' : 'Wybierz szablon strony'}
        </CardTitle>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Wróć do edycji
          </Button>
        )}
      </div>
      <CardDescription>
        {activeTemplateId
          ? 'Podejrzyj dostępne szablony lub zmień aktualny. Zmiana szablonu jest możliwa raz na 14 dni.'
          : 'Wybierz jeden z dostępnych szablonów, aby rozpocząć tworzenie swojej strony.'}
      </CardDescription>
      {!canChange && activeTemplateId && (
        <div className="mt-2">
          <AlertElement
            variant="warning"
            title="Zmiana zablokowana"
            content={`Następna zmiana szablonu będzie możliwa za ${daysUntilChange} dni.`}
          />
        </div>
      )}
    </CardHeader>
    <CardContent>
      {templates.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Brak dostępnych szablonów. Skontaktuj się z administratorem.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => {
            const isActive = t.id === activeTemplateId;
            const wasUsed = isRestored(t.id);
            return (
              <div
                key={t.id}
                className={`border rounded-xl p-5 space-y-3 transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-lg">{t.name}</h3>
                    {t.description && (
                      <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                    )}
                  </div>
                  {isActive && <Badge className="shrink-0">Aktywny</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(t.template_data || []).length} elementów
                </p>
                {wasUsed && !isActive && (
                  <AlertElement
                    variant="info"
                    content="Ten szablon był już używany. Po wybraniu sprawdź czy linki i treści są aktualne."
                  />
                )}
                {isActive ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="w-4 h-4 mr-1" />
                    Aktualnie wybrany
                  </Button>
                ) : canChange ? (
                  <Button
                    onClick={() => onSelect(t.id)}
                    disabled={selecting}
                    className="w-full"
                  >
                    Wybierz ten szablon
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    <Lock className="w-4 h-4 mr-1" />
                    Zmiana za {daysUntilChange} dni
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

// ─── Main Editor ───
export const PartnerPageEditor: React.FC = () => {
  const {
    partnerPage,
    template,
    availableTemplates,
    products,
    productLinks,
    loading,
    saving,
    savePartnerPage,
    selectTemplate,
    saveProductLink,
    removeProductLink,
    canChangeTemplate,
    daysUntilChange,
    isTemplateRestored,
  } = usePartnerPage();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isActive, setIsActive] = useState(false);
  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [eqId, setEqId] = useState<string | null>(null);
  const [alias, setAlias] = useState<string>('');
  const [selectingTemplate, setSelectingTemplate] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const fetchEqId = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('eq_id').eq('user_id', user.id).single();
      if (data?.eq_id) setEqId(data.eq_id);
    };
    fetchEqId();
  }, [user]);

  useEffect(() => {
    if (partnerPage) {
      setIsActive(partnerPage.is_active);
      setCustomData(partnerPage.custom_data || {});
      setAlias(partnerPage.alias || eqId || '');
    } else if (eqId && !loading) {
      setAlias(eqId);
    }
  }, [partnerPage, eqId, loading]);

  useEffect(() => {
    if (partnerPage && !partnerPage.alias && eqId) {
      savePartnerPage({ alias: eqId, is_active: partnerPage.is_active, custom_data: partnerPage.custom_data || {} });
    }
  }, [partnerPage, eqId]);

  useEffect(() => {
    const links: Record<string, string> = {};
    productLinks.forEach(l => { if (l.is_active) links[l.product_id] = l.purchase_url; });
    setSelectedProducts(links);
  }, [productLinks]);

  const handleSelectTemplate = async (templateId: string) => {
    setSelectingTemplate(true);
    const success = await selectTemplate(templateId);
    setSelectingTemplate(false);
    if (success) setShowTemplateGallery(false);
  };

  const editableElements = template.filter(
    (el: TemplateElement) => el.type !== 'static' && el.type !== 'product_slot'
  );

  const currentAlias = alias || eqId || '';

  const handleSave = async () => {
    const success = await savePartnerPage({
      alias: currentAlias || undefined,
      is_active: isActive,
      custom_data: customData,
    });
    if (success) {
      for (const [productId, url] of Object.entries(selectedProducts)) {
        if (url) await saveProductLink(productId, url);
      }
      for (const link of productLinks) {
        if (!selectedProducts[link.product_id]) {
          await removeProductLink(link.product_id);
        }
      }
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${currentAlias}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: 'Skopiowano', description: 'Link został skopiowany do schowka' });
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev[productId] !== undefined) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: '' };
    });
  };

  const handleImageUpload = async (elementId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Błąd', description: 'Dozwolone są tylko pliki graficzne', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Błąd', description: 'Maksymalny rozmiar pliku to 2MB', variant: 'destructive' });
      return;
    }
    setUploadingField(elementId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nie jesteś zalogowany');
      const path = `partner-photos/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('cms-images').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('cms-images').getPublicUrl(path);
      setCustomData(prev => ({ ...prev, [elementId]: publicUrl }));
      toast({ title: 'Sukces', description: 'Zdjęcie zostało przesłane' });
    } catch (err: any) {
      toast({ title: 'Błąd uploadu', description: err.message || 'Nie udało się przesłać pliku', variant: 'destructive' });
    } finally {
      setUploadingField(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show template gallery if no template chosen yet OR user toggled gallery
  const needsFirstSelection = !partnerPage?.selected_template_id && availableTemplates.length > 0;
  if (needsFirstSelection || showTemplateGallery) {
    return (
      <div className="space-y-6">
        <TemplateGallery
          templates={availableTemplates}
          activeTemplateId={partnerPage?.selected_template_id || null}
          canChange={canChangeTemplate}
          daysUntilChange={daysUntilChange}
          isRestored={isTemplateRestored}
          onSelect={handleSelectTemplate}
          onBack={needsFirstSelection ? null : () => setShowTemplateGallery(false)}
          selecting={selectingTemplate}
        />
      </div>
    );
  }

  // Find active template name
  const activeTemplateName = availableTemplates.find(t => t.id === partnerPage?.selected_template_id)?.name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Moja strona
          </CardTitle>
          <CardDescription>
            Skonfiguruj swoją stronę partnerską i udostępnij ją klientom
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Adres strony</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
              <span className="text-sm text-muted-foreground">{window.location.origin}/</span>
              <span className="text-sm font-medium">{currentAlias || '—'}</span>
              {currentAlias && <Badge variant="secondary" className="ml-auto text-xs">EQ ID</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Adres Twojej strony jest automatycznie ustawiony na podstawie Twojego numeru EQ ID i nie może być zmieniony.
            </p>
            {currentAlias && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Skopiowano' : 'Kopiuj link'}
                </Button>
                {isActive && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/${currentAlias}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Podgląd
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Template info & change button */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <Label>Szablon</Label>
              <p className="text-sm text-muted-foreground">
                {activeTemplateName || 'Brak szablonu'}
                {!canChangeTemplate && (
                  <span className="text-xs ml-2">(zmiana za {daysUntilChange} dni)</span>
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTemplateGallery(true)}>
              <Layout className="w-4 h-4 mr-1" />
              Zmień szablon
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Strona aktywna</Label>
              <p className="text-sm text-muted-foreground">Włącz, aby strona była widoczna publicznie</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>

      {/* Restored template warning */}
      {partnerPage?.selected_template_id && isTemplateRestored(partnerPage.selected_template_id) && (
        <AlertElement
          variant="warning"
          title="Przywrócony szablon"
          content="Ten szablon był już wcześniej używany. Sprawdź czy wszystkie linki i treści są prawidłowe i aktualne."
        />
      )}

      {/* Inline editor for editable fields */}
      {template.length > 0 && (
        <PartnerPageInlineEditor
          template={template}
          customData={customData}
          onCustomDataChange={setCustomData}
        />
      )}

      {/* Products */}
      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5" />
              Produkty
            </CardTitle>
            <CardDescription>Wybierz produkty i dodaj swoje linki zakupowe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.map(product => {
              const isSelected = selectedProducts[product.id] !== undefined;
              return (
                <div key={product.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{product.name}</h4>
                        {isSelected && <Badge variant="secondary">Wybrany</Badge>}
                      </div>
                      {product.description && <p className="text-sm text-muted-foreground mt-1">{product.description}</p>}
                    </div>
                    <Switch checked={isSelected} onCheckedChange={() => toggleProduct(product.id)} />
                  </div>
                  {isSelected && (
                    <div className="space-y-1">
                      <Label className="text-sm">Twój link zakupowy</Label>
                      <Input
                        value={selectedProducts[product.id] || ''}
                        onChange={(e) => setSelectedProducts(prev => ({ ...prev, [product.id]: e.target.value }))}
                        placeholder="https://twoj-sklep.pl/produkt..."
                        type="url"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Zapisywanie...' : 'Zapisz stronę'}
        </Button>
      </div>
    </div>
  );
};

export default PartnerPageEditor;
