import React, { useState, useEffect, useRef } from 'react';
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
import { Plus, Pencil, Trash2, Eye, Mail, Clock, CheckCircle, XCircle, RefreshCw, Variable, Server, Zap, Image, Monitor, Smartphone } from 'lucide-react';
import { SmtpConfigurationPanel } from './SmtpConfigurationPanel';
import { RichTextEditor } from '@/components/RichTextEditor';
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
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  
  // Event dialog states
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EmailEventType | null>(null);
  const [eventForm, setEventForm] = useState({
    event_key: '',
    name: '',
    description: '',
    is_active: true,
  });
  
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

  // Ref for RichTextEditor to insert variables
  const editorRef = useRef<HTMLDivElement>(null);

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
      body_html: getDefaultTemplateHtml(),
      body_text: '',
      footer_html: getDefaultFooterHtml(),
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

  const getDefaultTemplateHtml = () => {
    return `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
    <img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/pure-life-logo.png" alt="Pure Life" style="max-height: 60px; max-width: 200px;">
  </div>
  
  <div style="padding: 40px 30px;">
    <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Witaj {{imię}}!</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Treść Twojej wiadomości...
    </p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="{{link_aktywacyjny}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        Przycisk akcji
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      Pozdrawiamy,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</div>`;
  };

  const getDefaultFooterHtml = () => {
    return `<div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
    © ${new Date().getFullYear()} Pure Life / Eqology. Wszelkie prawa zastrzeżone.
  </p>
  <p style="color: #9ca3af; font-size: 11px; margin: 0;">
    Otrzymujesz tę wiadomość, ponieważ jesteś zarejestrowany w systemie Pure Life.
  </p>
</div>`;
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
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
    let html = replaceVariablesWithSample(template.body_html);
    
    if (template.footer_html) {
      html += replaceVariablesWithSample(template.footer_html);
    }

    setPreviewHtml(html);
    setPreviewSubject(replaceVariablesWithSample(template.subject));
    setShowPreviewDialog(true);
  };

  const showLivePreview = () => {
    let html = replaceVariablesWithSample(templateForm.body_html);
    
    if (templateForm.footer_html) {
      html += replaceVariablesWithSample(templateForm.footer_html);
    }

    setPreviewHtml(html);
    setPreviewSubject(replaceVariablesWithSample(templateForm.subject));
    setShowPreviewDialog(true);
  };

  const replaceVariablesWithSample = (text: string) => {
    return text
      .replace(/\{\{imię\}\}/g, 'Jan')
      .replace(/\{\{nazwisko\}\}/g, 'Kowalski')
      .replace(/\{\{email\}\}/g, 'jan.kowalski@example.com')
      .replace(/\{\{link_aktywacyjny\}\}/g, 'https://example.com/activate?token=abc123')
      .replace(/\{\{link_resetowania\}\}/g, 'https://example.com/reset?token=xyz789')
      .replace(/\{\{rola\}\}/g, 'Partner')
      .replace(/\{\{data\}\}/g, format(new Date(), 'dd.MM.yyyy', { locale: pl }))
      .replace(/\{\{godzina\}\}/g, format(new Date(), 'HH:mm', { locale: pl }));
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
    { name: 'link_resetowania', description: 'Link do resetowania hasła' },
    { name: 'rola', description: 'Rola użytkownika' },
    { name: 'data', description: 'Aktualna data' },
    { name: 'godzina', description: 'Aktualna godzina' },
  ];

  const insertVariable = (varName: string) => {
    const variable = `{{${varName}}}`;
    setTemplateForm(prev => ({
      ...prev,
      body_html: prev.body_html + variable,
    }));
  };

  // Event management functions
  const openNewEventDialog = () => {
    setEditingEvent(null);
    setEventForm({
      event_key: '',
      name: '',
      description: '',
      is_active: true,
    });
    setShowEventDialog(true);
  };

  const openEditEventDialog = (event: EmailEventType) => {
    setEditingEvent(event);
    setEventForm({
      event_key: event.event_key,
      name: event.name,
      description: event.description || '',
      is_active: event.is_active,
    });
    setShowEventDialog(true);
  };

  const handleSaveEvent = async () => {
    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('email_event_types')
          .update({
            name: eventForm.name,
            description: eventForm.description || null,
            is_active: eventForm.is_active,
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast({ title: 'Sukces', description: 'Zdarzenie zostało zaktualizowane' });
      } else {
        const { error } = await supabase
          .from('email_event_types')
          .insert({
            event_key: eventForm.event_key,
            name: eventForm.name,
            description: eventForm.description || null,
            is_active: eventForm.is_active,
          });

        if (error) throw error;
        toast({ title: 'Sukces', description: 'Zdarzenie zostało utworzone' });
      }

      setShowEventDialog(false);
      fetchEventTypes();
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast({ 
        title: 'Błąd', 
        description: error.message || 'Nie udało się zapisać zdarzenia', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to zdarzenie? Powiązane szablony zostaną odłączone.')) return;

    try {
      await supabase
        .from('email_template_events')
        .delete()
        .eq('event_type_id', eventId);

      const { error } = await supabase
        .from('email_event_types')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({ title: 'Sukces', description: 'Zdarzenie zostało usunięte' });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast({ 
        title: 'Błąd', 
        description: 'Nie udało się usunąć zdarzenia', 
        variant: 'destructive' 
      });
    }
  };

  const handleToggleEventActive = async (event: EmailEventType) => {
    try {
      const { error } = await supabase
        .from('email_event_types')
        .update({ is_active: !event.is_active })
        .eq('id', event.id);

      if (error) throw error;
      fetchEventTypes();
    } catch (error) {
      console.error('Error toggling event:', error);
    }
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
              <TabsTrigger value="events" className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Zdarzenia
              </TabsTrigger>
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
                            title="Podgląd"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditTemplateDialog(template)}
                            title="Edytuj"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id)}
                            title="Usuń"
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
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={openNewEventDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nowe zdarzenie
                  </Button>
                </div>

                <div className="space-y-3">
                  {eventTypes.map(event => {
                    const linkedTemplates = templateEvents
                      .filter(te => te.event_type_id === event.id)
                      .map(te => templates.find(t => t.id === te.template_id))
                      .filter(Boolean);

                    return (
                      <Card key={event.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className="w-4 h-4 text-yellow-500" />
                              <h3 className="font-medium">{event.name}</h3>
                              <Badge variant="outline" className="text-xs font-mono">
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
                                <Badge key={idx} className="text-xs bg-primary/10 text-primary">
                                  {template?.name}
                                </Badge>
                              ))}
                              {linkedTemplates.length === 0 && (
                                <span className="text-sm text-muted-foreground italic">
                                  Brak przypisanego szablonu
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={event.is_active}
                              onCheckedChange={() => handleToggleEventActive(event)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditEventDialog(event)}
                              title="Edytuj"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEvent(event.id)}
                              title="Usuń"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  {eventTypes.length === 0 && !loading && (
                    <p className="text-center text-muted-foreground py-8">
                      Brak zdarzeń. Kliknij "Nowe zdarzenie" aby dodać pierwsze.
                    </p>
                  )}
                </div>
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
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edytuj szablon' : 'Nowy szablon e-mail'}
            </DialogTitle>
            <DialogDescription>
              Zaprojektuj wygląd e-maila używając edytora wizualnego
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
                <Label>Nazwa wewnętrzna (klucz)</Label>
                <Input
                  value={templateForm.internal_name}
                  onChange={e => setTemplateForm(prev => ({ ...prev, internal_name: e.target.value }))}
                  placeholder="np. activation_email"
                  disabled={!!editingTemplate}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Temat wiadomości</Label>
              <Input
                value={templateForm.subject}
                onChange={e => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="np. Aktywuj swoje konto w Pure Life"
              />
            </div>

            <Separator />

            {/* Variables section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Variable className="w-4 h-4 text-muted-foreground" />
                <Label>Wstaw zmienne (kliknij aby wstawić do treści)</Label>
              </div>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                {defaultVariables.map(v => (
                  <Button
                    key={v.name}
                    variant="secondary"
                    size="sm"
                    onClick={() => insertVariable(v.name)}
                    title={v.description}
                    className="font-mono text-xs"
                  >
                    {`{{${v.name}}}`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Visual Editor */}
            <div className="space-y-2" ref={editorRef}>
              <div className="flex items-center justify-between">
                <Label>Treść e-maila (edytor wizualny)</Label>
                <Button variant="outline" size="sm" onClick={showLivePreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  Podgląd na żywo
                </Button>
              </div>
              <RichTextEditor
                value={templateForm.body_html}
                onChange={(val) => setTemplateForm(prev => ({ ...prev, body_html: val }))}
                placeholder="Zaprojektuj treść e-maila..."
                rows={12}
              />
            </div>

            {/* Footer Editor */}
            <div className="space-y-2">
              <Label>Stopka e-maila (edytor wizualny)</Label>
              <RichTextEditor
                value={templateForm.footer_html}
                onChange={(val) => setTemplateForm(prev => ({ ...prev, footer_html: val }))}
                placeholder="Stopka e-maila..."
                rows={4}
                compact
              />
            </div>

            <Separator />

            {/* Event assignment */}
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
                    <Zap className="w-3 h-3 mr-1" />
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

      {/* Event Edit Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Edytuj zdarzenie' : 'Nowe zdarzenie e-mail'}
            </DialogTitle>
            <DialogDescription>
              Zdefiniuj nowy typ zdarzenia, które może wyzwalać wysyłkę e-mail
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Klucz zdarzenia (event_key)</Label>
              <Input
                value={eventForm.event_key}
                onChange={e => setEventForm(prev => ({ ...prev, event_key: e.target.value }))}
                placeholder="np. order_confirmed"
                disabled={!!editingEvent}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Unikalny identyfikator używany w kodzie (bez spacji, małe litery)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nazwa wyświetlana</Label>
              <Input
                value={eventForm.name}
                onChange={e => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="np. Potwierdzenie zamówienia"
              />
            </div>

            <div className="space-y-2">
              <Label>Opis (opcjonalny)</Label>
              <Textarea
                value={eventForm.description}
                onChange={e => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Kiedy to zdarzenie jest wyzwalane..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={eventForm.is_active}
                onCheckedChange={checked => setEventForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Zdarzenie aktywne</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveEvent}>
              {editingEvent ? 'Zapisz zmiany' : 'Utwórz zdarzenie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Podgląd e-maila</span>
              <div className="flex items-center gap-2">
                <Button
                  variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Monitor className="w-4 h-4 mr-1" />
                  Desktop
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone className="w-4 h-4 mr-1" />
                  Mobile
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {/* Email client simulation */}
          <div className="border rounded-lg overflow-hidden bg-gray-100">
            {/* Email header simulation */}
            <div className="bg-white border-b p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-16">Od:</span>
                <span className="font-medium">Pure Life &lt;kontakt@purelife.pl&gt;</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-16">Do:</span>
                <span>jan.kowalski@example.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-16">Temat:</span>
                <span className="font-semibold">{previewSubject || 'Brak tematu'}</span>
              </div>
            </div>
            
            {/* Email body */}
            <ScrollArea className="h-[500px]">
              <div 
                className={`bg-white mx-auto transition-all ${previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-full'}`}
              >
                <div 
                  className="p-0"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </ScrollArea>
          </div>

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
