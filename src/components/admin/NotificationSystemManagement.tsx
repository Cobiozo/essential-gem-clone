import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Bell, Settings, Route, Clock, Activity, Plus, Trash2, Save, Mail, Edit2, Palette, History, Search, RefreshCw, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import * as icons from 'lucide-react';
import type { NotificationEventType, NotificationRoleRoute, NotificationLimit } from '@/types/notifications';
import { MODULE_NAMES, ROLE_NAMES } from '@/types/notifications';
import { IconPicker } from '@/components/cms/IconPicker';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const ROLES = ['admin', 'partner', 'specjalista', 'client'];

const SOURCE_MODULES = [
  { value: 'general', label: 'Ogólne' },
  { value: 'auth', label: 'Autoryzacja' },
  { value: 'admin', label: 'Administracja' },
  { value: 'team_contacts', label: 'Kontakty zespołu' },
  { value: 'training', label: 'Szkolenia' },
  { value: 'knowledge', label: 'Baza wiedzy' },
  { value: 'reflinks', label: 'Reflinki' },
  { value: 'compass', label: 'Kompas AI' },
];

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#6366f1',
];

interface EmailTemplate {
  id: string;
  name: string;
  internal_name: string;
  is_active: boolean;
}

interface EventFormData {
  event_key: string;
  name: string;
  description: string;
  source_module: string;
  icon_name: string;
  color: string;
  is_active: boolean;
  send_email: boolean;
  email_template_id: string | null;
}

const defaultEventForm: EventFormData = {
  event_key: '',
  name: '',
  description: '',
  source_module: 'general',
  icon_name: 'Bell',
  color: '#3b82f6',
  is_active: true,
  send_email: false,
  email_template_id: null,
};

interface EmailLogEntry {
  id: string;
  recipient_email: string;
  recipient_user_id: string | null;
  subject: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
  template_name?: string;
  user_name?: string;
}

interface NotificationLogEntry {
  id: string;
  user_id: string;
  notification_type: string;
  source_module: string | null;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  user_name?: string;
}

