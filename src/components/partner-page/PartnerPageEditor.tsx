import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Globe, Save, Copy, ExternalLink, Check, Image, Package } from 'lucide-react';
import { usePartnerPage } from '@/hooks/usePartnerPage';
import { useToast } from '@/hooks/use-toast';
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
    validateAlias,
  } = usePartnerPage();
  const { toast } = useToast();

  const [alias, setAlias] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string>>({});
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize state from fetched data
  useEffect(() => {
    if (partnerPage) {
      setAlias(partnerPage.alias || '');
      setIsActive(partnerPage.is_active);
      setCustomData(partnerPage.custom_data || {});
    }
  }, [partnerPage]);

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

  const handleAliasChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setAlias(normalized);
    setAliasError(validateAlias(normalized));
  };

  const handleSave = async () => {
    const success = await savePartnerPage({
      alias: alias || undefined,
      is_active: isActive,
      custom_data: customData,
    });
    if (success) {
      // Save product links
      for (const [productId, url] of Object.entries(selectedProducts)) {
        if (url) await saveProductLink(productId, url);
      }
      // Remove unselected products
      for (const link of productLinks) {
        if (!selectedProducts[link.product_id]) {
          await removeProductLink(link.product_id);
        }
      }
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${alias}`;
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
          {/* Alias */}
          <div className="space-y-2">
            <Label>Adres strony (alias)</Label>
            <div className="flex gap-2">
              <div className="flex items-center bg-muted px-3 rounded-l-md border border-r-0 text-sm text-muted-foreground">
                {window.location.origin}/
              </div>
              <Input
                value={alias}
                onChange={(e) => handleAliasChange(e.target.value)}
                placeholder="twoj-alias"
                className="rounded-l-none"
              />
            </div>
            {aliasError && <p className="text-sm text-destructive">{aliasError}</p>}
            {alias && !aliasError && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Skopiowano' : 'Kopiuj link'}
                </Button>
                {isActive && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/${alias}`} target="_blank" rel="noopener noreferrer">
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
                    <Input
                      value={customData[element.id] || ''}
                      onChange={(e) => setCustomData(prev => ({ ...prev, [element.id]: e.target.value }))}
                      placeholder="Wklej URL obrazka..."
                      type="url"
                    />
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
        <Button onClick={handleSave} disabled={saving || !!aliasError} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Zapisywanie...' : 'Zapisz stronę'}
        </Button>
      </div>
    </div>
  );
};

export default PartnerPageEditor;
