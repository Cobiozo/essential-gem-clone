import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Save, GripVertical, ChevronUp, ChevronDown, Layout, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TemplateElement } from '@/types/partnerPage';

const TYPE_LABELS: Record<string, string> = {
  static: 'Statyczny (HTML)',
  editable_text: 'Tekst (edytowalny)',
  editable_image: 'Obrazek (edytowalny)',
  product_slot: 'Produkty (slot)',
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
});

export const PartnerTemplateEditor: React.FC = () => {
  const { toast } = useToast();
  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('partner_page_template')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (data) {
        setTemplateId(data.id);
        setElements(((data.template_data as any) || []).sort((a: TemplateElement, b: TemplateElement) => a.position - b.position));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    if (!templateId) return;
    setSaving(true);
    const sorted = elements.map((el, i) => ({ ...el, position: i }));
    const { error } = await supabase
      .from('partner_page_template')
      .update({ template_data: sorted as any })
      .eq('id', templateId);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } else {
      setElements(sorted);
      toast({ title: 'Szablon zapisany' });
    }
    setSaving(false);
  };

  const addElement = () => {
    setElements(prev => [...prev, defaultElement(prev.length)]);
  };

  const removeElement = (index: number) => {
    setElements(prev => prev.filter((_, i) => i !== index));
  };

  const updateElement = (index: number, updates: Partial<TemplateElement>) => {
    setElements(prev => prev.map((el, i) => i === index ? { ...el, ...updates } : el));
  };

  const moveElement = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= elements.length) return;
    const newElements = [...elements];
    [newElements[index], newElements[newIndex]] = [newElements[newIndex], newElements[index]];
    setElements(newElements);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Edytor szablonu strony partnerskiej
              </CardTitle>
              <CardDescription>
                Definiuj sekcje i elementy szablonu. Elementy oznaczone jako edytowalne będą widoczne dla partnerów.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                <Eye className="w-4 h-4 mr-1" />
                {previewMode ? 'Edycja' : 'Podgląd'}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {saving ? 'Zapisywanie...' : 'Zapisz szablon'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Preview mode */}
      {previewMode ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Podgląd szablonu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 border rounded-lg p-6 bg-muted/30">
              {elements.map((el, i) => (
                <div key={el.id} className="border rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{TYPE_LABELS[el.type]}</Badge>
                    {el.label && <span className="text-sm font-medium">{el.label}</span>}
                  </div>
                  {el.type === 'static' && (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: el.content || '<em>Brak treści</em>' }} />
                  )}
                  {el.type === 'editable_text' && (
                    <div className="bg-primary/5 border-dashed border-2 border-primary/30 rounded p-3 text-sm text-muted-foreground">
                      📝 Pole tekstowe partnera: {el.placeholder || 'brak podpowiedzi'}
                    </div>
                  )}
                  {el.type === 'editable_image' && (
                    <div className="bg-primary/5 border-dashed border-2 border-primary/30 rounded p-3 text-sm text-muted-foreground">
                      🖼️ Miejsce na obrazek partnera
                    </div>
                  )}
                  {el.type === 'product_slot' && (
                    <div className="bg-primary/5 border-dashed border-2 border-primary/30 rounded p-3 text-sm text-muted-foreground">
                      📦 Siatka produktów z linkami zakupowymi partnera
                    </div>
                  )}
                </div>
              ))}
              {elements.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Szablon jest pusty. Dodaj elementy w trybie edycji.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Element list */}
          {elements.map((element, index) => (
            <Card key={element.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Move buttons */}
                  <div className="flex flex-col gap-1 pt-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveElement(index, 'up')} disabled={index === 0}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <GripVertical className="w-4 h-4 text-muted-foreground mx-auto" />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveElement(index, 'down')} disabled={index === elements.length - 1}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Element config */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <Badge>{index + 1}</Badge>
                      <div className="flex-1">
                        <Select
                          value={element.type}
                          onValueChange={(v) => updateElement(index, { type: v as TemplateElement['type'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
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

                    {/* Label (for editable elements) */}
                    {element.type !== 'static' && (
                      <div>
                        <Label>Etykieta (widoczna dla partnera)</Label>
                        <Input
                          value={element.label || ''}
                          onChange={(e) => updateElement(index, { label: e.target.value })}
                          placeholder="np. Twoje bio, O mnie..."
                        />
                      </div>
                    )}

                    {/* Static content */}
                    {element.type === 'static' && (
                      <div>
                        <Label>Treść HTML</Label>
                        <Textarea
                          value={element.content || ''}
                          onChange={(e) => updateElement(index, { content: e.target.value })}
                          placeholder="<h2>Nagłówek</h2><p>Treść statyczna...</p>"
                          rows={4}
                        />
                      </div>
                    )}

                    {/* Text settings */}
                    {element.type === 'editable_text' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Placeholder</Label>
                          <Input
                            value={element.placeholder || ''}
                            onChange={(e) => updateElement(index, { placeholder: e.target.value })}
                            placeholder="Podpowiedź dla partnera..."
                          />
                        </div>
                        <div>
                          <Label>Max. znaków</Label>
                          <Input
                            type="number"
                            value={element.max_length || 500}
                            onChange={(e) => updateElement(index, { max_length: parseInt(e.target.value) || 500 })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Unique ID */}
                    <div>
                      <Label className="text-xs text-muted-foreground">ID elementu</Label>
                      <Input
                        value={element.id}
                        onChange={(e) => updateElement(index, { id: e.target.value.replace(/[^a-z0-9_]/g, '') })}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add element button */}
          <Button onClick={addElement} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Dodaj element
          </Button>
        </>
      )}
    </div>
  );
};

export default PartnerTemplateEditor;
