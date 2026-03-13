import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProductsBlockData } from '@/types/leaderLanding';
import { trackLandingEvent } from '../utils/analytics';

interface Props {
  data: ProductsBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const ProductsBlock: React.FC<Props> = ({ data, blockId, pageId, themeColor }) => {
  const catalogIds = (data.catalog_items || []).map(ci => ci.catalog_id);

  const { data: catalogProducts } = useQuery({
    queryKey: ['landing-catalog-products', catalogIds],
    queryFn: async () => {
      if (!catalogIds.length) return [];
      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .in('id', catalogIds)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: catalogIds.length > 0,
  });

  // Merge catalog products with purchase URLs
  const catalogItems = (catalogProducts || []).map(product => {
    const ci = data.catalog_items?.find(c => c.catalog_id === product.id);
    return {
      name: product.name,
      description: product.description || undefined,
      image_url: product.image_url || undefined,
      link: ci?.purchase_url || undefined,
    };
  });

  // Combine legacy inline items + catalog items
  const allItems = [...(data.items || []), ...catalogItems];

  if (!allItems.length) return null;

  return (
    <section id={blockId} className="max-w-5xl mx-auto px-6 py-12">
      {data.heading && <h2 className="text-2xl font-bold mb-8 text-center">{data.heading}</h2>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {allItems.map((item, i) => (
          <a
            key={i}
            href={item.link || '#'}
            onClick={() => trackLandingEvent(pageId, 'cta_click', { block_id: blockId, product: item.name })}
            className="block rounded-xl border p-4 hover:shadow-lg transition-shadow"
          >
            {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover rounded-lg mb-3" loading="lazy" />}
            <h3 className="font-semibold text-lg">{item.name}</h3>
            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
          </a>
        ))}
      </div>
    </section>
  );
};
