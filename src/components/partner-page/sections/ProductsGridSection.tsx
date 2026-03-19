import React, { useState } from 'react';
import { ChevronDown, ArrowRight, Pencil } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { PartnerProductLink, ProductCatalogItem } from '@/types/partnerPage';

interface Props {
  config: Record<string, any>;
  products: ProductCatalogItem[];
  productLinks: (PartnerProductLink & { product?: ProductCatalogItem })[];
  isEditing?: boolean;
  onProductLinkSave?: (productId: string, purchaseUrl: string) => void;
}

export const ProductsGridSection: React.FC<Props> = ({ config, products, productLinks, isEditing, onProductLinkSave }) => {
  const { heading, columns, cta_bg_color } = config;
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');

  const items = columns?.length > 0 ? columns : productLinks.map(lp => ({
    name: lp.product?.name || '',
    subtitle: '',
    description: lp.product?.description || '',
    specs: '',
    image_url: lp.product?.image_url || '',
    cta_text: 'Zobacz szczegóły',
    purchase_url: lp.purchase_url,
    _product_id: lp.product_id,
  }));

  const ctaBg = cta_bg_color || '#2d6a4f';

  const handleEditClick = (productId: string, currentUrl: string) => {
    setEditingProductId(productId);
    setEditUrl(currentUrl || '');
  };

  const handleSaveLink = () => {
    if (editingProductId && onProductLinkSave) {
      onProductLinkSave(editingProductId, editUrl);
    }
    setEditingProductId(null);
    setEditUrl('');
  };

  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-10">{heading}</h2>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(items || []).map((col: any, i: number) => {
            const link = productLinks.find(lp => lp.product?.name === col.name);
            const url = col.purchase_url || link?.purchase_url || '#';
            const productId = col._product_id || link?.product_id || products.find(p => p.name === col.name)?.id;

            return (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col">
                {col.image_url && (
                  <div className="aspect-square bg-muted flex items-center justify-center p-6">
                    <img src={col.image_url} alt={col.name} className="max-h-full object-contain" />
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-bold text-foreground text-lg mb-1">{col.name}</h3>
                  {col.subtitle && <p className="text-sm text-muted-foreground mb-1">{col.subtitle}</p>}
                  {col.description && <p className="text-sm text-muted-foreground mb-3">{col.description}</p>}
                  {col.specs && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline mb-4">
                        Rozwiń pełny skład <ChevronDown className="w-3 h-3" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="text-xs text-muted-foreground mb-4 whitespace-pre-wrap">{col.specs}</p>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {isEditing && productId ? (
                    <Popover open={editingProductId === productId} onOpenChange={(open) => { if (!open) setEditingProductId(null); }}>
                      <PopoverTrigger asChild>
                        <button
                          onClick={() => handleEditClick(productId, url !== '#' ? url : '')}
                          className="mt-auto inline-flex items-center justify-center gap-2 text-white px-6 py-3 rounded-full font-semibold text-sm transition-all hover:shadow-lg hover:scale-105"
                          style={{ backgroundColor: ctaBg }}
                        >
                          <Pencil className="w-4 h-4" /> Edytuj link
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Link zakupowy</p>
                          <Input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://..." />
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setEditingProductId(null)}>Anuluj</Button>
                            <Button size="sm" onClick={handleSaveLink}>Zapisz</Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center justify-center gap-2 text-white px-6 py-3 rounded-full font-semibold text-sm transition-all hover:shadow-lg hover:scale-105"
                      style={{ backgroundColor: ctaBg }}
                    >
                      {col.cta_text || 'Zobacz szczegóły'} <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
