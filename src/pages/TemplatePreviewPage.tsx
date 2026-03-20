import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { TemplateElement, ProductCatalogItem } from '@/types/partnerPage';
import { SectionConfigEditor } from '@/components/admin/template-sections/SectionConfigEditor';
import { DragDropProvider } from '@/components/dnd/DragDropProvider';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { DragOverlay } from '@dnd-kit/core';
import { SortableSectionWrapper } from '@/components/admin/template-preview/SortableSectionWrapper';
import { AddSectionMenu } from '@/components/admin/template-preview/AddSectionMenu';
import { DEFAULT_SECTION_CONFIGS } from '@/components/admin/template-preview/defaultSectionConfigs';
import { resolveVariablesInConfig, PREVIEW_PROFILE } from '@/lib/partnerVariables';
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
  static: 'Statyczny (HTML)', hero: 'Hero (banner)', text_image: 'Tekst + Obraz',
  steps: 'Kroki', timeline: 'Oś czasu', testimonials: 'Opinie',
  products_grid: 'Siatka produktów', faq: 'FAQ', cta_banner: 'Baner CTA',
  header: 'Nagłówek', contact_form: 'Formularz kontaktowy', footer: 'Stopka',
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
  const [allTemplates, setAllTemplates] = useState<{ id: string; name: string }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!templateId) { setLoading(false); return; }
      const [templateRes, productsRes, allTemplatesRes] = await Promise.all([
        supabase.from('partner_page_template').select('name, template_data').eq('id', templateId).maybeSingle(),
        supabase.from('product_catalog').select('*').eq('is_active', true).order('position'),
        supabase.from('partner_page_template').select('id, name').order('name'),
      ]);
      if (templateRes.data) {
        setTemplateName(templateRes.data.name);
        setTemplate(
          ((templateRes.data.template_data as any) || []).sort((a: TemplateElement, b: TemplateElement) => a.position - b.position)
        );
      }
      setProducts((productsRes.data as any) || []);
      setAllTemplates((allTemplatesRes.data as any) || []);
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

  const handleDragEnd = useCallback((event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTemplate(prev => {
      const oldIndex = prev.findIndex(el => el.id === active.id);
      const newIndex = prev.findIndex(el => el.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleAddSection = useCallback((type: string, insertAt: number) => {
    const newEl: TemplateElement = {
      id: crypto.randomUUID(),
      type: type as TemplateElement['type'],
      position: insertAt,
      config: { ...(DEFAULT_SECTION_CONFIGS[type] || {}) },
    };
    setTemplate(prev => {
      const next = [...prev];
      next.splice(insertAt, 0, newEl);
      return next.map((el, i) => ({ ...el, position: i }));
    });
    setEditingIndex(insertAt);
  }, []);

  const handleCopySection = useCallback((index: number) => {
    const el = template[index];
    localStorage.setItem('copied_section', JSON.stringify(el));
    toast({ title: 'Sekcja skopiowana do schowka' });
  }, [template, toast]);

  const handlePasteSection = useCallback((insertAt: number) => {
    const raw = localStorage.getItem('copied_section');
    if (!raw) return;
    try {
      const el = JSON.parse(raw) as TemplateElement;
      el.id = crypto.randomUUID();
      el.position = insertAt;
      setTemplate(prev => {
        const next = [...prev];
        next.splice(insertAt, 0, el);
        return next.map((e, i) => ({ ...e, position: i }));
      });
      toast({ title: 'Sekcja wklejona' });
    } catch { /* ignore */ }
  }, [toast]);

  const handleDuplicate = useCallback((index: number) => {
    setTemplate(prev => {
      const el = prev[index];
      const clone: TemplateElement = {
        ...el,
        id: crypto.randomUUID(),
        config: { ...el.config },
        position: index + 1,
      };
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next.map((el, i) => ({ ...el, position: i }));
    });
  }, []);

  const handleDelete = useCallback((index: number) => {
    setTemplate(prev => prev.filter((_, i) => i !== index).map((el, i) => ({ ...el, position: i })));
    if (editingIndex === index) setEditingIndex(null);
  }, [editingIndex]);

  if (loading) return <LoadingSpinner />;

  const dummyLinks = products.map((p, i) => ({
    id: `preview-${p.id}`, partner_page_id: 'preview', product_id: p.id,
    purchase_url: '#', position: i, is_active: true, created_at: '', product: p,
  }));

  const renderSection = (element: TemplateElement) => {
    const cfg = resolveVariablesInConfig(element.config || {}, PREVIEW_PROFILE);
    const anchorId = cfg.anchor_id || element.id;
    const wrapWithAnchor = (node: React.ReactNode) => <div id={anchorId}>{node}</div>;
    switch (element.type) {
      case 'header': return wrapWithAnchor(<HeaderSection config={cfg} partnerName="Jan Kowalski (podgląd)" disableSticky />);
      case 'hero': return wrapWithAnchor(<HeroSection config={cfg} />);
      case 'text_image': return wrapWithAnchor(<TextImageSection config={cfg} />);
      case 'steps': return wrapWithAnchor(<StepsSection config={cfg} />);
      case 'timeline': return wrapWithAnchor(<TimelineSection config={cfg} />);
      case 'testimonials': return wrapWithAnchor(<TestimonialsSection config={cfg} />);
      case 'products_grid': return wrapWithAnchor(<ProductsGridSection config={cfg} products={products} productLinks={dummyLinks} />);
      case 'faq': return wrapWithAnchor(<FaqSection config={cfg} />);
      case 'cta_banner': return wrapWithAnchor(<CtaBannerSection config={cfg} />);
      case 'contact_form': return wrapWithAnchor(<ContactFormSection config={cfg} partnerEmail="preview@example.com" />);
      case 'footer': return wrapWithAnchor(<FooterSection config={cfg} />);
      case 'products_with_form': return wrapWithAnchor(<ProductsWithFormSection config={cfg} products={products} productLinks={dummyLinks} partnerEmail="preview@example.com" />);
      case 'static':
        return element.content ? wrapWithAnchor(
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
  const itemIds = template.map(el => el.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=partner-pages')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Wróć do edytora
          </Button>
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            Podgląd szablonu:
            <Select value={templateId} onValueChange={(id) => navigate(`/admin/template-preview/${id}`)}>
              <SelectTrigger className="h-8 w-[200px] text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </Button>
      </div>

      {/* Content */}
      <div className="pt-12">
        <AddSectionMenu onAdd={(type) => handleAddSection(type, 0)} onPaste={() => handlePasteSection(0)} />

        {template.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Szablon jest pusty — dodaj sekcję powyżej.
          </div>
        ) : (
          <DragDropProvider
            items={itemIds}
            onDragStart={(e) => setActiveId(String(e.active.id))}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {template.map((element, index) => (
                <React.Fragment key={element.id}>
                  <SortableSectionWrapper
                    id={element.id}
                    label={TYPE_LABELS[element.type] || element.type}
                    isEditing={editingIndex === index}
                    onEdit={() => setEditingIndex(index)}
                    onDuplicate={() => handleDuplicate(index)}
                    onDelete={() => handleDelete(index)}
                    onCopyToClipboard={() => handleCopySection(index)}
                  >
                    {renderSection(element)}
                  </SortableSectionWrapper>
                  <AddSectionMenu onAdd={(type) => handleAddSection(type, index + 1)} onPaste={() => handlePasteSection(index + 1)} />
                </React.Fragment>
              ))}
            </SortableContext>
          </DragDropProvider>
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
