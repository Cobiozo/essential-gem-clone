import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Save, Trash2, FileText, Eye, Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const AI_STYLE_PRESETS: Record<'pl' | 'en' | 'de', Array<{ name: string; prompt: string }>> = {
  pl: [
    { name: 'Elegancki', prompt: 'Elegancki certyfikat ze złotymi ozdobnymi ramkami, kremowe tło, subtelne motywy kwiatowe' },
    { name: 'Nowoczesny', prompt: 'Nowoczesny minimalistyczny certyfikat, czyste geometryczne kształty, niebieski gradient, białe tło' },
    { name: 'Korporacyjny', prompt: 'Profesjonalny korporacyjny certyfikat, granatowy nagłówek, srebrne wykończenie, formalny układ' },
    { name: 'Naturalny', prompt: 'Certyfikat inspirowany naturą z akwarelowymi liśćmi, delikatne zielone tony, organiczne kształty' },
    { name: 'Klasyczny', prompt: 'Klasyczny dyplom, tekstura pergaminu, czerwona pieczęć z wstążką, tradycyjna ozdobna ramka' },
  ],
  en: [
    { name: 'Elegant', prompt: 'Elegant certificate with gold ornamental borders, cream background, subtle floral patterns' },
    { name: 'Modern', prompt: 'Modern minimalist certificate, clean geometric shapes, blue gradient accent, white background' },
    { name: 'Corporate', prompt: 'Professional corporate certificate, navy blue header, silver trim, formal layout' },
    { name: 'Natural', prompt: 'Nature-inspired certificate with watercolor leaves, soft green tones, organic shapes' },
    { name: 'Classic', prompt: 'Classic diploma style certificate, parchment texture, red ribbon seal, traditional ornate frame' },
  ],
  de: [
    { name: 'Elegant', prompt: 'Elegantes Zertifikat mit goldenen Zierrahmen, cremefarbenem Hintergrund, dezenten Blumenmustern' },
    { name: 'Modern', prompt: 'Modernes minimalistisches Zertifikat, klare geometrische Formen, blauer Farbverlauf, weißer Hintergrund' },
    { name: 'Korporativ', prompt: 'Professionelles Firmenzertifikat, marineblaue Kopfzeile, silberne Verzierung, formelles Layout' },
    { name: 'Natürlich', prompt: 'Naturinspiriertes Zertifikat mit Aquarellblättern, sanften Grüntönen, organischen Formen' },
    { name: 'Klassisch', prompt: 'Klassisches Diplom, Pergamenttextur, rotes Bandsiegel, traditioneller verzierter Rahmen' },
  ],
};

const AI_UI_LABELS: Record<'pl' | 'en' | 'de', { 
  describeStyle: string; 
  placeholder: string; 
  quickStyles: string;
  labelLanguage: string;
}> = {
  pl: {
    describeStyle: 'Opisz styl certyfikatu',
    placeholder: 'np. Elegancki certyfikat ze złotymi ramkami i kremowym tłem...',
    quickStyles: 'Szybkie style:',
    labelLanguage: 'Język etykiet',
  },
  en: {
    describeStyle: 'Describe certificate style',
    placeholder: 'e.g., Elegant certificate with gold borders and cream background...',
    quickStyles: 'Quick styles:',
    labelLanguage: 'Label language',
  },
  de: {
    describeStyle: 'Zertifikatstil beschreiben',
    placeholder: 'z.B. Elegantes Zertifikat mit goldenen Rahmen und cremefarbenem Hintergrund...',
    quickStyles: 'Schnelle Stile:',
    labelLanguage: 'Etikettensprache',
  },
};

const CERTIFICATE_FORMATS = [
  { name: 'A4 Poziomo', width: 842, height: 595 },
  { name: 'A4 Pionowo', width: 595, height: 842 },
  { name: 'Letter Poziomo', width: 792, height: 612 },
  { name: 'Letter Pionowo', width: 612, height: 792 },
  { name: 'Kwadratowy', width: 700, height: 700 },
];

