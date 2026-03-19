import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Save, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { TemplateElement, ProductCatalogItem } from '@/types/partnerPage';
import { SectionConfigEditor } from '@/components/admin/template-sections/SectionConfigEditor';
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

const TYPE_LABELS: Record<string, string> = {
  static: 'Statyczny (HTML)',
  hero: 'Hero (banner)',
  text_image: 'Tekst + Obraz',
  steps: 'Kroki',
  timeline: 'Oś czasu',
  testimonials: 'Opinie',
  products_grid: 'Siatka produktów',
  faq: 'FAQ',
  cta_banner: 'Baner CTA',
  header: 'Nagłówek',
  contact_form: 'Formularz kontaktowy',
  footer: 'Stopka',
  products_with_form: 'Produkty + Formularz',
};

const TemplatePreviewPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<TemplateElement[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, [templateId]);

  const handleConfigChange = (index: number, config: Record<string, any>) => {
    setTemplate(prev => prev.map((el, i) => i === index ? { ...el, config } : el));
  };

  const handleSave = async () => {
    if (!templateId) return;
    setSaving(true);
    const sorted = template.map((el, i) => ({ ...el, position: i }));
    const { error } = await supabase
      .from('partner_page_template')
      .update({ template_data: sorted as any })
      .eq('id', templateId);
    if (error) {
      toast({ title: 'Błąd zapisu', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Zapisano zmiany' });
    }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;

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

  const renderSection = (element: TemplateElement) => {
    const cfg = element.config || {};
    switch (element.type) {
      case 'header': return <HeaderSection config={cfg} partnerName="Jan Kowalski (podgląd)" />;
      case 'hero': return <HeroSection config={cfg} />;
      case 'text_image': return <TextImageSection config={cfg} />;
      case 'steps': return <StepsSection config={cfg} />;
      case 'timeline': return <TimelineSection config={cfg} />;
      case 'testimonials': return <TestimonialsSection config={cfg} />;
      case 'products_grid': return <ProductsGridSection config={cfg} products={products} productLinks={dummyLinks} />;
      case 'faq': return <FaqSection config={cfg} />;
      case 'cta_banner': return <CtaBannerSection config={cfg} />;
      case 'contact_form': return <ContactFormSection config={cfg} partnerEmail="preview@example.com" />;
      case 'footer': return <FooterSection config={cfg} />;
      case 'products_with_form': return <ProductsWithFormSection config={cfg} products={products} productLinks={dummyLinks} partnerEmail="preview@example.com" />;
      case 'static':
        return element.content ? (
          <section className="bg-background">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
              <div className="prose prose-sm max-w-none dark:prose-invert text-foreground"
                dangerouslySetInnerHTML={{ __html: element.content }} />
            </div>
          </section>
        ) : null;
      default: return null;
    }
  };

  const editingElement = editingIndex !== null ? template[editingIndex] : null;

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
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </Button>
      </div>

      {/* Content */}
      <div className="pt-12">
        {template.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Szablon jest pusty — dodaj elementy w edytorze.
          </div>
        ) : (
          template.map((element, index) => (
            <div
              key={element.id}
              className={`relative cursor-pointer transition-all duration-150 ${
                hoveredIndex === index ? 'ring-2 ring-primary ring-inset' : ''
              } ${editingIndex === index ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}`}
              onClick={() => setEditingIndex(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {renderSection(element)}
              {/* Hover overlay with edit icon */}
              {(hoveredIndex === index || editingIndex === index) && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded shadow font-medium">
                    {TYPE_LABELS[element.type] || element.type}
                  </span>
                  <div className="bg-primary text-primary-foreground rounded p-1.5 shadow">
                    <Pencil className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Side editor sheet */}
      <Sheet open={editingIndex !== null} onOpenChange={(open) => { if (!open) setEditingIndex(null); }}>
        <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">
                Edycja: {editingElement ? (TYPE_LABELS[editingElement.type] || editingElement.type) : ''}
              </SheetTitle>
            </div>
          </SheetHeader>
          <ScrollArea className="flex-1 px-4 py-4">
            {editingElement && (
              <SectionConfigEditor
                element={editingElement}
                onConfigChange={(config) => handleConfigChange(editingIndex!, config)}
              />
            )}
          </ScrollArea>
          <div className="px-4 py-3 border-t border-border flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
            <Button variant="outline" onClick={() => setEditingIndex(null)}>
              <X className="w-4 h-4 mr-1" /> Zamknij
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TemplatePreviewPage;
