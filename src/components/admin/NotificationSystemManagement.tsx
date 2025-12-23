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
import { toast } from 'sonner';
import { Bell, Settings, Route, Clock, Activity, Plus, Trash2, Save, Mail } from 'lucide-react';
import type { NotificationEventType, NotificationRoleRoute, NotificationLimit } from '@/types/notifications';
import { MODULE_NAMES, ROLE_NAMES } from '@/types/notifications';

const ROLES = ['admin', 'partner', 'specjalista', 'client'];

interface EmailTemplate {
  id: string;
  name: string;
  internal_name: string;
  is_active: boolean;
}

export const NotificationSystemManagement = () => {
  const [eventTypes, setEventTypes] = useState<NotificationEventType[]>([]);
  const [roleRoutes, setRoleRoutes] = useState<NotificationRoleRoute[]>([]);
  const [limits, setLimits] = useState<NotificationLimit[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Typy zdarzeń
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="routing" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Routing ról
          </TabsTrigger>
          <TabsTrigger value="limits" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Limity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {eventTypes.map(eventType => (
              <Card key={eventType.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: eventType.color + '20', color: eventType.color }}
                      >
                        <Bell className="h-5 w-5" />
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
                    <Switch
                      checked={eventType.is_active}
                      onCheckedChange={(checked) => toggleEventType(eventType.id, checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
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
            {eventTypes.filter(e => e.is_active).map(eventType => (
              <Card key={eventType.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: eventType.color + '20', color: eventType.color }}
                      >
                        <Bell className="h-5 w-5" />
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
            ))}
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
                        style={{ backgroundColor: eventType.color }}
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
                        style={{ backgroundColor: eventType.color }}
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
      </Tabs>
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
