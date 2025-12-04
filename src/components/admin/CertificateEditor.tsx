import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Save, Trash2, FileText, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TemplateDndEditor from './TemplateDndEditor';
import jsPDF from 'jspdf';

interface CertificateTemplate {
  id: string;
  name: string;
  layout: {
    elements: TemplateElement[];
  };
  is_active: boolean;
  roles: Array<'admin' | 'partner' | 'client' | 'specjalista' | 'user'>;
  module_ids: string[];
  created_at: string;
  updated_at: string;
}

interface TrainingModuleOption {
  id: string;
  title: string;
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
  const [trainingModules, setTrainingModules] = useState<TrainingModuleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
    fetchTrainingModules();
  }, []);

  const fetchTrainingModules = async () => {
    try {
      const { data, error } = await supabase
        .from('training_modules')
        .select('id, title')
        .eq('is_active', true)
        .order('position');
      
      if (error) throw error;
      setTrainingModules(data || []);
    } catch (error) {
      console.error('Error fetching training modules:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched templates:', data);
      console.log('Active template:', data?.find(t => t.is_active));
      
      setTemplates((data || []).map(t => ({
        ...t,
        layout: t.layout as unknown as { elements: TemplateElement[] },
        roles: (t.roles || []) as Array<'admin' | 'partner' | 'client' | 'specjalista' | 'user'>,
        module_ids: (t.module_ids || []) as string[]
      })));
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
      // Check if there are any active templates
      const { data: activeTemplates } = await supabase
        .from('certificate_templates')
        .select('id')
        .eq('is_active', true);

      const hasActiveTemplate = activeTemplates && activeTemplates.length > 0;

      const { data, error } = await supabase
        .from('certificate_templates')
        .insert({
          name: newTemplateName,
          is_active: !hasActiveTemplate, // Only set as active if no active template exists
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
    const templateToDelete = templates.find(t => t.id === id);
    
    if (!templateToDelete) return;

    // Check if this is the active template
    if (templateToDelete.is_active) {
      const otherTemplates = templates.filter(t => t.id !== id);
      
      if (otherTemplates.length === 0) {
        // No other templates - warn user
        if (!confirm('To jest jedyny szablon certyfikatu. Czy na pewno chcesz go usunąć? Bez szablonu nie będzie można generować certyfikatów.')) {
          return;
        }
      } else {
        // Ask user to select new default
        const message = `Usuwasz domyślny szablon certyfikatu. Czy chcesz ustawić "${otherTemplates[0].name}" jako nowy domyślny szablon?`;
        if (!confirm(message)) {
          return;
        }
        
        // Set first available template as default before deletion
        try {
          await setDefaultTemplate(otherTemplates[0].id);
        } catch (error) {
          console.error('Failed to set new default template:', error);
          toast({
            title: "Błąd",
            description: "Nie udało się ustawić nowego domyślnego szablonu",
            variant: "destructive"
          });
          return;
        }
      }
    } else {
      // Regular confirmation for non-active templates
      if (!confirm('Czy na pewno chcesz usunąć ten szablon?')) {
        return;
      }
    }

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
      
      // Warn if no templates left
      if (templates.length === 1) {
        toast({
          title: "Uwaga",
          description: "Nie ma żadnych szablonów certyfikatów. Utwórz nowy szablon, aby móc generować certyfikaty.",
          variant: "default"
        });
      }
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
      console.log('Setting default template:', templateId);
      
      // Use database function to ensure atomicity
      const { error } = await supabase.rpc('set_default_certificate_template', {
        template_id: templateId
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Template set successfully, refreshing list...');
      
      // Refresh templates to show updated state
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

  const handleRoleToggle = async (templateId: string, role: string, checked: boolean) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      const currentRoles = template.roles || [];
      const newRoles = checked
        ? [...currentRoles, role as 'admin' | 'partner' | 'client' | 'specjalista' | 'user']
        : currentRoles.filter(r => r !== role);

      const { error } = await supabase
        .from('certificate_templates')
        .update({ roles: newRoles, updated_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;

      // Update local state
      setTemplates(templates.map(t => 
        t.id === templateId ? { ...t, roles: newRoles } : t
      ));

      toast({
        title: "Sukces",
        description: `Role zostały zaktualizowane dla szablonu "${template.name}"`,
      });
    } catch (error) {
      console.error('Error updating template roles:', error);
      toast({
        title: "Błąd",
        description: "Nie można zaktualizować ról szablonu",
        variant: "destructive"
      });
    }
  };

  const handleModuleToggle = async (templateId: string, moduleId: string, checked: boolean) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      const currentModuleIds = template.module_ids || [];
      const newModuleIds = checked
        ? [...currentModuleIds, moduleId]
        : currentModuleIds.filter(id => id !== moduleId);

      const { error } = await supabase
        .from('certificate_templates')
        .update({ module_ids: newModuleIds, updated_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;

      // Update local state
      setTemplates(templates.map(t => 
        t.id === templateId ? { ...t, module_ids: newModuleIds } : t
      ));

      toast({
        title: "Sukces",
        description: `Moduły zostały zaktualizowane dla szablonu "${template.name}"`,
      });
    } catch (error) {
      console.error('Error updating template modules:', error);
      toast({
        title: "Błąd",
        description: "Nie można zaktualizować modułów szablonu",
        variant: "destructive"
      });
    }
  };

  const previewCertificate = async (template: CertificateTemplate) => {
    try {
      console.log('🔍 Generating preview certificate for template:', template.name);
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const PX_TO_MM = 0.352729; // 297/842

      // Placeholder data for preview
      const userName = "Jan Kowalski";
      const moduleTitle = "Przykładowy Moduł Szkoleniowy";
      const completionDate = new Date().toLocaleDateString('pl-PL');

      // Helper function to load image as base64
      const loadImageAsBase64 = async (url: string): Promise<string | null> => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Error loading image:', error);
          return null;
        }
      };

      // Render template elements
      if (template.layout && 'elements' in template.layout) {
        const layoutData = template.layout as { elements: any[] };
        
        for (const element of layoutData.elements) {
          try {
            let content = element.content || '';
            content = content.replace('{userName}', userName);
            content = content.replace('{moduleTitle}', moduleTitle);
            content = content.replace('{completionDate}', completionDate);

            if (element.type === 'text') {
              doc.setFontSize(element.fontSize || 16);
              
              const color = element.color || '#000000';
              const r = parseInt(color.slice(1, 3), 16);
              const g = parseInt(color.slice(3, 5), 16);
              const b = parseInt(color.slice(5, 7), 16);
              doc.setTextColor(r, g, b);

              if (element.fontWeight === 'bold' || element.fontWeight === '700') {
                doc.setFont('helvetica', 'bold');
              } else {
                doc.setFont('helvetica', 'normal');
              }

              const x = element.x * PX_TO_MM;
              const y = element.y * PX_TO_MM;

              doc.text(content, x, y, { 
                align: element.align || 'left',
                maxWidth: pageWidth - 20
              });
            } else if (element.type === 'image' && element.imageUrl) {
              const base64Image = await loadImageAsBase64(element.imageUrl);
              
              if (base64Image) {
                try {
                  const x = element.x * PX_TO_MM;
                  const y = element.y * PX_TO_MM;
                  const width = (element.width || 100) * PX_TO_MM;
                  const height = (element.height || 100) * PX_TO_MM;

                  let format = 'PNG';
                  if (base64Image.includes('image/jpeg') || base64Image.includes('image/jpg')) {
                    format = 'JPEG';
                  }

                  doc.addImage(base64Image, format, x, y, width, height);
                } catch (imgError) {
                  console.error('Failed to add image to preview:', imgError);
                }
              }
            }
          } catch (elementError) {
            console.error('Error processing element in preview:', elementError);
          }
        }
      }

      // Open preview in new tab
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');

      toast({
        title: "Sukces",
        description: "Podgląd certyfikatu został wygenerowany",
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się wygenerować podglądu certyfikatu",
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
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  {template.is_active && (
                    <Badge variant="default">Domyślny</Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Przypisane role</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
                    {(['admin', 'partner', 'client', 'specjalista', 'user'] as const).map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${template.id}-${role}`}
                          checked={template.roles?.includes(role) || false}
                          onCheckedChange={(checked) => handleRoleToggle(template.id, role, checked as boolean)}
                        />
                        <Label
                          htmlFor={`role-${template.id}-${role}`}
                          className="text-xs cursor-pointer capitalize"
                        >
                          {role === 'admin' ? 'Administrator' : 
                           role === 'partner' ? 'Partner' :
                           role === 'client' ? 'Klient' :
                           role === 'specjalista' ? 'Specjalista' : 'Użytkownik'}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Puste = wszystkie role
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Przypisane moduły szkoleniowe</Label>
                  <div className="grid grid-cols-1 gap-2 p-3 bg-muted/50 rounded-lg max-h-40 overflow-y-auto">
                    {trainingModules.length > 0 ? trainingModules.map((module) => (
                      <div key={module.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`module-${template.id}-${module.id}`}
                          checked={template.module_ids?.includes(module.id) || false}
                          onCheckedChange={(checked) => handleModuleToggle(template.id, module.id, checked as boolean)}
                        />
                        <Label
                          htmlFor={`module-${template.id}-${module.id}`}
                          className="text-xs cursor-pointer"
                        >
                          {module.title}
                        </Label>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground">Brak dostępnych modułów</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Puste = wszystkie moduły
                  </p>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedTemplate(template)}
              >
                Edytuj szablon
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => previewCertificate(template)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Podgląd
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