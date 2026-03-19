import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { TemplateElement, ProductCatalogItem } from '@/types/partnerPage';
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
} from '@/components/partner-page/sections';

const TemplatePreviewPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<TemplateElement[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);

  useEffect(() => {
    const fetch = async () => {
      if (!templateId) { setLoading(false); return; }

      const [templateRes, productsRes] = await Promise.all([
        supabase.from('partner_page_template').select('name, template_data').eq('id', templateId).maybeSingle(),
        supabase.from('product_catalog').select('*').eq('is_active', true).order('position'),
      ]);

      if (templateRes.data) {
        setTemplateName(templateRes.data.name);
        setTemplate(
          ((templateRes.data.template_data as any) || []).sort((a: TemplateElement, b: TemplateElement) => a.position - b.position)
        );
      }
      setProducts((productsRes.data as any) || []);
      setLoading(false);
    };
    fetch();
  }, [templateId]);

  if (loading) return <LoadingSpinner />;

  const renderSection = (element: TemplateElement) => {
    const cfg = element.config || {};
    const dummyLinks = products.map((p, i) => ({
      id: `preview-${p.id}`,
      partner_page_id: 'preview',
      product_id: p.id,
      purchase_url: '#',
      position: i,
      is_active: true,
      created_at: '',
      product: p,
    }));

    switch (element.type) {
      case 'header':
        return <HeaderSection key={element.id} config={cfg} partnerName="Jan Kowalski (podgląd)" />;
      case 'hero':
        return <HeroSection key={element.id} config={cfg} />;
      case 'text_image':
        return <TextImageSection key={element.id} config={cfg} />;
      case 'steps':
        return <StepsSection key={element.id} config={cfg} />;
      case 'timeline':
        return <TimelineSection key={element.id} config={cfg} />;
      case 'testimonials':
        return <TestimonialsSection key={element.id} config={cfg} />;
      case 'products_grid':
        return <ProductsGridSection key={element.id} config={cfg} products={products} productLinks={dummyLinks} />;
      case 'faq':
        return <FaqSection key={element.id} config={cfg} />;
      case 'cta_banner':
        return <CtaBannerSection key={element.id} config={cfg} />;
      case 'contact_form':
        return <ContactFormSection key={element.id} config={cfg} partnerEmail="preview@example.com" />;
      case 'footer':
        return <FooterSection key={element.id} config={cfg} />;
      case 'products_with_form':
        return <ProductsWithFormSection key={element.id} config={cfg} products={products} productLinks={dummyLinks} partnerEmail="preview@example.com" />;
      case 'static':
        return element.content ? (
          <section key={element.id} className="bg-background">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
              <div className="prose prose-sm max-w-none dark:prose-invert text-foreground"
                dangerouslySetInnerHTML={{ __html: element.content }} />
            </div>
          </section>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Wróć do edytora
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Podgląd szablonu: <span className="text-foreground">{templateName}</span>
          </span>
        </div>
      </div>

      {/* Content with top padding for fixed bar */}
      <div className="pt-12">
        {template.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Szablon jest pusty — dodaj elementy w edytorze.
          </div>
        ) : (
          template.map(renderSection)
        )}
      </div>
    </div>
  );
};

export default TemplatePreviewPage;
