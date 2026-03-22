import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import NotFound from './NotFound';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { TemplateElement, PartnerPage as PartnerPageType, ProductCatalogItem, PartnerProductLink } from '@/types/partnerPage';
import { resolveVariablesInConfig, type PartnerProfileData } from '@/lib/partnerVariables';
import { ExternalLink, Mail, Phone, Facebook, User, ChevronDown, Save, Pencil } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { getMergedConfig } from '@/lib/mergePartnerConfig';
import { toast } from 'sonner';
import EditableWrapper from '@/components/partner-page/EditableWrapper';
import {
  HeroSection,
  TextImageSection,
  StepsSection,
  TimelineSection,
  TestimonialsSection,
  ProductsGridSection,
  FaqSection,
  CtaBannerSection,
  HeaderSection,
  ContactFormSection,
  FooterSection,
  ProductsWithFormSection,
  SurveySection,
  SurveyModal,
} from '@/components/partner-page/sections';
import { PartnerFormModal } from '@/components/partner-page/sections/PartnerFormModal';

interface PartnerProfile {
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  city?: string | null;
  country?: string | null;
  specialization?: string | null;
  profile_description?: string | null;
  eq_id?: string | null;
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

  // Edit mode state
  const [isOwner, setIsOwner] = useState(false);
  const [editableCustomData, setEditableCustomData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [formKeys, setFormKeys] = useState<string[]>([]);
  const [activeFormKey, setActiveFormKey] = useState<string | null>(null);

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

      // Check if current user is the owner
      const { data: { user } } = await supabase.auth.getUser();
      const ownerCheck = !!user && user.id === pageData.user_id;
      setIsOwner(ownerCheck);
      setEditableCustomData((pageData as any).custom_data || {});

      const templateQuery = (pageData as any).selected_template_id
        ? supabase.from('partner_page_template').select('template_data').eq('id', (pageData as any).selected_template_id).maybeSingle()
        : supabase.from('partner_page_template').select('template_data').limit(1).maybeSingle();

      const [templateRes, profileRes, productsRes, linksRes, formsRes] = await Promise.all([
        templateQuery,
        supabase.from('profiles').select('first_name, last_name, avatar_url, email, phone_number, city, country, specialization, profile_description, eq_id').eq('user_id', pageData.user_id).maybeSingle(),
        supabase.from('product_catalog').select('*').eq('is_active', true).order('position'),
        supabase.from('partner_product_links').select('*').eq('partner_page_id', pageData.id).eq('is_active', true).order('position'),
        supabase.from('partner_page_forms').select('cta_key').eq('is_active', true),
      ]);

      setTemplate(((templateRes.data?.template_data as any) || []).sort((a: TemplateElement, b: TemplateElement) => a.position - b.position));
      setProfile(profileRes.data as any);
      setProducts(productsRes.data as any || []);
      setProductLinks((linksRes.data as any) || []);
      setFormKeys((formsRes.data || []).map((f: any) => f.cta_key));
      setLoading(false);
    };

