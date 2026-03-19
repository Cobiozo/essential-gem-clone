import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowLeft, Save, RotateCcw, Trash2, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EqologyTemplateManager } from './EqologyTemplateManager';
import { DEFAULT_EQOLOGY_TEMPLATE } from '@/components/partner-page/templates/eqologyDefaults';
import type { EqologyTemplateData } from '@/types/eqologyTemplate';

interface GalleryTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  template_data: any;
  preview_image_url: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
}

export const TemplatesGalleryManager: React.FC = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<GalleryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editData, setEditData] = useState<EqologyTemplateData>(DEFAULT_EQOLOGY_TEMPLATE);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('partner_page_templates_gallery' as any)
      .select('*')
      .order('position');
    if (!error && data) setTemplates(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const startEditing = (t: GalleryTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDescription(t.description || '');
    setEditActive(t.is_active);
    setEditData(t.template_data as EqologyTemplateData);
  };

  const handleCreate = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('partner_page_templates_gallery' as any)
      .insert({
        name: 'Nowy szablon Eqology',
        description: '',
        template_type: 'eqology_omega3',
        template_data: DEFAULT_EQOLOGY_TEMPLATE as any,
        position: templates.length,
      } as any);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Utworzono', description: 'Nowy szablon został dodany.' });
      await fetchTemplates();
    }
    setSaving(false);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase
      .from('partner_page_templates_gallery' as any)
      .update({
        name: editName,
        description: editDescription || null,
        is_active: editActive,
        template_data: editData as any,
      } as any)
      .eq('id', editingId);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Zapisano', description: 'Szablon został zaktualizowany.' });
      await fetchTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten szablon?')) return;
    const { error } = await supabase
      .from('partner_page_templates_gallery' as any)
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Usunięto', description: 'Szablon został usunięty.' });
      if (editingId === id) setEditingId(null);
      await fetchTemplates();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  // EDIT VIEW
  if (editingId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Wróć do listy
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditData(DEFAULT_EQOLOGY_TEMPLATE)}>
              <RotateCcw className="w-4 h-4 mr-1" /> Reset treści
            </Button>
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="w-4 h-4 mr-1" /> {saving ? 'Zapisuję...' : 'Zapisz'}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Ustawienia szablonu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nazwa szablonu</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div><Label>Opis</Label><Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} /></div>
            <div className="flex items-center justify-between">
              <Label>Aktywny</Label>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>
          </CardContent>
        </Card>

        <EqologyTemplateManager data={editData} onChange={setEditData} />
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Galeria szablonów</h3>
          <p className="text-sm text-muted-foreground">Niezależne szablony stron partnerskich</p>
        </div>
        <Button onClick={handleCreate} disabled={saving} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Dodaj szablon
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Palette className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Brak szablonów. Kliknij "Dodaj szablon" aby utworzyć pierwszy.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <Card
              key={t.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => startEditing(t)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    {t.description && <CardDescription className="mt-1">{t.description}</CardDescription>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.is_active ? 'default' : 'secondary'}>
                      {t.is_active ? 'Aktywny' : 'Nieaktywny'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Badge variant="outline" className="text-xs">{t.template_type}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
