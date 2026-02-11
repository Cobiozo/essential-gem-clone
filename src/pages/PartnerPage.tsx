import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import NotFound from './NotFound';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { TemplateElement, PartnerPage as PartnerPageType, ProductCatalogItem, PartnerProductLink } from '@/types/partnerPage';
import { ExternalLink, Mail, Phone, Facebook, User, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PartnerProfile {
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
}

const AccordionSection: React.FC<{ title: string; content: string; children?: React.ReactNode }> = ({ title, content, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-stone-50 transition-colors">
          <h3 className="text-lg font-bold text-stone-800">{title}</h3>
          <ChevronDown className={`w-5 h-5 text-stone-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6">
            <hr className="mb-5 border-stone-200" />
            <div
              className="prose prose-sm max-w-none text-stone-600 text-center leading-relaxed [&_p]:mb-4 [&_hr]:my-5 [&_hr]:border-stone-200 [&_strong]:text-stone-800"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

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

  const getElement = (id: string) => template.find(e => e.id === id);

  const heroElement = getElement('hero_banner');
  const welcomeElement = getElement('welcome_section');
  const orderElement = getElement('order_section');
  const contactStaticElement = getElement('contact_section_static');
  const aboutHeadingElement = getElement('about_heading');
  const footerElement = getElement('footer_branding');

  const hasAboutSection = partnerPhoto || partnerBio || contactEmail || contactPhone || contactFacebook;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e8' }}>
      {/* ===== HERO BANNER ===== */}
      {heroElement?.content && (
        <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #5b8ca8 0%, #7bacc4 50%, #6a9db8 100%)' }}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center text-white">
            <div
              className="[&_h1]:text-white [&_h1]:text-2xl [&_h1]:sm:text-3xl [&_h1]:font-extrabold [&_h1]:uppercase [&_h1]:leading-tight [&_h1]:tracking-wide"
              dangerouslySetInnerHTML={{ __html: heroElement.content }}
            />
            {/* Product images row could go here */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="text-xl sm:text-2xl font-bold tracking-wider">EQOLOGY</span>
              <div className="w-px h-8 bg-white/40" />
              <div className="text-right">
                {partnerTitle && <p className="text-xs opacity-80">{partnerTitle}</p>}
                <span className="text-lg font-bold">Pure Life</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ===== WELCOME SECTION ===== */}
        {welcomeElement?.content && (
          <section className="text-center">
            <div
              className="prose prose-sm max-w-none text-stone-700 leading-relaxed [&_h2]:text-stone-800 [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-bold [&_h2]:italic [&_h2]:mb-4 [&_p]:mb-4 [&_p]:text-sm [&_p]:sm:text-base"
              dangerouslySetInnerHTML={{ __html: welcomeElement.content }}
            />
          </section>
        )}

        {/* ===== PRODUCTS SECTION ===== */}
        {linkedProducts.length > 0 && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {linkedProducts.map(({ product, purchase_url }) => (
                <div
                  key={product!.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-200/60 hover:shadow-md transition-shadow"
                >
                  {product!.image_url && (
                    <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                      <img
                        src={product!.image_url}
                        alt={product!.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-stone-800 text-sm">{product!.name}</h3>
                    {product!.description && (
                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{product!.description}</p>
                    )}
                    <a
                      href={purchase_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-stone-700 transition-colors"
                    >
                      Kup teraz
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== ORDER ACCORDION ===== */}
        {orderElement?.content && (
          <AccordionSection title={orderElement.title || 'Zamówienie'} content={orderElement.content} />
        )}

        {/* ===== CONTACT STATIC ACCORDION ===== */}
        {contactStaticElement?.content && (
          <AccordionSection title={contactStaticElement.title || 'Bądź z nami w kontakcie!'} content={contactStaticElement.content}>
            <div className="flex justify-center mt-4">
              <a
                href="https://www.facebook.com/groups/twojaomega3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold transition-colors"
                style={{ backgroundColor: '#1a5c2a' }}
              >
                <Facebook className="w-4 h-4" />
                Twoja omega-3 (Pure Life)
              </a>
            </div>
          </AccordionSection>
        )}

        {/* ===== ABOUT / CONTACT SECTION ===== */}
        {hasAboutSection && (
          <section className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-6 sm:p-8">
            {aboutHeadingElement?.content && (
              <div
                className="prose prose-sm max-w-none mb-6 text-center text-stone-800 [&_h2]:text-lg [&_h2]:font-bold"
                dangerouslySetInnerHTML={{ __html: aboutHeadingElement.content }}
              />
            )}

            <div className="flex flex-col items-center gap-6">
              {/* Photo */}
              {partnerPhoto ? (
                <img
                  src={partnerPhoto}
                  alt={partnerName}
                  className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl object-cover shadow-sm border border-stone-200"
                />
              ) : (
                <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-stone-100 flex items-center justify-center border border-stone-200">
                  <User className="w-14 h-14 text-stone-300" />
                </div>
              )}

              {/* Name */}
              {partnerName && (
                <h3 className="font-semibold text-stone-800 text-base">{partnerName}</h3>
              )}

              {/* Bio */}
              {partnerBio && (
                <p className="text-stone-600 leading-relaxed text-sm text-center whitespace-pre-wrap max-w-md">{partnerBio}</p>
              )}

              {/* Contact links */}
              <div className="space-y-3 w-full max-w-xs">
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-3 text-sm text-stone-600 hover:text-stone-800 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-stone-500" />
                    </div>
                    <span className="break-all">{contactEmail}</span>
                  </a>
                )}
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone}`}
                    className="flex items-center gap-3 text-sm text-stone-600 hover:text-stone-800 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-stone-500" />
                    </div>
                    <span>{contactPhone}</span>
                  </a>
                )}
                {contactFacebook && (
                  <a
                    href={contactFacebook.startsWith('http') ? contactFacebook : `https://${contactFacebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-stone-600 hover:text-stone-800 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
                      <Facebook className="w-4 h-4 text-stone-500" />
                    </div>
                    <span>Facebook</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 text-center" style={{ backgroundColor: '#f5f0e8' }}>
        <div className="max-w-2xl mx-auto px-4 space-y-2">
          {/* Pure Life logo placeholder */}
          <p className="text-2xl font-bold text-stone-700 tracking-wide">PURE LIFE</p>
          {footerElement?.content ? (
            <div
              className="prose prose-sm max-w-none text-stone-600 [&_p]:mb-1 [&_p]:text-sm"
              dangerouslySetInnerHTML={{ __html: footerElement.content }}
            />
          ) : (
            <>
              <p className="text-sm text-stone-600 italic">w Eqology zmieniamy zdrowie i życie ludzi na lepsze</p>
              <p className="text-sm text-stone-600">Pozdrawiamy</p>
              <p className="text-sm text-stone-700 font-semibold">zespół Pure Life</p>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};

export default PartnerPageView;
