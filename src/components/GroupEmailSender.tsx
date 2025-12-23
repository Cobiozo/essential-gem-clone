import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Mail, Send, Users, Loader2, FileText, Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GroupEmailSenderProps {
  className?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
}

export const GroupEmailSender: React.FC<GroupEmailSenderProps> = ({ className }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [contentMode, setContentMode] = useState<'custom' | 'template'>('custom');
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    senderName: '',
    recipients: {
      client: false,
      partner: false,
      specjalista: false,
    }
  });

  // Fetch templates on dialog open
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('id, name, subject, body_html, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching templates:', error);
      return;
    }
    setTemplates(data || []);
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      setSelectedTemplate(null);
      setContentMode('custom');
      return;
    }
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setContentMode('template');
      setFormData(prev => ({
        ...prev,
        subject: template.subject,
        content: template.body_html
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasContent = contentMode === 'template' 
      ? selectedTemplate !== null 
      : (formData.subject.trim() && formData.content.trim());
    
    if (!hasContent) {
      toast({
        title: "Błąd",
        description: contentMode === 'template' 
          ? "Wybierz szablon wiadomości" 
          : "Temat i treść wiadomości są wymagane",
        variant: "destructive",
      });
      return;
    }

    const hasRecipients = Object.values(formData.recipients).some(Boolean);
    if (!hasRecipients) {
      toast({
        title: "Błąd", 
        description: "Wybierz przynajmniej jedną grupę odbiorców",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Sending group email...");
      
      const requestBody: any = {
        recipients: formData.recipients,
        senderName: formData.senderName || undefined,
      };

      if (contentMode === 'template' && selectedTemplate) {
        requestBody.template_id = selectedTemplate.id;
      } else {
        requestBody.subject = formData.subject;
        requestBody.content = formData.content;
      }
      
      const { data, error } = await supabase.functions.invoke('send-group-email', {
        body: requestBody
      });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log("Response:", data);

      const message = data.errors && data.errors.length > 0
        ? `Wysłano ${data.recipientCount} z ${data.totalRecipients} wiadomości. Niektóre nie zostały dostarczone.`
        : `Wiadomość została wysłana do ${data.recipientCount} odbiorców`;

      toast({
        title: "Email wysłany!",
        description: message,
      });

      // Reset form
      setFormData({
        subject: '',
        content: '',
        senderName: '',
        recipients: {
          client: false,
          partner: false,
          specjalista: false,
        }
      });
      setSelectedTemplate(null);
      setContentMode('custom');
      setIsOpen(false);

    } catch (error: any) {
      console.error("Error sending group email:", error);
      toast({
        title: "Błąd wysyłania",
        description: error.message || "Nie udało się wysłać wiadomości grupowej",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPreviewContent = () => {
    const content = contentMode === 'template' && selectedTemplate 
      ? selectedTemplate.body_html 
      : formData.content;
    
    // Replace sample variables for preview
    return content
      .replace(/\{\{imię\}\}/gi, 'Jan')
      .replace(/\{\{nazwisko\}\}/gi, 'Kowalski')
      .replace(/\{\{email\}\}/gi, 'jan.kowalski@example.com');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className={`gap-2 ${className}`} variant="outline">
          <Mail className="w-4 h-4" />
          Wyślij email grupowy
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Wyślij email grupowy
          </DialogTitle>
          <DialogDescription>
            Wyślij wiadomość email do wybranych grup użytkowników korzystając z szablonu lub własnej treści
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sender Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Nadawca (opcjonalne)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="senderName">Imię i nazwisko nadawcy</Label>
                <Input
                  id="senderName"
                  placeholder="np. Jan Kowalski (domyślnie z ustawień SMTP)"
                  value={formData.senderName}
                  onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recipients Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Odbiorcy</CardTitle>
              <CardDescription>
                Zaznacz grupy użytkowników, którzy mają otrzymać wiadomość
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="client"
                    checked={formData.recipients.client}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        recipients: { ...prev.recipients, client: checked as boolean }
                      }))
                    }
                  />
                  <Label htmlFor="client" className="font-medium">
                    Klienci/Użytkownicy
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="partner"
                    checked={formData.recipients.partner}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        recipients: { ...prev.recipients, partner: checked as boolean }
                      }))
                    }
                  />
                  <Label htmlFor="partner" className="font-medium">
                    Partnerzy
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="specjalista"
                    checked={formData.recipients.specjalista}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        recipients: { ...prev.recipients, specjalista: checked as boolean }
                      }))
                    }
                  />
                  <Label htmlFor="specjalista" className="font-medium">
                    Specjaliści
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Content with Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Treść wiadomości
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label>Szablon wiadomości</Label>
                <Select 
                  value={selectedTemplate?.id || 'none'} 
                  onValueChange={handleTemplateSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz szablon (opcjonalnie)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Własna treść --</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Brak aktywnych szablonów. Możesz utworzyć szablony w zakładce "Szablony email".
                  </p>
                )}
              </div>

              {/* Content Tabs */}
              <Tabs value={contentMode} onValueChange={(v) => setContentMode(v as 'custom' | 'template')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="custom" disabled={selectedTemplate !== null}>
                    Własna treść
                  </TabsTrigger>
                  <TabsTrigger value="template" disabled={selectedTemplate === null}>
                    Z szablonu
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="custom" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Temat wiadomości *</Label>
                    <Input
                      id="subject"
                      placeholder="Wprowadź temat wiadomości..."
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Treść wiadomości *</Label>
                    <div className="border rounded-md">
                      <RichTextEditor
                        value={formData.content}
                        onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                        placeholder="Napisz treść wiadomości..."
                        className="min-h-[200px]"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="template" className="space-y-4 mt-4">
                  {selectedTemplate && (
                    <>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Używasz szablonu: <strong>{selectedTemplate.name}</strong>
                          <br />
                          Temat: {selectedTemplate.subject}
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Podgląd szablonu</Label>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setShowPreview(!showPreview)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {showPreview ? 'Ukryj' : 'Pokaż'} podgląd
                          </Button>
                        </div>
                        
                        {showPreview && (
                          <div 
                            className="border rounded-md p-4 bg-background max-h-[300px] overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                          />
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>

              <p className="text-xs text-muted-foreground">
                Dostępne zmienne: {'{{imię}}'}, {'{{nazwisko}}'}, {'{{email}}'} - zostaną zastąpione danymi odbiorcy
              </p>
            </CardContent>
          </Card>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wysyłanie...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Wyślij email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
