import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, GripVertical, ChevronUp, ChevronDown, Layout, Eye, ArrowLeft, Edit, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TemplateElement, TemplateElementType, PartnerPageTemplate } from '@/types/partnerPage';
import {
  HeroSectionEditor,
  StepsSectionEditor,
  TimelineSectionEditor,
  TestimonialsSectionEditor,
  FaqSectionEditor,
  CtaBannerEditor,
  TextImageSectionEditor,
  ProductsGridEditor,
  HeaderSectionEditor,
  ContactFormEditor,
  FooterSectionEditor,
  ProductsWithFormEditor,
} from './template-sections';

const TYPE_LABELS: Record<string, string> = {
  static: 'Statyczny (HTML)',
  editable_text: 'Tekst (edytowalny)',
  editable_image: 'Obrazek (edytowalny)',
  product_slot: 'Produkty (slot)',
  hero: 'Hero (banner)',
  text_image: 'Tekst + Obraz',
  steps: 'Kroki (steps)',
  timeline: 'Oś czasu',
  testimonials: 'Opinie / Social proof',
  products_grid: 'Siatka produktów',
  faq: 'FAQ (akordeon)',
  cta_banner: 'Baner CTA',
  header: 'Nagłówek strony',
  contact_form: 'Formularz kontaktowy',
  footer: 'Stopka',
  products_with_form: 'Produkty + Formularz',
};

const defaultElement = (position: number): TemplateElement => ({
  id: `element_${Date.now()}`,
  type: 'static',
  label: '',
  content: '',
  placeholder: '',
  max_length: 500,
  position,
  style: {},
  config: {},
});

const SectionConfigEditor: React.FC<{
  element: TemplateElement;
  onConfigChange: (config: Record<string, any>) => void;
}> = ({ element, onConfigChange }) => {
  const cfg = element.config || {};
  switch (element.type) {
    case 'hero': return <HeroSectionEditor config={cfg} onChange={onConfigChange} />;
    case 'text_image': return <TextImageSectionEditor config={cfg} onChange={onConfigChange} />;
    case 'steps': return <StepsSectionEditor config={cfg} onChange={onConfigChange} />;
    case 'timeline': return <TimelineSectionEditor config={cfg} onChange={onConfigChange} />;
    case 'testimonials': return <TestimonialsSectionEditor config={cfg} onChange={onConfigChange} />;
    case 'products_grid': return <ProductsGridEditor config={cfg} onChange={onConfigChange} />;
    case 'faq': return <FaqSectionEditor config={cfg} onChange={onConfigChange} />;
    case 'cta_banner': return <CtaBannerEditor config={cfg} onChange={onConfigChange} />;
    case 'header': return <HeaderSectionEditor config={cfg} onChange={onConfigChange} />;
    case 'contact_form': return <ContactFormEditor config={cfg} onChange={onConfigChange} />;
    case 'footer': return <FooterSectionEditor config={cfg} onChange={onConfigChange} />;
    case 'products_with_form': return <ProductsWithFormEditor config={cfg} onChange={onConfigChange} />;
    default: return null;
  }
};

const RICH_TYPES: TemplateElementType[] = ['hero', 'text_image', 'steps', 'timeline', 'testimonials', 'products_grid', 'faq', 'cta_banner', 'header', 'contact_form', 'footer', 'products_with_form'];

