import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Save, Trash2, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TemplateDndEditor from './TemplateDndEditor';

interface CertificateTemplate {
  id: string;
  name: string;
  layout: {
    elements: TemplateElement[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'line';
  content?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

const CertificateEditor = () => {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as unknown as CertificateTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Błąd",
        description: "Nie można załadować szablonów certyfikatów",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Błąd",
        description: "Nazwa szablonu jest wymagana",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('certificate_templates')
        .insert({
          name: newTemplateName,
          layout: {
            elements: [
              {
                id: '1',
                type: 'text',
                content: 'Certyfikat Ukończenia',
                x: 148,
                y: 40,
                fontSize: 32,
                fontWeight: 'bold',
                color: '#282828',
                align: 'center'
              },
              {
                id: '2',
                type: 'text',
                content: '{userName}',
                x: 148,
                y: 90,
                fontSize: 24,
                fontWeight: 'bold',
                color: '#282828',
                align: 'center'
              },
              {
                id: '3',
                type: 'text',
                content: '{moduleTitle}',
                x: 148,
                y: 130,
                fontSize: 20,
                fontWeight: 'bold',
                color: '#282828',
                align: 'center'
              },
              {
                id: '4',
                type: 'text',
                content: 'Data: {completionDate}',
                x: 148,
                y: 160,
                fontSize: 14,
                fontWeight: 'normal',
                color: '#282828',
                align: 'center'
              }
            ]
          }
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates([data as unknown as CertificateTemplate, ...templates]);
      setNewTemplateName('');
      setShowCreateDialog(false);

      toast({
        title: "Sukces",
        description: "Szablon certyfikatu został utworzony",
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć szablonu",
        variant: "destructive"
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('certificate_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== id));
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }

      toast({
        title: "Sukces",
        description: "Szablon został usunięty",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć szablonu",
        variant: "destructive"
      });
    }
  };

  const updateTemplateLayout = async (layout: any) => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from('certificate_templates')
        .update({ layout })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      setTemplates(templates.map(t =>
        t.id === selectedTemplate.id ? { ...t, layout } : t
      ));
      setSelectedTemplate({ ...selectedTemplate, layout });

      toast({
        title: "Sukces",
        description: "Szablon został zaktualizowany",
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować szablonu",
        variant: "destructive"
      });
    }
  };

  const setDefaultTemplate = async (templateId: string) => {
    try {
      // Deactivate all templates first
      const { error: deactivateError } = await supabase
        .from('certificate_templates')
        .update({ is_active: false })
        .neq('id', templateId);

      if (deactivateError) throw deactivateError;

      // Activate selected template
      const { error: activateError } = await supabase
        .from('certificate_templates')
        .update({ is_active: true })
        .eq('id', templateId);

      if (activateError) throw activateError;

      // Refresh templates
      await fetchTemplates();

      toast({
        title: "Sukces",
        description: "Szablon został ustawiony jako domyślny",
      });
    } catch (error) {
      console.error('Error setting default template:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się ustawić domyślnego szablonu",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Certyfikaty</h2>
          <p className="text-muted-foreground">
            Zarządzaj szablonami certyfikatów dla ukończonych szkoleń
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nowy szablon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Utwórz nowy szablon certyfikatu</DialogTitle>
              <DialogDescription>
                Wprowadź nazwę dla nowego szablonu certyfikatu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nazwa szablonu</Label>
                <Input
                  id="template-name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="np. Szablon podstawowy"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Anuluj
              </Button>
              <Button onClick={createTemplate}>Utwórz szablon</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTemplate(template.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <CardDescription>
                {template.layout.elements.length} elementów
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                {template.is_active && (
                  <Badge variant="default">Domyślny</Badge>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedTemplate(template)}
              >
                Edytuj szablon
              </Button>
              {!template.is_active && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setDefaultTemplate(template.id)}
                >
                  Ustaw jako domyślny
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Brak szablonów</h3>
                <p className="text-muted-foreground mb-4">
                  Utwórz pierwszy szablon certyfikatu
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Utwórz szablon
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Edytor szablonu: {selectedTemplate.name}</CardTitle>
            <CardDescription>
              Przeciągnij i upuść elementy, aby dostosować szablon certyfikatu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateDndEditor
              template={selectedTemplate}
              onSave={updateTemplateLayout}
              onClose={() => setSelectedTemplate(null)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CertificateEditor;