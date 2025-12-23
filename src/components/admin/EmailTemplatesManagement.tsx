import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Eye, Mail, Clock, CheckCircle, XCircle, RefreshCw, Copy, Variable, Server } from 'lucide-react';
import { SmtpConfigurationPanel } from './SmtpConfigurationPanel';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface EmailTemplate {
  id: string;
  name: string;
  internal_name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  footer_html: string | null;
  variables: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailEventType {
  id: string;
  event_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface EmailLog {
  id: string;
  template_id: string | null;
  event_type_id: string | null;
  recipient_email: string;
  recipient_user_id: string | null;
  subject: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  metadata: any;
}

interface TemplateEvent {
  template_id: string;
  event_type_id: string;
}

export const EmailTemplatesManagement: React.FC = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [eventTypes, setEventTypes] = useState<EmailEventType[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [templateEvents, setTemplateEvents] = useState<TemplateEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates');
  
  // Dialog states
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  
  // Form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    internal_name: '',
    subject: '',
    body_html: '',
    body_text: '',
    footer_html: '',
    is_active: true,
    selectedEvents: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTemplates(),
        fetchEventTypes(),
        fetchTemplateEvents(),
        activeTab === 'logs' && fetchLogs(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching templates:', error);
      return;
    }
    setTemplates(data || []);
  };

  const fetchEventTypes = async () => {
    const { data, error } = await supabase
      .from('email_event_types')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching event types:', error);
      return;
    }
    setEventTypes(data || []);
  };

  const fetchTemplateEvents = async () => {
    const { data, error } = await supabase
      .from('email_template_events')
      .select('template_id, event_type_id');
    
    if (error) {
      console.error('Error fetching template events:', error);
      return;
    }
    setTemplateEvents(data || []);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error fetching logs:', error);
      return;
    }
    setEmailLogs(data || []);
  };

  const openNewTemplateDialog = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      internal_name: '',
      subject: '',
      body_html: '',
      body_text: '',
      footer_html: '',
      is_active: true,
      selectedEvents: [],
    });
    setShowTemplateDialog(true);
  };

  const openEditTemplateDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    const events = templateEvents
      .filter(te => te.template_id === template.id)
      .map(te => te.event_type_id);
    
    setTemplateForm({
      name: template.name,
      internal_name: template.internal_name,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || '',
      footer_html: template.footer_html || '',
      is_active: template.is_active,
      selectedEvents: events,
    });
    setShowTemplateDialog(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: templateForm.name,
            subject: templateForm.subject,
            body_html: templateForm.body_html,
            body_text: templateForm.body_text || null,
            footer_html: templateForm.footer_html || null,
            is_active: templateForm.is_active,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        // Update template events
        await supabase
          .from('email_template_events')
          .delete()
          .eq('template_id', editingTemplate.id);

        if (templateForm.selectedEvents.length > 0) {
          await supabase
            .from('email_template_events')
            .insert(
              templateForm.selectedEvents.map(eventId => ({
                template_id: editingTemplate.id,
                event_type_id: eventId,
              }))
            );
        }

        toast({ title: 'Sukces', description: 'Szablon został zaktualizowany' });
      } else {
        // Create new template
        const { data: newTemplate, error } = await supabase
          .from('email_templates')
          .insert({
            name: templateForm.name,
            internal_name: templateForm.internal_name,
            subject: templateForm.subject,
            body_html: templateForm.body_html,
            body_text: templateForm.body_text || null,
            footer_html: templateForm.footer_html || null,
            is_active: templateForm.is_active,
          })
          .select()
          .single();

        if (error) throw error;

        // Add template events
        if (templateForm.selectedEvents.length > 0 && newTemplate) {
          await supabase
            .from('email_template_events')
            .insert(
              templateForm.selectedEvents.map(eventId => ({
                template_id: newTemplate.id,
                event_type_id: eventId,
              }))
            );
        }

        toast({ title: 'Sukces', description: 'Szablon został utworzony' });
      }

      setShowTemplateDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({ 
        title: 'Błąd', 
        description: error.message || 'Nie udało się zapisać szablonu', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten szablon?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({ title: 'Sukces', description: 'Szablon został usunięty' });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({ 
        title: 'Błąd', 
        description: 'Nie udało się usunąć szablonu', 
        variant: 'destructive' 
      });
    }
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error toggling template:', error);
    }
  };

  const showPreview = (template: EmailTemplate) => {
    // Replace variables with sample data
    let html = template.body_html
      .replace(/\{\{imię\}\}/g, 'Jan')
      .replace(/\{\{nazwisko\}\}/g, 'Kowalski')
      .replace(/\{\{email\}\}/g, 'jan.kowalski@example.com')
      .replace(/\{\{link_aktywacyjny\}\}/g, '#')
      .replace(/\{\{rola\}\}/g, 'partner');

    if (template.footer_html) {
      html += template.footer_html;
    }

    setPreviewHtml(html);
    setShowPreviewDialog(true);
  };

  const getEventNamesForTemplate = (templateId: string) => {
    const eventIds = templateEvents
      .filter(te => te.template_id === templateId)
      .map(te => te.event_type_id);
    
    return eventTypes
      .filter(et => eventIds.includes(et.id))
      .map(et => et.name);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Wysłano</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Błąd</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Oczekuje</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const defaultVariables = [
    { name: 'imię', description: 'Imię użytkownika' },
    { name: 'nazwisko', description: 'Nazwisko użytkownika' },
    { name: 'email', description: 'Adres e-mail' },
    { name: 'link_aktywacyjny', description: 'Link do aktywacji konta' },
    { name: 'rola', description: 'Rola użytkownika' },
  ];

  const insertVariable = (varName: string) => {
    const variable = `{{${varName}}}`;
    setTemplateForm(prev => ({
      ...prev,
      body_html: prev.body_html + variable,
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Zarządzanie wiadomościami e-mail
          </CardTitle>
          <CardDescription>
            Konfiguruj serwer SMTP, szablony e-mail, przypisuj je do zdarzeń i przeglądaj historię wysyłek
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="smtp" className="flex items-center gap-1">
                <Server className="w-4 h-4" />
                SMTP
              </TabsTrigger>
              <TabsTrigger value="templates">Szablony</TabsTrigger>
              <TabsTrigger value="events">Zdarzenia</TabsTrigger>
              <TabsTrigger value="logs">Historia wysyłek</TabsTrigger>
            </TabsList>

            <TabsContent value="smtp">
              <SmtpConfigurationPanel />
            </TabsContent>

            <TabsContent value="templates">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={openNewTemplateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nowy szablon
                  </Button>
                </div>

                <div className="space-y-3">
                  {templates.map(template => (
                    <Card key={template.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{template.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {template.internal_name}
                            </Badge>
                            {!template.is_active && (
                              <Badge variant="secondary">Nieaktywny</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Temat: {template.subject}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {getEventNamesForTemplate(template.id).map((name, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={() => handleToggleActive(template)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => showPreview(template)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditTemplateDialog(template)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {templates.length === 0 && !loading && (
                    <p className="text-center text-muted-foreground py-8">
                      Brak szablonów. Kliknij "Nowy szablon" aby dodać pierwszy.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="events">
              <div className="space-y-3">
                {eventTypes.map(event => {
                  const linkedTemplates = templateEvents
                    .filter(te => te.event_type_id === event.id)
                    .map(te => templates.find(t => t.id === te.template_id))
                    .filter(Boolean);

                  return (
                    <Card key={event.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{event.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {event.event_key}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {linkedTemplates.map((template, idx) => (
                              <Badge key={idx} className="text-xs">
                                {template?.name}
                              </Badge>
                            ))}
                            {linkedTemplates.length === 0 && (
                              <span className="text-sm text-muted-foreground">
                                Brak przypisanego szablonu
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={event.is_active ? 'default' : 'secondary'}>
                          {event.is_active ? 'Aktywne' : 'Nieaktywne'}
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="logs">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="outline" onClick={fetchLogs}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Odśwież
                  </Button>
                </div>

                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Odbiorca</TableHead>
                        <TableHead>Temat</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Błąd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                          </TableCell>
                          <TableCell>{log.recipient_email}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {log.subject}
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                            {log.error_message}
                          </TableCell>
                        </TableRow>
                      ))}
                      {emailLogs.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Brak historii wysyłek
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Template Edit Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edytuj szablon' : 'Nowy szablon e-mail'}
            </DialogTitle>
            <DialogDescription>
              Skonfiguruj treść i ustawienia szablonu e-mail
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nazwa szablonu</Label>
                <Input
                  value={templateForm.name}
                  onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="np. E-mail aktywacyjny"
                />
              </div>
              <div className="space-y-2">
                <Label>Nazwa wewnętrzna</Label>
                <Input
                  value={templateForm.internal_name}
                  onChange={e => setTemplateForm(prev => ({ ...prev, internal_name: e.target.value }))}
                  placeholder="np. activation_email"
                  disabled={!!editingTemplate}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Temat wiadomości</Label>
              <Input
                value={templateForm.subject}
                onChange={e => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="np. Aktywuj swoje konto"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Dostępne zmienne</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {defaultVariables.map(v => (
                  <Button
                    key={v.name}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(v.name)}
                    title={v.description}
                  >
                    <Variable className="w-3 h-3 mr-1" />
                    {`{{${v.name}}}`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Treść HTML</Label>
              <Textarea
                value={templateForm.body_html}
                onChange={e => setTemplateForm(prev => ({ ...prev, body_html: e.target.value }))}
                placeholder="<div>Treść e-maila w HTML...</div>"
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Treść tekstowa (opcjonalna)</Label>
              <Textarea
                value={templateForm.body_text}
                onChange={e => setTemplateForm(prev => ({ ...prev, body_text: e.target.value }))}
                placeholder="Wersja tekstowa e-maila..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Stopka HTML (opcjonalna)</Label>
              <Textarea
                value={templateForm.footer_html}
                onChange={e => setTemplateForm(prev => ({ ...prev, footer_html: e.target.value }))}
                placeholder="<footer>Stopka e-maila...</footer>"
                rows={3}
                className="font-mono text-sm"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Przypisz do zdarzeń</Label>
              <div className="flex flex-wrap gap-2">
                {eventTypes.map(event => (
                  <Button
                    key={event.id}
                    variant={templateForm.selectedEvents.includes(event.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTemplateForm(prev => ({
                        ...prev,
                        selectedEvents: prev.selectedEvents.includes(event.id)
                          ? prev.selectedEvents.filter(id => id !== event.id)
                          : [...prev.selectedEvents, event.id],
                      }));
                    }}
                  >
                    {event.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={templateForm.is_active}
                onCheckedChange={checked => setTemplateForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Szablon aktywny</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? 'Zapisz zmiany' : 'Utwórz szablon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Podgląd e-maila</DialogTitle>
            <DialogDescription>
              Podgląd z przykładowymi danymi
            </DialogDescription>
          </DialogHeader>
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplatesManagement;
