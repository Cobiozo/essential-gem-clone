import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Globe, Save, Copy, ExternalLink, Check, Package, Upload, Loader2 } from 'lucide-react';
import { usePartnerPage } from '@/hooks/usePartnerPage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TemplateElement } from '@/types/partnerPage';

export const PartnerPageEditor: React.FC = () => {
  const {
    partnerPage,
    template,
    products,
    productLinks,
    loading,
    saving,
    savePartnerPage,
    saveProductLink,
    removeProductLink,
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
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch eq_id from profile
  useEffect(() => {
    const fetchEqId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('eq_id')
        .eq('user_id', user.id)
        .single();
      if (data?.eq_id) {
        setEqId(data.eq_id);
      }
    };
    fetchEqId();
  }, [user]);

  // Initialize state from fetched data
  useEffect(() => {
    if (partnerPage) {
      setIsActive(partnerPage.is_active);
      setCustomData(partnerPage.custom_data || {});
      // Use existing alias or fall back to eqId
      setAlias(partnerPage.alias || eqId || '');
    } else if (eqId && !loading) {
      // No partner page yet - pre-fill alias with eqId
      setAlias(eqId);
    }
  }, [partnerPage, eqId, loading]);

  // Auto-save alias = eqId if partnerPage exists but has no alias
  useEffect(() => {
    if (partnerPage && !partnerPage.alias && eqId) {
      savePartnerPage({ alias: eqId, is_active: partnerPage.is_active, custom_data: partnerPage.custom_data || {} });
    }
  }, [partnerPage, eqId]);

  useEffect(() => {
    const links: Record<string, string> = {};
    productLinks.forEach(l => {
      if (l.is_active) links[l.product_id] = l.purchase_url;
    });
    setSelectedProducts(links);
  }, [productLinks]);

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
          {/* Alias - read only, derived from EQ ID */}
          <div className="space-y-2">
            <Label>Adres strony</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
              <span className="text-sm text-muted-foreground">{window.location.origin}/</span>
              <span className="text-sm font-medium">{currentAlias || '—'}</span>
              {currentAlias && (
                <Badge variant="secondary" className="ml-auto text-xs">EQ ID</Badge>
              )}
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

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Strona aktywna</Label>
              <p className="text-sm text-muted-foreground">Włącz, aby strona była widoczna publicznie</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>

      {/* Editable fields from template */}
      {editableElements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Treść strony</CardTitle>
            <CardDescription>Wypełnij pola wyznaczone przez administratora</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editableElements.map((element: TemplateElement) => (
              <div key={element.id} className="space-y-2">
                <Label>{element.label || element.id}</Label>
                {element.type === 'editable_text' && (
                  <Textarea
                    value={customData[element.id] || ''}
                    onChange={(e) => setCustomData(prev => ({ ...prev, [element.id]: e.target.value }))}
                    placeholder={element.placeholder || 'Wpisz tekst...'}
                    maxLength={element.max_length}
                    rows={3}
                  />
                )}
                {element.type === 'editable_image' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={customData[element.id] || ''}
                        onChange={(e) => setCustomData(prev => ({ ...prev, [element.id]: e.target.value }))}
                        placeholder="Wklej URL obrazka..."
                        type="url"
                        className="flex-1"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => { fileInputRefs.current[element.id] = el; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(element.id, file);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        disabled={uploadingField === element.id}
                        onClick={() => fileInputRefs.current[element.id]?.click()}
                      >
                        {uploadingField === element.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Upload className="w-4 h-4 mr-1" />
                        )}
                        Prześlij
                      </Button>
                    </div>
                    {customData[element.id] && (
                      <img
                        src={customData[element.id]}
                        alt={element.label || ''}
                        className="max-w-[200px] max-h-[150px] rounded-md border object-cover"
                      />
                    )}
                  </div>
                )}
                {element.max_length && element.type === 'editable_text' && (
                  <p className="text-xs text-muted-foreground text-right">
                    {(customData[element.id] || '').length}/{element.max_length}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
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
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{product.name}</h4>
                        {isSelected && <Badge variant="secondary">Wybrany</Badge>}
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                      )}
                    </div>
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                  </div>
                  {isSelected && (
                    <div className="space-y-1">
                      <Label className="text-sm">Twój link zakupowy</Label>
                      <Input
                        value={selectedProducts[product.id] || ''}
                        onChange={(e) => setSelectedProducts(prev => ({
                          ...prev,
                          [product.id]: e.target.value,
                        }))}
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
