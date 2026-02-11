import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import NotFound from './NotFound';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { TemplateElement, PartnerPage as PartnerPageType, ProductCatalogItem, PartnerProductLink } from '@/types/partnerPage';
import { ExternalLink, Mail, Phone, Facebook, User, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

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

      const [templateRes, profileRes, productsRes, linksRes] = await Promise.all([
        supabase.from('partner_page_template').select('template_data').limit(1).maybeSingle(),
        supabase.from('profiles').select('first_name, last_name, avatar_url').eq('user_id', pageData.user_id).maybeSingle(),
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

  const linkedProducts = productLinks
    .map(link => ({
      ...link,
      product: products.find(p => p.id === link.product_id),
    }))
    .filter(lp => lp.product && lp.purchase_url);

  const partnerName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
  const partnerTitle = customData['partner_title'] || '';
  const partnerPhoto = customData['partner_photo'] || '';
  const partnerBio = customData['partner_bio'] || '';
  const contactEmail = customData['contact_email'] || '';
  const contactPhone = customData['contact_phone'] || '';
  const contactFacebook = customData['contact_facebook'] || '';

  // Find template elements by id
  const heroElement = template.find(e => e.id === 'hero_banner');
  const welcomeElement = template.find(e => e.id === 'welcome_section');
  const orderElement = template.find(e => e.id === 'order_section');
  const contactStaticElement = template.find(e => e.id === 'contact_section_static');
  const aboutHeadingElement = template.find(e => e.id === 'about_heading');
  const footerElement = template.find(e => e.id === 'footer_branding');

  const hasAboutSection = partnerPhoto || partnerBio || contactEmail || contactPhone || contactFacebook;

  return (
    <div className="min-h-screen bg-card">
      {/* ===== TOP BAR ===== */}
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={partnerName}
                className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground text-sm sm:text-base">{partnerName}</p>
              {partnerTitle && (
                <p className="text-xs text-muted-foreground">{partnerTitle}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg sm:text-xl font-bold text-primary tracking-tight">Pure Life</span>
          </div>
        </div>
      </header>

      {/* ===== HERO BANNER ===== */}
      {heroElement?.content && (
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(var(--primary)) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }} />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
            <div
              className="prose prose-sm max-w-none dark:prose-invert text-foreground"
              dangerouslySetInnerHTML={{ __html: heroElement.content }}
            />
            {linkedProducts.length > 0 && (
              <a
                href="#products"
                className="inline-flex items-center gap-2 mt-6 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
              >
                Zobacz produkty
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </section>
      )}

      {/* ===== WELCOME SECTION ===== */}
      {welcomeElement?.content && (
        <section className="bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <div
              className="prose prose-sm sm:prose-base max-w-none dark:prose-invert text-foreground text-center"
              dangerouslySetInnerHTML={{ __html: welcomeElement.content }}
            />
          </div>
        </section>
      )}

      {/* ===== PRODUCTS SECTION ===== */}
      {linkedProducts.length > 0 && (
        <section id="products" className="bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-8 text-center">Produkty</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {linkedProducts.map(({ product, purchase_url }) => (
                <div
                  key={product!.id}
                  className="group bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {product!.image_url && (
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      <img
                        src={product!.image_url}
                        alt={product!.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-5 space-y-3">
                    <h3 className="font-semibold text-foreground text-base">{product!.name}</h3>
                    {product!.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {product!.description}
                      </p>
                    )}
                    <a
                      href={purchase_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Kup teraz
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== ORDER SECTION (Accordion) ===== */}
      {orderElement?.content && (
        <section className="bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full bg-card border border-border rounded-xl px-5 py-4 text-left hover:bg-muted/50 transition-colors group">
                <span className="font-semibold text-foreground text-base">
                  {(orderElement as any).title || 'Zamówienie'}
                </span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 bg-card border border-border rounded-xl px-5 py-4">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert text-foreground"
                  dangerouslySetInnerHTML={{ __html: orderElement.content }}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </section>
      )}

      {/* ===== CONTACT STATIC SECTION (Accordion) ===== */}
      {contactStaticElement?.content && (
        <section className="bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full bg-card border border-border rounded-xl px-5 py-4 text-left hover:bg-muted/50 transition-colors group">
                <span className="font-semibold text-foreground text-base">
                  {(contactStaticElement as any).title || 'Bądź z nami w kontakcie!'}
                </span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 bg-card border border-border rounded-xl px-5 py-4">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert text-foreground"
                  dangerouslySetInnerHTML={{ __html: contactStaticElement.content }}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </section>
      )}

      {/* ===== ABOUT / CONTACT SECTION ===== */}
      {hasAboutSection && (
        <section className="bg-card border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            {aboutHeadingElement?.content && (
              <div
                className="prose prose-sm max-w-none dark:prose-invert mb-8 text-center text-foreground"
                dangerouslySetInnerHTML={{ __html: aboutHeadingElement.content }}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              {/* Photo */}
              <div className="flex justify-center md:justify-start">
                {partnerPhoto ? (
                  <img
                    src={partnerPhoto}
                    alt={partnerName}
                    className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover shadow-md border border-border"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-muted flex items-center justify-center border border-border">
                    <User className="w-16 h-16 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="md:col-span-1">
                {partnerBio && (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                    {partnerBio}
                  </p>
                )}
              </div>

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground text-base">Kontakt</h3>
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <span className="break-all">{contactEmail}</span>
                  </a>
                )}
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone}`}
                    className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <span>{contactPhone}</span>
                  </a>
                )}
                {contactFacebook && (
                  <a
                    href={contactFacebook.startsWith('http') ? contactFacebook : `https://${contactFacebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Facebook className="w-4 h-4 text-primary" />
                    </div>
                    <span>Facebook</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center">
          {footerElement?.content ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: footerElement.content }}
            />
          ) : (
            <p className="text-sm text-muted-foreground font-medium">Pure Life Center</p>
          )}
        </div>
      </footer>
    </div>
  );
};

export default PartnerPageView;
