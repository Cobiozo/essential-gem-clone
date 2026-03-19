import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ContactFormSection } from './ContactFormSection';
import type { PartnerProductLink, ProductCatalogItem } from '@/types/partnerPage';

interface Props {
  config: Record<string, any>;
  products: ProductCatalogItem[];
  productLinks: (PartnerProductLink & { product?: ProductCatalogItem })[];
  partnerEmail?: string;
}

export const ProductsWithFormSection: React.FC<Props> = ({ config, products, productLinks, partnerEmail }) => {
  const {
    heading, columns, form_config, cta_bg_color,
  } = config;

  const ctaBg = cta_bg_color || '#2d6a4f';

  const catalogItems = products.map(p => ({
    name: p.name,
    description: p.description || '',
    image_url: p.image_url || '',
    cta_text: config.default_cta_text || 'Zobacz szczegóły',
    purchase_url: productLinks.find(lp => lp.product_id === p.id)?.purchase_url || '#',
  }));

  const items = catalogItems.length > 0 ? catalogItems : (columns || []);

  const formCfg = {
    ...(form_config || {}),
    layout: 'floating',
    cta_bg_color: ctaBg,
  };

  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-10">{heading}</h2>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Products grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {(items || []).map((col: any, i: number) => {
              const link = productLinks.find(lp => lp.product?.name === col.name);
              const url = col.purchase_url || link?.purchase_url || '#';

              return (
                <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col">
                  {col.image_url && (
                    <div className="aspect-square bg-muted flex items-center justify-center p-4">
                      <img src={col.image_url} alt={col.name} className="max-h-full object-contain" />
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-foreground text-base mb-1">{col.name}</h3>
                    {col.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{col.description}</p>}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-full font-semibold text-xs transition-all hover:shadow-lg hover:scale-105"
                      style={{ backgroundColor: ctaBg }}
                    >
                      {col.cta_text || 'Zobacz szczegóły'} <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contact form (floating style) */}
          <div className="lg:sticky lg:top-24">
            <ContactFormSection config={formCfg} partnerEmail={partnerEmail} />
          </div>
        </div>
      </div>
    </section>
  );
};
