import React from 'react';
import type { EqologyProductsSection, EqologyTheme } from '@/types/eqologyTemplate';
import type { PartnerProductLink, ProductCatalogItem } from '@/types/partnerPage';
import { ExternalLink, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface Props {
  data: EqologyProductsSection;
  theme: EqologyTheme;
  catalogProducts: ProductCatalogItem[];
  partnerLinks: PartnerProductLink[];
}

const TIER_COLORS: Record<string, string> = {
  Silver: '#94A3B8',
  Gold: '#D4AF37',
  Green: '#22C55E',
};

export const ProductCardsSection: React.FC<Props> = ({ data, theme, catalogProducts, partnerLinks }) => {
  const getProductUrl = (product: typeof data.products[0]) => {
    // Try to find a matching catalog product and partner link
    const catalogProduct = catalogProducts.find(
      cp => cp.name.toLowerCase().includes(product.name.toLowerCase().split(' ')[0]) ||
        product.name.toLowerCase().includes(cp.name.toLowerCase().split(' ')[0])
    );
    if (catalogProduct) {
      const partnerLink = partnerLinks.find(pl => pl.product_id === catalogProduct.id);
      if (partnerLink?.purchase_url) return partnerLink.purchase_url;
    }
    return product.defaultCtaUrl || '#';
  };

  return (
    <section style={{ backgroundColor: theme.bgAlt }} className="py-16 sm:py-24" id="products">
      <div className="max-w-6xl mx-auto px-6">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12"
          style={{ color: theme.primaryColor }}
        >
          {data.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {data.products.map((product) => {
            const tierColor = TIER_COLORS[product.tier] || theme.accentColor;
            const url = getProductUrl(product);
            return (
              <div
                key={product.id}
                className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 flex flex-col"
              >
                {product.imageUrl ? (
                  <div className="aspect-square overflow-hidden bg-gray-50">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    className="aspect-square flex items-center justify-center"
                    style={{ backgroundColor: `${tierColor}15` }}
                  >
                    <span className="text-5xl font-black opacity-20" style={{ color: tierColor }}>
                      {product.tier}
                    </span>
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div
                    className="text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: tierColor }}
                  >
                    {product.tier}
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: theme.primaryColor }}>
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6 flex-1">{product.description}</p>

                  {url && url !== '#' && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-[1.02] shadow-md mb-4"
                      style={{
                        backgroundColor: theme.accentColor,
                        color: theme.primaryColor,
                      }}
                    >
                      KUP TERAZ
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  {product.ingredients && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full text-left text-sm text-gray-500 hover:text-gray-700 transition-colors group">
                        <span>Składniki</span>
                        <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 text-xs text-gray-500 leading-relaxed">
                        {product.ingredients}
                      </CollapsibleContent>
                    </Collapsible>
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
