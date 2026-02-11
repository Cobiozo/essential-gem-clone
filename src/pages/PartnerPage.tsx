import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import NotFound from './NotFound';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { TemplateElement, PartnerPage as PartnerPageType, ProductCatalogItem, PartnerProductLink } from '@/types/partnerPage';
import { ExternalLink } from 'lucide-react';

interface PartnerProfile {
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
}

const PartnerPageView: React.FC = () => {
  const { alias } = useParams<{ alias: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [template, setTemplate] = useState<TemplateElement[]>([]);
  const [page, setPage] = useState<PartnerPageType | null>(null);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [productLinks, setProductLinks] = useState<PartnerProductLink[]>([]);

  useEffect(() => {
    const fetchPage = async () => {
      if (!alias) { setNotFound(true); setLoading(false); return; }

      // Fetch partner page by alias
      const { data: pageData, error } = await supabase
        .from('partner_pages')
        .select('*')
        .eq('alias', alias)
        .eq('is_active', true)
        .maybeSingle();

      if (!pageData || error) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPage(pageData as any);

      // Fetch template, profile, products, and links in parallel
      const [templateRes, profileRes, productsRes, linksRes] = await Promise.all([
        supabase.from('partner_page_template').select('template_data').limit(1).maybeSingle(),
        supabase.from('profiles').select('first_name, last_name').eq('user_id', pageData.user_id).maybeSingle(),
        supabase.from('product_catalog').select('*').eq('is_active', true).order('position'),
        supabase.from('partner_product_links').select('*').eq('partner_page_id', pageData.id).eq('is_active', true).order('position'),
      ]);

      setTemplate(((templateRes.data?.template_data as any) || []).sort((a: TemplateElement, b: TemplateElement) => a.position - b.position));
      setProfile(profileRes.data as any);
      setProducts(productsRes.data as any || []);
      setProductLinks((linksRes.data as any) || []);
      setLoading(false);
    };

    fetchPage();
  }, [alias]);

  if (loading) return <LoadingSpinner />;
  if (notFound || !page) return <NotFound />;

  const customData = page.custom_data || {};

  // Get products that have links from this partner
  const linkedProducts = productLinks
    .map(link => ({
      ...link,
      product: products.find(p => p.id === link.product_id),
    }))
    .filter(lp => lp.product && lp.purchase_url);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Partner name */}
        {profile && (
          <div className="text-center">
            <h1 className="text-3xl font-bold">
              {profile.first_name} {profile.last_name}
            </h1>
          </div>
        )}

        {/* Template elements */}
        {template.map((element) => (
          <div key={element.id}>
            {element.type === 'static' && element.content && (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: element.content }}
              />
            )}

            {element.type === 'editable_text' && customData[element.id] && (
              <div className="space-y-2">
                {element.label && (
                  <h3 className="text-lg font-semibold">{element.label}</h3>
                )}
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {customData[element.id]}
                </p>
              </div>
            )}

            {element.type === 'editable_image' && customData[element.id] && (
              <div className="space-y-2">
                {element.label && (
                  <h3 className="text-lg font-semibold">{element.label}</h3>
                )}
                <img
                  src={customData[element.id]}
                  alt={element.label || ''}
                  className="max-w-full rounded-lg shadow-md"
                />
              </div>
            )}

            {element.type === 'product_slot' && linkedProducts.length > 0 && (
              <div className="space-y-4">
                {element.label && (
                  <h3 className="text-xl font-semibold">{element.label}</h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {linkedProducts.map(({ product, purchase_url }) => (
                    <div key={product!.id} className="border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
                      {product!.image_url && (
                        <img
                          src={product!.image_url}
                          alt={product!.name}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4 space-y-3">
                        <h4 className="font-semibold">{product!.name}</h4>
                        {product!.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {product!.description}
                          </p>
                        )}
                        <a
                          href={purchase_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity w-full justify-center"
                        >
                          Kup teraz
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>Pure Life Center</p>
        </div>
      </div>
    </div>
  );
};

export default PartnerPageView;