export const NotificationSystemManagement = () => {
  const [eventTypes, setEventTypes] = useState<NotificationEventType[]>([]);
  const [roleRoutes, setRoleRoutes] = useState<NotificationRoleRoute[]>([]);
  const [limits, setLimits] = useState<NotificationLimit[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);

  // Event type dialog state
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEventType, setEditingEventType] = useState<NotificationEventType | null>(null);
  const [eventForm, setEventForm] = useState<EventFormData>(defaultEventForm);
  const [saving, setSaving] = useState(false);

  // History tab state
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLogEntry[]>([]);
  const [historyTab, setHistoryTab] = useState<'emails' | 'notifications'>('emails');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    search: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventTypesRes, routesRes, limitsRes, templatesRes] = await Promise.all([
        supabase.from('notification_event_types').select('*').order('position'),
        supabase.from('notification_role_routes').select('*'),
        supabase.from('notification_limits').select('*'),
        supabase.from('email_templates').select('id, name, internal_name, is_active').eq('is_active', true),
      ]);

      if (eventTypesRes.data) setEventTypes(eventTypesRes.data as NotificationEventType[]);
      if (routesRes.data) setRoleRoutes(routesRes.data as NotificationRoleRoute[]);
      if (limitsRes.data) setLimits(limitsRes.data as NotificationLimit[]);
      if (templatesRes.data) setEmailTemplates(templatesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      // Build query for email logs
      let emailQuery = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (historyFilters.dateFrom) {
        emailQuery = emailQuery.gte('created_at', historyFilters.dateFrom);
      }
      if (historyFilters.dateTo) {
        emailQuery = emailQuery.lte('created_at', historyFilters.dateTo + 'T23:59:59');
      }
      if (historyFilters.status !== 'all') {
        emailQuery = emailQuery.eq('status', historyFilters.status);
      }
      if (historyFilters.search) {
        emailQuery = emailQuery.or(`recipient_email.ilike.%${historyFilters.search}%,subject.ilike.%${historyFilters.search}%`);
      }

      const { data: emailData, error: emailError } = await emailQuery;
      
      if (emailError) throw emailError;

      // Fetch user names and template names for emails
      const userIds = [...new Set((emailData || []).filter(e => e.recipient_user_id).map(e => e.recipient_user_id))];
      const templateIds = [...new Set((emailData || []).filter(e => e.template_id).map(e => e.template_id))];

      const [profilesRes, templatesRes] = await Promise.all([
        userIds.length > 0 
          ? supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', userIds)
          : { data: [] },
        templateIds.length > 0
          ? supabase.from('email_templates').select('id, name').in('id', templateIds)
          : { data: [] }
      ]);

      const profilesMap = new Map((profilesRes.data || []).map(p => [p.user_id, `${p.first_name || ''} ${p.last_name || ''}`.trim()]));
      const templatesMap = new Map((templatesRes.data || []).map(t => [t.id, t.name]));

      const enrichedEmails: EmailLogEntry[] = (emailData || []).map(e => ({
        id: e.id,
        recipient_email: e.recipient_email,
        recipient_user_id: e.recipient_user_id,
        subject: e.subject,
        status: e.status,
        error_message: e.error_message,
        sent_at: e.sent_at,
        created_at: e.created_at,
        metadata: typeof e.metadata === 'object' && e.metadata !== null ? e.metadata as Record<string, any> : null,
        user_name: e.recipient_user_id ? profilesMap.get(e.recipient_user_id) || 'Nieznany' : 'Brak',
        template_name: e.template_id ? templatesMap.get(e.template_id) || 'Brak' : 'Brak'
      }));

      setEmailLogs(enrichedEmails);

      // Build query for notification logs
      let notificationQuery = supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (historyFilters.dateFrom) {
        notificationQuery = notificationQuery.gte('created_at', historyFilters.dateFrom);
      }
      if (historyFilters.dateTo) {
        notificationQuery = notificationQuery.lte('created_at', historyFilters.dateTo + 'T23:59:59');
      }
      if (historyFilters.search) {
        notificationQuery = notificationQuery.or(`title.ilike.%${historyFilters.search}%,message.ilike.%${historyFilters.search}%`);
      }

      const { data: notificationData, error: notificationError } = await notificationQuery;
      
      if (notificationError) throw notificationError;

      // Fetch user names for notifications
      const notifUserIds = [...new Set((notificationData || []).map(n => n.user_id))];
      const { data: notifProfiles } = notifUserIds.length > 0
        ? await supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', notifUserIds)
        : { data: [] };

      const notifProfilesMap = new Map((notifProfiles || []).map(p => [p.user_id, `${p.first_name || ''} ${p.last_name || ''}`.trim()]));

      const enrichedNotifications: NotificationLogEntry[] = (notificationData || []).map(n => ({
        ...n,
        user_name: notifProfilesMap.get(n.user_id) || 'Nieznany'
      }));

      setNotificationLogs(enrichedNotifications);
      
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Błąd podczas ładowania historii');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openNewEventDialog = () => {
    setEditingEventType(null);
    setEventForm(defaultEventForm);
    setShowEventDialog(true);
  };

  const openEditEventDialog = (eventType: NotificationEventType) => {
    setEditingEventType(eventType);
    setEventForm({
      event_key: eventType.event_key,
      name: eventType.name,
      description: eventType.description || '',
      source_module: eventType.source_module,
      icon_name: eventType.icon_name || 'Bell',
      color: eventType.color || '#3b82f6',
      is_active: eventType.is_active,
      send_email: eventType.send_email,
      email_template_id: eventType.email_template_id || null,
    });
    setShowEventDialog(true);
  };

  const handleSaveEventType = async () => {
    if (!eventForm.name.trim()) {
      toast.error('Nazwa jest wymagana');
      return;
    }
    if (!eventForm.event_key.trim()) {
      toast.error('Klucz zdarzenia jest wymagany');
      return;
    }

    setSaving(true);
    try {
      if (editingEventType) {
        // Update existing
        const { error } = await supabase
          .from('notification_event_types')
          .update({
            name: eventForm.name,
            description: eventForm.description || null,
            source_module: eventForm.source_module,
            icon_name: eventForm.icon_name,
            color: eventForm.color,
            is_active: eventForm.is_active,
            send_email: eventForm.send_email,
            email_template_id: eventForm.email_template_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEventType.id);

        if (error) throw error;

        setEventTypes(prev =>
          prev.map(e =>
            e.id === editingEventType.id
              ? {
                  ...e,
                  name: eventForm.name,
                  description: eventForm.description || null,
                  source_module: eventForm.source_module,
                  icon_name: eventForm.icon_name,
                  color: eventForm.color,
                  is_active: eventForm.is_active,
                  send_email: eventForm.send_email,
                  email_template_id: eventForm.email_template_id,
                }
              : e
          )
        );
        toast.success('Zaktualizowano typ zdarzenia');
      } else {
        // Create new
        const { data, error } = await supabase
          .from('notification_event_types')
          .insert({
            event_key: eventForm.event_key,
            name: eventForm.name,
            description: eventForm.description || null,
            source_module: eventForm.source_module,
            icon_name: eventForm.icon_name,
            color: eventForm.color,
            is_active: eventForm.is_active,
            send_email: eventForm.send_email,
            email_template_id: eventForm.email_template_id,
            position: eventTypes.length,
          })
          .select()
          .single();

        if (error) throw error;

        setEventTypes(prev => [...prev, data as NotificationEventType]);
        toast.success('Dodano nowy typ zdarzenia');
      }

      setShowEventDialog(false);
    } catch (error: any) {
      console.error('Error saving event type:', error);
      toast.error(error.message || 'Błąd podczas zapisywania');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEventType = async (id: string) => {
    // Check for related data
    const relatedRoutes = roleRoutes.filter(r => r.event_type_id === id);
    const relatedLimits = limits.filter(l => l.event_type_id === id);

    try {
      // Delete related data first
      if (relatedRoutes.length > 0) {
        await supabase.from('notification_role_routes').delete().eq('event_type_id', id);
      }
      if (relatedLimits.length > 0) {
        await supabase.from('notification_limits').delete().eq('event_type_id', id);
      }

      // Delete event type
      const { error } = await supabase.from('notification_event_types').delete().eq('id', id);

      if (error) throw error;

      setEventTypes(prev => prev.filter(e => e.id !== id));
      setRoleRoutes(prev => prev.filter(r => r.event_type_id !== id));
      setLimits(prev => prev.filter(l => l.event_type_id !== id));
      toast.success('Usunięto typ zdarzenia');
    } catch (error: any) {
      console.error('Error deleting event type:', error);
      toast.error('Błąd podczas usuwania');
    }
  };

  const toggleEventType = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('notification_event_types')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Błąd podczas aktualizacji');
      return;
    }

    setEventTypes(prev => prev.map(e => e.id === id ? { ...e, is_active: isActive } : e));
    toast.success('Zaktualizowano typ zdarzenia');
  };

  const toggleSendEmail = async (id: string, sendEmail: boolean) => {
    const { error } = await supabase
      .from('notification_event_types')
      .update({ send_email: sendEmail, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Błąd podczas aktualizacji');
      return;
    }

    setEventTypes(prev => prev.map(e => e.id === id ? { ...e, send_email: sendEmail } : e));
    toast.success('Zaktualizowano ustawienia email');
  };

  const updateEmailTemplate = async (id: string, templateId: string | null) => {
    const { error } = await supabase
      .from('notification_event_types')
      .update({ 
        email_template_id: templateId === 'none' ? null : templateId, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      toast.error('Błąd podczas aktualizacji szablonu');
      return;
    }

    setEventTypes(prev => prev.map(e => e.id === id ? { ...e, email_template_id: templateId === 'none' ? null : templateId } : e));
    toast.success('Zaktualizowano szablon email');
  };

  const updateLimit = async (eventTypeId: string, field: string, value: number) => {
    const limit = limits.find(l => l.event_type_id === eventTypeId);
    
    if (limit) {
      const { error } = await supabase
        .from('notification_limits')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', limit.id);

      if (error) {
        toast.error('Błąd podczas aktualizacji limitu');
        return;
      }

      setLimits(prev => prev.map(l => l.id === limit.id ? { ...l, [field]: value } : l));
    } else {
      const { data, error } = await supabase
        .from('notification_limits')
        .insert({ event_type_id: eventTypeId, [field]: value })
        .select()
        .single();

      if (error) {
        toast.error('Błąd podczas tworzenia limitu');
        return;
      }

      setLimits(prev => [...prev, data as NotificationLimit]);
    }
    
    toast.success('Zaktualizowano limit');
  };

  const addRoute = async (eventTypeId: string, sourceRole: string, targetRole: string) => {
    const exists = roleRoutes.some(
      r => r.event_type_id === eventTypeId && r.source_role === sourceRole && r.target_role === targetRole
    );

    if (exists) {
      toast.error('Ta reguła już istnieje');
      return;
    }

    const { data, error } = await supabase
      .from('notification_role_routes')
      .insert({ event_type_id: eventTypeId, source_role: sourceRole, target_role: targetRole })
      .select()
      .single();

    if (error) {
      toast.error('Błąd podczas dodawania reguły');
      return;
    }

    setRoleRoutes(prev => [...prev, data as NotificationRoleRoute]);
    toast.success('Dodano regułę routingu');
  };

  const deleteRoute = async (id: string) => {
    const { error } = await supabase.from('notification_role_routes').delete().eq('id', id);

    if (error) {
      toast.error('Błąd podczas usuwania reguły');
      return;
    }

    setRoleRoutes(prev => prev.filter(r => r.id !== id));
    toast.success('Usunięto regułę');
  };

  const toggleRoute = async (id: string, isEnabled: boolean) => {
    const { error } = await supabase
      .from('notification_role_routes')
      .update({ is_enabled: isEnabled })
      .eq('id', id);

    if (error) {
      toast.error('Błąd podczas aktualizacji');
      return;
    }

    setRoleRoutes(prev => prev.map(r => r.id === id ? { ...r, is_enabled: isEnabled } : r));
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return Bell;
    const IconComponent = (icons as any)[iconName];
    return IconComponent || Bell;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">System Powiadomień</h2>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Typy zdarzeń</span>
            <span className="sm:hidden">Zdarzenia</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="routing" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Routing ról</span>
            <span className="sm:hidden">Routing</span>
          </TabsTrigger>
          <TabsTrigger value="limits" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Limity
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2" onClick={() => fetchHistory()}>
            <History className="h-4 w-4" />
            Historia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Zarządzaj typami zdarzeń, które mogą wywoływać powiadomienia w systemie.
            </p>
            <Button onClick={openNewEventDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj typ zdarzenia
            </Button>
          </div>

          <div className="grid gap-4">
            {eventTypes.map(eventType => {
              const IconComp = getIconComponent(eventType.icon_name);
              return (
                <Card key={eventType.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: (eventType.color || '#3b82f6') + '20', color: eventType.color || '#3b82f6' }}
                        >
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{eventType.name}</h3>
                          <p className="text-sm text-muted-foreground">{eventType.description}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {MODULE_NAMES[eventType.source_module] || eventType.source_module}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {eventType.event_key}
                            </Badge>
                            {eventType.send_email && (
                              <Badge className="text-xs bg-green-500/20 text-green-700 border-green-500/30">
                                <Mail className="h-3 w-3 mr-1" />
                                Email
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditEventDialog(eventType)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Usunąć typ zdarzenia?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Czy na pewno chcesz usunąć "{eventType.name}"? 
                                Zostaną również usunięte powiązane reguły routingu i limity.
                                Tej akcji nie można cofnąć.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Anuluj</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEventType(eventType.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Usuń
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Switch
                          checked={eventType.is_active}
                          onCheckedChange={(checked) => toggleEventType(eventType.id, checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {eventTypes.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak typów zdarzeń. Dodaj pierwszy typ zdarzenia.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Konfiguracja wysyłki email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Włącz wysyłkę email i przypisz szablon do każdego typu zdarzenia. 
                Gdy zdarzenie zostanie wywołane, oprócz powiadomienia w aplikacji, 
                zostanie wysłany email do użytkowników docelowych.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {eventTypes.filter(e => e.is_active).map(eventType => {
              const IconComp = getIconComponent(eventType.icon_name);
              return (
                <Card key={eventType.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (eventType.color || '#3b82f6') + '20', color: eventType.color || '#3b82f6' }}
                        >
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium">{eventType.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{eventType.event_key}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Wysyłaj email</Label>
                          <Switch
                            checked={eventType.send_email}
                            onCheckedChange={(checked) => toggleSendEmail(eventType.id, checked)}
                          />
                        </div>

                        <div className="w-64">
                          <Select 
                            value={eventType.email_template_id || 'none'} 
                            onValueChange={(value) => updateEmailTemplate(eventType.id, value)}
                            disabled={!eventType.send_email}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Wybierz szablon" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- Brak szablonu --</SelectItem>
                              {emailTemplates.map(template => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="routing" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dodaj regułę routingu</CardTitle>
            </CardHeader>
            <CardContent>
              <RouteForm
                eventTypes={eventTypes}
                onAdd={addRoute}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {eventTypes.filter(e => e.is_active).map(eventType => {
              const routes = roleRoutes.filter(r => r.event_type_id === eventType.id);
              if (routes.length === 0) return null;

              return (
                <Card key={eventType.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: eventType.color || '#3b82f6' }}
                      />
                      {eventType.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {routes.map(route => (
                        <div key={route.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{ROLE_NAMES[route.source_role]}</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge>{ROLE_NAMES[route.target_role]}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={route.is_enabled}
                              onCheckedChange={(checked) => toggleRoute(route.id, checked)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRoute(route.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {eventTypes.filter(e => e.is_active).map(eventType => {
              const limit = limits.find(l => l.event_type_id === eventType.id);

              return (
                <Card key={eventType.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: eventType.color || '#3b82f6' }}
                      />
                      {eventType.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Max / godzinę</Label>
                        <Input
                          type="number"
                          value={limit?.max_per_hour || 10}
                          onChange={(e) => updateLimit(eventType.id, 'max_per_hour', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Max / dzień</Label>
                        <Input
                          type="number"
                          value={limit?.max_per_day || 50}
                          onChange={(e) => updateLimit(eventType.id, 'max_per_day', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Cooldown (min)</Label>
                        <Input
                          type="number"
                          value={limit?.cooldown_minutes || 5}
                          onChange={(e) => updateLimit(eventType.id, 'cooldown_minutes', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historia wysyłek i powiadomień
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchHistory}
                  disabled={historyLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${historyLoading ? 'animate-spin' : ''}`} />
                  Odśwież
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Od:</Label>
                  <Input
                    type="date"
                    value={historyFilters.dateFrom}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Do:</Label>
                  <Input
                    type="date"
                    value={historyFilters.dateTo}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Status:</Label>
                  <Select 
                    value={historyFilters.status} 
                    onValueChange={(value) => setHistoryFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      <SelectItem value="sent">Wysłane</SelectItem>
                      <SelectItem value="error">Błędne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-48">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj (email, temat, tytuł)..."
                    value={historyFilters.search}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="flex-1"
                  />
                </div>
                <Button onClick={fetchHistory} disabled={historyLoading}>
                  <Search className="h-4 w-4 mr-2" />
                  Filtruj
                </Button>
              </div>

              {/* Sub-tabs */}
              <Tabs value={historyTab} onValueChange={(v) => setHistoryTab(v as 'emails' | 'notifications')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="emails" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Wysłane emaile ({emailLogs.length})
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Powiadomienia ({notificationLogs.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="emails">
                  {historyLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : emailLogs.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Brak emaili do wyświetlenia. Kliknij "Filtruj" lub "Odśwież".</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky top-0 bg-background">Data</TableHead>
                            <TableHead className="sticky top-0 bg-background">Odbiorca</TableHead>
                            <TableHead className="sticky top-0 bg-background">Email</TableHead>
                            <TableHead className="sticky top-0 bg-background">Temat</TableHead>
                            <TableHead className="sticky top-0 bg-background">Szablon</TableHead>
                            <TableHead className="sticky top-0 bg-background">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {emailLogs.map(log => (
                            <TableRow key={log.id}>
                              <TableCell className="whitespace-nowrap text-sm">
                                {format(new Date(log.sent_at || log.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                              </TableCell>
                              <TableCell className="text-sm">{log.user_name}</TableCell>
                              <TableCell className="text-sm font-mono text-xs">{log.recipient_email}</TableCell>
                              <TableCell className="text-sm max-w-48 truncate" title={log.subject}>
                                {log.subject}
                              </TableCell>
                              <TableCell className="text-sm">
                                <Badge variant="outline" className="text-xs">
                                  {log.template_name}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {log.status === 'sent' ? (
                                  <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Wysłany
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="flex items-center gap-1" title={log.error_message || 'Błąd'}>
                                    <XCircle className="h-3 w-3" />
                                    Błąd
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notifications">
                  {historyLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : notificationLogs.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Brak powiadomień do wyświetlenia. Kliknij "Filtruj" lub "Odśwież".</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky top-0 bg-background">Data</TableHead>
                            <TableHead className="sticky top-0 bg-background">Użytkownik</TableHead>
                            <TableHead className="sticky top-0 bg-background">Typ</TableHead>
                            <TableHead className="sticky top-0 bg-background">Tytuł</TableHead>
                            <TableHead className="sticky top-0 bg-background">Treść</TableHead>
                            <TableHead className="sticky top-0 bg-background">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notificationLogs.map(log => (
                            <TableRow key={log.id}>
                              <TableCell className="whitespace-nowrap text-sm">
                                {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                              </TableCell>
                              <TableCell className="text-sm">{log.user_name}</TableCell>
                              <TableCell className="text-sm">
                                <Badge variant="outline" className="text-xs">
                                  {log.notification_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm max-w-40 truncate" title={log.title}>
                                {log.title}
                              </TableCell>
                              <TableCell className="text-sm max-w-48 truncate" title={log.message || ''}>
                                {log.message || '-'}
                              </TableCell>
                              <TableCell>
                                {log.is_read ? (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    Przeczytane
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30 flex items-center gap-1">
                                    <EyeOff className="h-3 w-3" />
                                    Nieprzeczytane
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Type Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEventType ? 'Edytuj typ zdarzenia' : 'Nowy typ zdarzenia'}
            </DialogTitle>
            <DialogDescription>
              {editingEventType 
                ? 'Zmodyfikuj ustawienia typu zdarzenia.' 
                : 'Utwórz nowy typ zdarzenia, który może wywoływać powiadomienia.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nazwa *</Label>
                <Input
                  value={eventForm.name}
                  onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="np. Nowy kontakt"
                />
              </div>
              <div className="space-y-2">
                <Label>Klucz zdarzenia *</Label>
                <Input
                  value={eventForm.event_key}
                  onChange={(e) => setEventForm(prev => ({ ...prev, event_key: e.target.value }))}
                  placeholder="np. contact_added"
                  disabled={!!editingEventType}
                />
                {editingEventType && (
                  <p className="text-xs text-muted-foreground">Klucz nie może być zmieniony</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opis</Label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Krótki opis zdarzenia..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Moduł źródłowy</Label>
                <Select 
                  value={eventForm.source_module} 
                  onValueChange={(value) => setEventForm(prev => ({ ...prev, source_module: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_MODULES.map(mod => (
                      <SelectItem key={mod.value} value={mod.value}>
                        {mod.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Szablon email</Label>
                <Select 
                  value={eventForm.email_template_id || 'none'} 
                  onValueChange={(value) => setEventForm(prev => ({ 
                    ...prev, 
                    email_template_id: value === 'none' ? null : value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Brak" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Brak --</SelectItem>
                    {emailTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ikona</Label>
                <IconPicker
                  value={eventForm.icon_name}
                  onChange={(iconName) => setEventForm(prev => ({ ...prev, icon_name: iconName || 'Bell' }))}
                  trigger={
                    <Button variant="outline" className="w-full justify-start gap-2">
                      {(() => {
                        const IconComp = getIconComponent(eventForm.icon_name);
                        return <IconComp className="h-4 w-4" />;
                      })()}
                      <span>{eventForm.icon_name}</span>
                    </Button>
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Kolor</Label>
                <div className="flex gap-2">
                  <div className="flex gap-1 flex-wrap">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          eventForm.color === color ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEventForm(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={eventForm.color}
                    onChange={(e) => setEventForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-8 p-0 border-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={eventForm.is_active}
                  onCheckedChange={(checked) => setEventForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Aktywny</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={eventForm.send_email}
                  onCheckedChange={(checked) => setEventForm(prev => ({ ...prev, send_email: checked }))}
                />
                <Label>Wysyłaj email</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveEventType} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Zapisuję...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingEventType ? 'Zapisz zmiany' : 'Utwórz'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface RouteFormProps {
  eventTypes: NotificationEventType[];
  onAdd: (eventTypeId: string, sourceRole: string, targetRole: string) => void;
}

const RouteForm = ({ eventTypes, onAdd }: RouteFormProps) => {
  const [eventTypeId, setEventTypeId] = useState('');
  const [sourceRole, setSourceRole] = useState('');
  const [targetRole, setTargetRole] = useState('');

  const handleSubmit = () => {
    if (!eventTypeId || !sourceRole || !targetRole) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }
    onAdd(eventTypeId, sourceRole, targetRole);
    setEventTypeId('');
    setSourceRole('');
    setTargetRole('');
  };

  return (
    <div className="flex items-end gap-4">
      <div className="flex-1">
        <Label className="text-xs">Typ zdarzenia</Label>
        <Select value={eventTypeId} onValueChange={setEventTypeId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Wybierz zdarzenie" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.filter(e => e.is_active).map(e => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label className="text-xs">Od roli</Label>
        <Select value={sourceRole} onValueChange={setSourceRole}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Wybierz rolę" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map(role => (
              <SelectItem key={role} value={role}>{ROLE_NAMES[role]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label className="text-xs">Do roli</Label>
        <Select value={targetRole} onValueChange={setTargetRole}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Wybierz rolę" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map(role => (
              <SelectItem key={role} value={role}>{ROLE_NAMES[role]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSubmit}>
        <Plus className="h-4 w-4 mr-2" />
        Dodaj
      </Button>
    </div>
  );
};