const CERTIFICATE_LANGUAGES = [
  { code: 'pl', name: 'Polski' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
];

const CertificateEditor = () => {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [trainingModules, setTrainingModules] = useState<TrainingModuleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [createMode, setCreateMode] = useState<'manual' | 'ai'>('manual');
  const [selectedFormat, setSelectedFormat] = useState(CERTIFICATE_FORMATS[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<'pl' | 'en' | 'de'>('pl');
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleEditTemplate = (template: CertificateTemplate) => {
    setSelectedTemplate(template);
    setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

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
          is_active: !hasActiveTemplate,
          layout: {
            elements: [
              {
                id: '1',
                type: 'text',
                content: 'Certyfikat Ukończenia',
                x: 421,
                y: 60,
                fontSize: 32,
                fontWeight: 'bold',
                color: '#282828',
                align: 'center'
              },
              {
                id: '2',
                type: 'text',
                content: '{userName}',
                x: 421,
                y: 200,
                fontSize: 24,
                fontWeight: 'bold',
                color: '#282828',
                align: 'center'
              },
              {
                id: '3',
                type: 'text',
                content: '{moduleTitle}',
                x: 421,
                y: 280,
                fontSize: 20,
                fontWeight: 'bold',
                color: '#282828',
                align: 'center'
              },
              {
                id: '4',
                type: 'text',
                content: 'Data: {completionDate}',
                x: 421,
                y: 520,
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

  const createTemplateWithAI = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Błąd",
        description: "Nazwa szablonu jest wymagana",
        variant: "destructive"
      });
      return;
    }

    if (!aiPrompt.trim()) {
      toast({
        title: "Błąd",
        description: "Opisz styl certyfikatu",
        variant: "destructive"
      });
      return;
    }

    setAiGenerating(true);

    try {
      toast({
        title: "Generowanie...",
        description: "AI tworzy tło certyfikatu. To może potrwać kilka sekund.",
      });

      const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-certificate-background', {
        body: { 
          prompt: aiPrompt,
          action: 'generate-background',
          format: {
            width: selectedFormat.width,
            height: selectedFormat.height,
            name: selectedFormat.name
          },
          language: selectedLanguage
        }
      });

      if (aiError) throw aiError;
      if (!aiData?.success) throw new Error(aiData?.error || 'AI generation failed');

      const { imageUrl, suggestedPlacements } = aiData;

      // Upload the generated image to storage
      let storedImageUrl = imageUrl;
      if (imageUrl.startsWith('data:')) {
        try {
          const base64Data = imageUrl.split(',')[1];
          const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          const blob = new Blob([byteArray], { type: 'image/png' });
          
          const fileName = `ai-certificate-bg-${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from('cms-images')
            .upload(`certificate-backgrounds/${fileName}`, blob);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('cms-images')
              .getPublicUrl(`certificate-backgrounds/${fileName}`);
            storedImageUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.log('Using base64 image directly:', uploadErr);
        }
      }

      // Create elements from AI suggestions
      const elements = [
        {
          id: 'bg-0',
          type: 'image' as const,
          imageUrl: storedImageUrl,
          x: 0,
          y: 0,
          width: selectedFormat.width,
          height: selectedFormat.height
        },
        ...suggestedPlacements.map((placement: any, index: number) => ({
          id: `ai-${index + 1}`,
          type: 'text' as const,
          content: placement.label || placement.placeholder,
          x: placement.x,
          y: placement.y,
          fontSize: placement.fontSize,
          fontWeight: placement.fontWeight,
          color: placement.color,
          align: placement.align
        }))
      ];

      // Check for active templates
      const { data: activeTemplates } = await supabase
        .from('certificate_templates')
        .select('id')
        .eq('is_active', true);

      const hasActiveTemplate = activeTemplates && activeTemplates.length > 0;

      const { data, error } = await supabase
        .from('certificate_templates')
        .insert({
          name: newTemplateName,
          is_active: !hasActiveTemplate,
          layout: { 
            elements,
            format: { width: selectedFormat.width, height: selectedFormat.height },
            language: selectedLanguage
          }
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates([data as unknown as CertificateTemplate, ...templates]);
      setNewTemplateName('');
      setAiPrompt('');
      setShowCreateDialog(false);
      setCreateMode('manual');

      toast({
        title: "Sukces",
        description: "Szablon AI został utworzony! Możesz go teraz edytować.",
      });
    } catch (error) {
      console.error('Error creating AI template:', error);
      toast({
        title: "Błąd",
        description: error instanceof Error ? error.message : "Nie udało się wygenerować szablonu AI",
        variant: "destructive"
      });
    } finally {
      setAiGenerating(false);
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
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setCreateMode('manual');
            setAiPrompt('');
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nowy szablon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Utwórz nowy szablon certyfikatu</DialogTitle>
              <DialogDescription>
                Utwórz szablon ręcznie lub wygeneruj z pomocą AI
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as 'manual' | 'ai')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Ręcznie</TabsTrigger>
                <TabsTrigger value="ai">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generuj z AI
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Nazwa szablonu</Label>
                  <Input
                    id="template-name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="np. Szablon podstawowy"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="ai" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-template-name">Nazwa szablonu</Label>
                  <Input
                    id="ai-template-name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="np. Elegancki certyfikat"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-format">Format certyfikatu</Label>
                    <Select 
                      value={selectedFormat.name} 
                      onValueChange={(name) => {
                        const format = CERTIFICATE_FORMATS.find(f => f.name === name);
                        if (format) setSelectedFormat(format);
                      }}
                    >
                      <SelectTrigger id="ai-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CERTIFICATE_FORMATS.map((format) => (
                          <SelectItem key={format.name} value={format.name}>
                            {format.name} ({format.width}×{format.height})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-language">{AI_UI_LABELS[selectedLanguage].labelLanguage}</Label>
                    <Select value={selectedLanguage} onValueChange={(v) => setSelectedLanguage(v as 'pl' | 'en' | 'de')}>
                      <SelectTrigger id="ai-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CERTIFICATE_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">{AI_UI_LABELS[selectedLanguage].describeStyle}</Label>
                  <Textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={AI_UI_LABELS[selectedLanguage].placeholder}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{AI_UI_LABELS[selectedLanguage].quickStyles}</Label>
                  <div className="flex flex-wrap gap-2">
                    {AI_STYLE_PRESETS[selectedLanguage].map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => setAiPrompt(preset.prompt)}
                        className="text-xs"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Anuluj
              </Button>
              {createMode === 'manual' ? (
                <Button onClick={createTemplate}>Utwórz szablon</Button>
              ) : (
                <Button onClick={createTemplateWithAI} disabled={aiGenerating}>
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generowanie...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generuj z AI
                    </>
                  )}
                </Button>
              )}
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
                onClick={() => handleEditTemplate(template)}
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
        <div ref={editorRef}>
          <Card className="animate-in fade-in duration-300">
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
        </div>
      )}
    </div>
  );
};

export default CertificateEditor;