import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProductsBlockData, ProductsCatalogItem } from '@/types/leaderLanding';

interface Props {
  data: ProductsBlockData;
  onChange: (data: ProductsBlockData) => void;
}

export const ProductsBlockEditor: React.FC<Props> = ({ data, onChange }) => {
  const update = (partial: Partial<ProductsBlockData>) => onChange({ ...data, ...partial });

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['product-catalog-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('is_active', true)
        .order('position');
      if (error) throw error;
      return data;
    },
  });

  const catalogItems = data.catalog_items || [];

  const isSelected = (id: string) => catalogItems.some(ci => ci.catalog_id === id);

  const toggleProduct = (id: string) => {
    const next = isSelected(id)
      ? catalogItems.filter(ci => ci.catalog_id !== id)
      : [...catalogItems, { catalog_id: id }];
    update({ catalog_items: next });
  };

  const updatePurchaseUrl = (catalogId: string, url: string) => {
    const next = catalogItems.map(ci =>
      ci.catalog_id === catalogId ? { ...ci, purchase_url: url } : ci
    );
    update({ catalog_items: next });
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Edycja Produktów</h4>
      <div><Label>Nagłówek sekcji</Label><Input value={data.heading || ''} onChange={e => update({ heading: e.target.value })} /></div>

      <div>
        <Label>Produkty z katalogu</Label>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : !catalog?.length ? (
          <p className="text-sm text-muted-foreground py-2">Brak produktów w katalogu.</p>
        ) : (
          <div className="space-y-3 mt-2 max-h-[40vh] overflow-y-auto">
            {catalog.map(product => (
              <div key={product.id} className="border rounded-md p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox checked={isSelected(product.id)} onCheckedChange={() => toggleProduct(product.id)} />
                  <span className="flex items-center gap-2">
                    {product.image_url && <img src={product.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                    {product.name}
                  </span>
                </label>
                {isSelected(product.id) && (
                  <div className="pl-6">
                    <Label className="text-xs">Link zakupowy (partnerski)</Label>
                    <Input
                      value={catalogItems.find(ci => ci.catalog_id === product.id)?.purchase_url || ''}
                      onChange={e => updatePurchaseUrl(product.id, e.target.value)}
                      placeholder="https://..."
                      className="text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