    fetchPage();
  }, [alias]);

  const updateField = useCallback((elementId: string, fieldName: string, value: string) => {
    setEditableCustomData(prev => ({
      ...prev,
      [elementId]: {
        ...(prev[elementId] || {}),
        [fieldName]: value,
      },
    }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!page) return;
    setSaving(true);
    const { error } = await supabase
      .from('partner_pages')
      .update({ custom_data: editableCustomData } as any)
      .eq('id', page.id);
    setSaving(false);
    if (error) {
      toast.error('Błąd zapisu: ' + error.message);
    } else {
      toast.success('Zmiany zapisane!');
      setHasChanges(false);
    }
  }, [page, editableCustomData]);

  const handleProductLinkSave = useCallback(async (productId: string, purchaseUrl: string) => {
    if (!page) return;
    const existing = productLinks.find(l => l.product_id === productId);
    if (existing) {
      const { error } = await supabase
        .from('partner_product_links')
        .update({ purchase_url: purchaseUrl } as any)
        .eq('id', existing.id);
      if (error) { toast.error('Błąd zapisu linku'); return; }
      setProductLinks(prev => prev.map(l => l.id === existing.id ? { ...l, purchase_url: purchaseUrl } : l));
    } else {
      const { data, error } = await supabase
        .from('partner_product_links')
        .insert({ partner_page_id: page.id, product_id: productId, purchase_url: purchaseUrl, position: productLinks.length } as any)
        .select()
        .single();
      if (error) { toast.error('Błąd zapisu linku'); return; }
      setProductLinks(prev => [...prev, data as any]);
    }
    toast.success('Link zapisany!');
  }, [page, productLinks]);

  const handleSurveyOpen = useCallback(() => setSurveyOpen(true), []);

  if (loading) return <LoadingSpinner />;
  if (notFound || !page) return <NotFound />;

  const customData = isOwner ? editableCustomData : (page.custom_data || {});
  const partnerName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';

  const linkedProducts = productLinks
    .map(link => ({
      ...link,
      product: products.find(p => p.id === link.product_id),
    }))
    .filter(lp => lp.product && lp.purchase_url);

  // Check if any element uses the new rich types
  const RICH_TYPES = ['hero', 'text_image', 'steps', 'timeline', 'testimonials', 'products_grid', 'faq', 'cta_banner', 'header', 'contact_form', 'footer', 'products_with_form', 'survey'];
  const hasRichSections = template.some(el => RICH_TYPES.includes(el.type));

  const profileData: PartnerProfileData = {
    first_name: profile?.first_name,
    last_name: profile?.last_name,
    email: profile?.email,
    phone_number: profile?.phone_number,
    city: profile?.city,
    country: profile?.country,
    specialization: profile?.specialization,
    profile_description: profile?.profile_description,
    eq_id: profile?.eq_id,
    avatar_url: profile?.avatar_url,
  };

  // Extract survey config (not rendered inline)
  const surveyElement = template.find(el => el.type === 'survey');
  const surveyConfig = surveyElement
    ? resolveVariablesInConfig(
        getMergedConfig(surveyElement.config || {}, customData[surveyElement.id] || {}),
        profileData,
      )
    : null;


  const renderSection = (element: TemplateElement) => {
    if (element.type === 'survey') return null; // rendered as modal instead

    const baseCfg = element.config || {};
    const partnerOverrides = customData[element.id] || {};
    const mergedCfg = getMergedConfig(baseCfg, partnerOverrides);
    const cfg = resolveVariablesInConfig(mergedCfg, profileData);
    const anchorId = baseCfg.anchor_id || element.id;

    let sectionNode: React.ReactNode = null;

    switch (element.type) {
      case 'header':
        sectionNode = <HeaderSection config={cfg} partnerName={partnerName} onSurveyOpen={surveyConfig ? handleSurveyOpen : undefined} />;
        break;
      case 'hero':
        sectionNode = <HeroSection config={cfg} onSurveyOpen={surveyConfig ? handleSurveyOpen : undefined} />;
        break;
      case 'text_image':
        sectionNode = <TextImageSection config={cfg} />;
        break;
      case 'steps':
        sectionNode = <StepsSection config={cfg} />;
        break;
      case 'timeline':
        sectionNode = <TimelineSection config={cfg} />;
        break;
      case 'testimonials':
        sectionNode = <TestimonialsSection config={cfg} />;
        break;
      case 'products_grid':
        sectionNode = <ProductsGridSection config={cfg} products={products} productLinks={linkedProducts} isEditing={isOwner} onProductLinkSave={handleProductLinkSave} />;
        break;
      case 'faq':
        sectionNode = <FaqSection config={cfg} />;
        break;
      case 'cta_banner':
        sectionNode = <CtaBannerSection config={cfg} onSurveyOpen={surveyConfig ? handleSurveyOpen : undefined} />;
        break;
      case 'contact_form':
        sectionNode = <ContactFormSection config={cfg} partnerEmail={profile?.email || undefined} partnerUserId={page?.user_id} />;
        break;
      case 'footer':
        sectionNode = <FooterSection config={cfg} />;
        break;
      case 'products_with_form':
        sectionNode = <ProductsWithFormSection config={cfg} products={products} productLinks={linkedProducts} partnerEmail={profile?.email || undefined} partnerUserId={page?.user_id} isEditing={isOwner} onProductLinkSave={handleProductLinkSave} />;
        break;
      case 'static':
        sectionNode = element.content ? (
          <section className="bg-background">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
              <div className="prose prose-sm max-w-none dark:prose-invert text-foreground"
                dangerouslySetInnerHTML={{ __html: element.content }} />
            </div>
          </section>
        ) : null;
        break;
      default:
        return null;
    }

    if (!sectionNode) return null;

    return (
      <div key={element.id} id={anchorId}>
        <EditableWrapper
          elementId={element.id}
          config={baseCfg}
          overrides={customData[element.id] || {}}
          onSave={(fieldName, value) => updateField(element.id, fieldName, value)}
          isEditing={isOwner}
        >
          {sectionNode}
        </EditableWrapper>
      </div>
    );
  };

  if (hasRichSections) {
    return (
      <div className="min-h-screen bg-background">
        {/* Floating edit toolbar for owner */}
        {isOwner && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Pencil className="w-4 h-4 text-primary" />
              <span>Tryb edycji</span>
            </div>
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            )}
          </div>
        )}

        {template.map(renderSection)}

        {/* Survey modal */}
        {surveyConfig && (
          <SurveyModal config={surveyConfig} open={surveyOpen} onClose={() => setSurveyOpen(false)} />
        )}
      </div>
    );
  }

  // ─── Legacy template rendering (backward compatible) ───
  const partnerTitle = customData['partner_title'] || '';
  const partnerPhoto = customData['partner_photo'] || '';
  const partnerBio = customData['partner_bio'] || '';
  const contactEmail = customData['contact_email'] || '';
  const contactPhone = customData['contact_phone'] || '';
  const contactFacebook = customData['contact_facebook'] || '';

  const heroElement = template.find(e => e.id === 'hero_banner');
  const welcomeElement = template.find(e => e.id === 'welcome_section');
  const orderElement = template.find(e => e.id === 'order_section');
  const contactStaticElement = template.find(e => e.id === 'contact_section_static');
  const aboutHeadingElement = template.find(e => e.id === 'about_heading');
  const footerElement = template.find(e => e.id === 'footer_branding');

  const hasAboutSection = partnerPhoto || partnerBio || contactEmail || contactPhone || contactFacebook;

  return (
    <div className="min-h-screen bg-card">
      {/* TOP BAR */}
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={partnerName} className="w-10 h-10 rounded-full object-cover border-2 border-primary/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground text-sm sm:text-base">{partnerName}</p>
              {partnerTitle && <p className="text-xs text-muted-foreground">{partnerTitle}</p>}
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg sm:text-xl font-bold text-primary tracking-tight">Pure Life</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      {heroElement?.content && (
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
            <div className="prose prose-sm max-w-none dark:prose-invert text-foreground" dangerouslySetInnerHTML={{ __html: heroElement.content }} />
            {linkedProducts.length > 0 && (
              <a href="#products" className="inline-flex items-center gap-2 mt-6 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                Zobacz produkty <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </section>
      )}

      {/* WELCOME */}
      {welcomeElement?.content && (
        <section className="bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert text-foreground text-center" dangerouslySetInnerHTML={{ __html: welcomeElement.content }} />
          </div>
        </section>
      )}

      {/* PRODUCTS */}
      {linkedProducts.length > 0 && (
        <section id="products" className="bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-8 text-center">Moje polecane produkty</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {linkedProducts.map(({ product, purchase_url }) => (
                <a key={product!.id} href={purchase_url} target="_blank" rel="noopener noreferrer"
                  className="group block bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  {product!.image_url && (
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img src={product!.image_url} alt={product!.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-3 text-center">
                    <h3 className="font-medium text-foreground text-sm">{product!.name}</h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ORDER (Accordion) */}
      {orderElement?.content && (
        <section className="bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full bg-card border border-border rounded-xl px-5 py-4 text-left hover:bg-muted/50 transition-colors group">
                <span className="font-semibold text-foreground text-base">{(orderElement as any).title || 'Zamówienie'}</span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 bg-card border border-border rounded-xl px-5 py-4">
                <div className="prose prose-sm max-w-none dark:prose-invert text-foreground" dangerouslySetInnerHTML={{ __html: orderElement.content }} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </section>
      )}

      {/* CONTACT STATIC (Accordion) */}
      {contactStaticElement?.content && (
        <section className="bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full bg-card border border-border rounded-xl px-5 py-4 text-left hover:bg-muted/50 transition-colors group">
                <span className="font-semibold text-foreground text-base">{(contactStaticElement as any).title || 'Bądź z nami w kontakcie!'}</span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 bg-card border border-border rounded-xl px-5 py-4">
                <div className="prose prose-sm max-w-none dark:prose-invert text-foreground" dangerouslySetInnerHTML={{ __html: contactStaticElement.content }} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </section>
      )}

      {/* ABOUT / CONTACT */}
      {hasAboutSection && (
        <section className="bg-card border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            {aboutHeadingElement?.content && (
              <div className="prose prose-sm max-w-none dark:prose-invert mb-8 text-center text-foreground" dangerouslySetInnerHTML={{ __html: aboutHeadingElement.content }} />
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              <div className="flex justify-center md:justify-start">
                {partnerPhoto ? (
                  <img src={partnerPhoto} alt={partnerName} className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover shadow-md border border-border" />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-muted flex items-center justify-center border border-border">
                    <User className="w-16 h-16 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="md:col-span-1">
                {partnerBio && <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{partnerBio}</p>}
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground text-base">Kontakt</h3>
                {contactEmail && (
                  <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <span className="break-all">{contactEmail}</span>
                  </a>
                )}
                {contactPhone && (
                  <a href={`tel:${contactPhone}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <span>{contactPhone}</span>
                  </a>
                )}
                {contactFacebook && (
                  <a href={contactFacebook.startsWith('http') ? contactFacebook : `https://${contactFacebook}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group">
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

      {/* FOOTER */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center">
          {footerElement?.content ? (
            <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground" dangerouslySetInnerHTML={{ __html: footerElement.content }} />
          ) : (
            <p className="text-sm text-muted-foreground font-medium">Pure Life Center</p>
          )}
        </div>
      </footer>
    </div>
  );
};

export default PartnerPageView;