// ─── Template List View ───
const TemplateListView: React.FC<{
  templates: PartnerPageTemplate[];
  onEdit: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}> = ({ templates, onEdit, onAdd, onDelete, onToggleActive }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Szablony stron partnerskich
            </CardTitle>
            <CardDescription>
              Zarządzaj szablonami. Partner wybierze jeden z aktywnych szablonów.
            </CardDescription>
          </div>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Dodaj szablon
          </Button>
        </div>
      </CardHeader>
    </Card>

    {templates.length === 0 ? (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Brak szablonów. Kliknij „Dodaj szablon", aby utworzyć pierwszy.</p>
        </CardContent>
      </Card>
    ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const elementCount = (t.template_data || []).length;
          return (
            <Card key={t.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <Badge variant={t.is_active ? 'default' : 'secondary'}>
                    {t.is_active ? 'Aktywny' : 'Nieaktywny'}
                  </Badge>
                </div>
                {t.description && <CardDescription>{t.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{elementCount} elementów</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Aktywny</Label>
                    <Switch checked={t.is_active} onCheckedChange={(v) => onToggleActive(t.id, v)} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(t.id)}>
                      <Edit className="w-4 h-4 mr-1" /> Edytuj
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(t.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    )}
  </div>
);

// ─── Template Detail Editor ───
const TemplateDetailEditor: React.FC<{
  template: PartnerPageTemplate;
  onBack: () => void;
  onSaved: () => void;
}> = ({ template, onBack, onSaved }) => {
  const { toast } = useToast();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');
  const [elements, setElements] = useState<TemplateElement[]>(
    (template.template_data || []).sort((a, b) => a.position - b.position)
  );
  const [saving, setSaving] = useState(false);
  

  const handleSave = async () => {
    setSaving(true);
    const sorted = elements.map((el, i) => ({ ...el, position: i }));
    const { error } = await supabase
      .from('partner_page_template')
      .update({ template_data: sorted as any, name, description: description || null })
      .eq('id', template.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Szablon zapisany' });
      onSaved();
    }
    setSaving(false);
  };

  const addElement = () => setElements(prev => [...prev, defaultElement(prev.length)]);
  const removeElement = (index: number) => setElements(prev => prev.filter((_, i) => i !== index));
  const updateElement = (index: number, updates: Partial<TemplateElement>) =>
    setElements(prev => prev.map((el, i) => (i === index ? { ...el, ...updates } : el)));
  const moveElement = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= elements.length) return;
    const arr = [...elements];
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    setElements(arr);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Wróć do listy
              </Button>
              <CardTitle className="text-lg">Edycja: {name}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.open(`/admin/template-preview/${template.id}`, '_blank')}>
                <Eye className="w-4 h-4 mr-1" /> Podgląd
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {saving ? 'Zapisywanie...' : 'Zapisz'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nazwa szablonu</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa..." />
            </div>
            <div>
              <Label>Opis</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Krótki opis..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {previewMode ? (
        <Card>
          <CardHeader><CardTitle className="text-lg">Podgląd szablonu</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4 border rounded-lg p-6 bg-muted/30">
              {elements.map((el) => (
                <div key={el.id} className="border rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{TYPE_LABELS[el.type] || el.type}</Badge>
                    {el.label && <span className="text-sm font-medium">{el.label}</span>}
                  </div>
                  {el.type === 'static' && (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: el.content || '<em>Brak treści</em>' }} />
                  )}
                  {RICH_TYPES.includes(el.type) && (
                    <div className="bg-primary/5 border-dashed border-2 border-primary/30 rounded p-3 text-sm text-muted-foreground">
                      🧩 Sekcja: {TYPE_LABELS[el.type]}
                    </div>
                  )}
                </div>
              ))}
              {elements.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Szablon jest pusty.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {elements.map((element, index) => (
            <Card key={element.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col gap-1 pt-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveElement(index, 'up')} disabled={index === 0}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <GripVertical className="w-4 h-4 text-muted-foreground mx-auto" />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveElement(index, 'down')} disabled={index === elements.length - 1}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <Badge>{index + 1}</Badge>
                      <div className="flex-1">
                        <Select value={element.type} onValueChange={(v) => updateElement(index, { type: v as TemplateElementType, config: {} })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeElement(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Label for legacy types */}
                    {!RICH_TYPES.includes(element.type) && element.type !== 'static' && (
                      <div>
                        <Label>Etykieta (widoczna dla partnera)</Label>
                        <Input value={element.label || ''} onChange={(e) => updateElement(index, { label: e.target.value })} />
                      </div>
                    )}

                    {/* Static HTML */}
                    {element.type === 'static' && (
                      <div>
                        <Label>Treść HTML</Label>
                        <Textarea value={element.content || ''} onChange={(e) => updateElement(index, { content: e.target.value })} placeholder="<h2>Nagłówek</h2>" rows={4} />
                      </div>
                    )}

                    {/* Legacy editable_text */}
                    {element.type === 'editable_text' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Placeholder</Label>
                          <Input value={element.placeholder || ''} onChange={(e) => updateElement(index, { placeholder: e.target.value })} />
                        </div>
                        <div>
                          <Label>Max. znaków</Label>
                          <Input type="number" value={element.max_length || 500} onChange={(e) => updateElement(index, { max_length: parseInt(e.target.value) || 500 })} />
                        </div>
                      </div>
                    )}

                    {/* Rich section config editors */}
                    {RICH_TYPES.includes(element.type) && (
                      <div className="border-t pt-4">
                        <SectionConfigEditor
                          element={element}
                          onConfigChange={(config) => updateElement(index, { config })}
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground">ID elementu</Label>
                      <Input value={element.id} onChange={(e) => updateElement(index, { id: e.target.value.replace(/[^a-z0-9_]/g, '') })} className="text-xs font-mono" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button onClick={addElement} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Dodaj element
          </Button>
        </>
      )}
    </div>
  );
};

// ─── Main Component ───
export const PartnerTemplateEditor: React.FC = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PartnerPageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    const { data } = await supabase.from('partner_page_template').select('*').order('position');
    setTemplates((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleAdd = async () => {
    const { data, error } = await supabase
      .from('partner_page_template')
      .insert({ name: 'Nowy szablon', template_data: [] as any, position: templates.length })
      .select()
      .single();
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } else if (data) {
      await fetchTemplates();
      setEditingId(data.id);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Na pewno usunąć ten szablon?')) return;
    await supabase.from('partner_page_template').delete().eq('id', id);
    await fetchTemplates();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('partner_page_template').update({ is_active: active }).eq('id', id);
    await fetchTemplates();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const editingTemplate = editingId ? templates.find(t => t.id === editingId) : null;

  if (editingTemplate) {
    return (
      <TemplateDetailEditor
        template={editingTemplate}
        onBack={() => setEditingId(null)}
        onSaved={() => { fetchTemplates(); }}
      />
    );
  }

  return (
    <TemplateListView
      templates={templates}
      onEdit={setEditingId}
      onAdd={handleAdd}
      onDelete={handleDelete}
      onToggleActive={handleToggleActive}
    />
  );
};

export default PartnerTemplateEditor;
