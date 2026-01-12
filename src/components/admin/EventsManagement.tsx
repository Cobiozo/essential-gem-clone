import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { 
  Calendar, 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Clock, 
  Video,
  Settings,
  RefreshCw
} from 'lucide-react';
import type { DbEvent, MeetingTopic, LeaderPermission, EventsSettings, AdminLeaderWithProfile, TopicWithLeader } from '@/types/events';

export const EventsManagement: React.FC = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const dateLocale = language === 'pl' ? pl : enUS;

  // State
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [topics, setTopics] = useState<TopicWithLeader[]>([]);
  const [leaders, setLeaders] = useState<AdminLeaderWithProfile[]>([]);
  const [settings, setSettings] = useState<EventsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DbEvent | null>(null);
  const [editingTopic, setEditingTopic] = useState<MeetingTopic | null>(null);
  
  // Form states
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'meeting_public',
    start_time: '',
    end_time: '',
    location: '',
    zoom_link: '',
    max_participants: '',
    requires_registration: true,
    visible_to_partners: true,
    visible_to_specjalista: true,
    visible_to_clients: true,
    visible_to_everyone: false,
  });

  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    leader_user_id: '',
    is_active: true,
  });

  const [leaderSearch, setLeaderSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadEvents(),
        loadTopics(),
        loadLeaders(),
        loadSettings(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: false });
    
    if (error) {
      console.error('Error loading events:', error);
      return;
    }
    setEvents(data || []);
  };

  const loadTopics = async () => {
    const { data, error } = await supabase
      .from('leader_meeting_topics')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading topics:', error);
      return;
    }
    
    // Fetch leader profiles separately
    const topicsWithLeaders: TopicWithLeader[] = [];
    for (const topic of data || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', topic.leader_user_id)
        .single();
      
      topicsWithLeaders.push({
        ...topic,
        leader: profile || undefined
      });
    }
    setTopics(topicsWithLeaders);
  };

  const loadLeaders = async () => {
    const { data, error } = await supabase
      .from('leader_permissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading leaders:', error);
      return;
    }
    
    // Fetch profiles separately
    const leadersWithProfiles: AdminLeaderWithProfile[] = [];
    for (const leader of data || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', leader.user_id)
        .single();
      
      leadersWithProfiles.push({
        ...leader,
        profile: profile || undefined
      });
    }
    setLeaders(leadersWithProfiles);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('events_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error loading settings:', error);
      return;
    }
    setSettings(data);
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setAvailableUsers([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    setAvailableUsers(data || []);
  };

  // Event handlers
  const handleSaveEvent = async () => {
    if (!user) return;

    const eventData = {
      title: eventForm.title,
      description: eventForm.description || null,
      event_type: eventForm.event_type,
      start_time: eventForm.start_time,
      end_time: eventForm.end_time,
      location: eventForm.location || null,
      zoom_link: eventForm.zoom_link || null,
      max_participants: eventForm.max_participants ? parseInt(eventForm.max_participants) : null,
      requires_registration: eventForm.requires_registration,
      visible_to_partners: eventForm.visible_to_partners,
      visible_to_specjalista: eventForm.visible_to_specjalista,
      visible_to_clients: eventForm.visible_to_clients,
      visible_to_everyone: eventForm.visible_to_everyone,
      created_by: user.id,
    };

    let error;
    if (editingEvent) {
      ({ error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id));
    } else {
      ({ error } = await supabase
        .from('events')
        .insert(eventData));
    }

    if (error) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: t('toast.success'), description: editingEvent ? t('events.eventUpdated') : t('events.eventCreated') });
    setEventDialogOpen(false);
    resetEventForm();
    loadEvents();
  };

  const handleDeleteEvent = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('toast.success'), description: t('events.eventDeleted') });
    loadEvents();
  };

  const handleSaveTopic = async () => {
    if (!topicForm.leader_user_id) {
      toast({ title: t('toast.error'), description: t('events.selectLeader'), variant: 'destructive' });
      return;
    }

    const topicData = {
      title: topicForm.title,
      description: topicForm.description || null,
      duration_minutes: topicForm.duration_minutes,
      leader_user_id: topicForm.leader_user_id,
      is_active: topicForm.is_active,
    };

    let error;
    if (editingTopic) {
      ({ error } = await supabase
        .from('leader_meeting_topics')
        .update(topicData)
        .eq('id', editingTopic.id));
    } else {
      ({ error } = await supabase
        .from('leader_meeting_topics')
        .insert(topicData));
    }

    if (error) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: t('toast.success'), description: editingTopic ? t('events.topicUpdated') : t('events.topicCreated') });
    setTopicDialogOpen(false);
    resetTopicForm();
    loadTopics();
  };

  const handleDeleteTopic = async (id: string) => {
    const { error } = await supabase.from('leader_meeting_topics').delete().eq('id', id);
    if (error) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('toast.success'), description: t('events.topicDeleted') });
    loadTopics();
  };

  const handleAddLeader = async (userId: string) => {
    const { error } = await supabase
      .from('leader_permissions')
      .insert({
        user_id: userId,
        can_host_private_meetings: true,
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: t('toast.error'), description: t('events.leaderExists'), variant: 'destructive' });
      } else {
        toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
      }
      return;
    }

    toast({ title: t('toast.success'), description: t('events.leaderAdded') });
    setLeaderDialogOpen(false);
    setLeaderSearch('');
    setAvailableUsers([]);
    loadLeaders();
  };

  const handleToggleLeader = async (id: string, canHost: boolean) => {
    const { error } = await supabase
      .from('leader_permissions')
      .update({ can_host_private_meetings: canHost })
      .eq('id', id);

    if (error) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
      return;
    }
    loadLeaders();
  };

  const handleRemoveLeader = async (id: string) => {
    const { error } = await supabase.from('leader_permissions').delete().eq('id', id);
    if (error) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('toast.success'), description: t('events.leaderRemoved') });
    loadLeaders();
  };

  const handleSaveSettings = async (updates: Partial<EventsSettings>) => {
    if (!settings?.id) return;

    const { error } = await supabase
      .from('events_settings')
      .update(updates)
      .eq('id', settings.id);

    if (error) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: t('toast.success'), description: t('events.settingsSaved') });
    loadSettings();
  };

  const resetEventForm = () => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      description: '',
      event_type: 'meeting_public',
      start_time: '',
      end_time: '',
      location: '',
      zoom_link: '',
      max_participants: '',
      requires_registration: true,
      visible_to_partners: true,
      visible_to_specjalista: true,
      visible_to_clients: true,
      visible_to_everyone: false,
    });
  };

  const resetTopicForm = () => {
    setEditingTopic(null);
    setTopicForm({
      title: '',
      description: '',
      duration_minutes: 30,
      leader_user_id: '',
      is_active: true,
    });
  };

  const openEditEvent = (event: DbEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location || '',
      zoom_link: event.zoom_link || '',
      max_participants: event.max_participants?.toString() || '',
      requires_registration: event.requires_registration ?? true,
      visible_to_partners: event.visible_to_partners ?? true,
      visible_to_specjalista: event.visible_to_specjalista ?? true,
      visible_to_clients: event.visible_to_clients ?? true,
      visible_to_everyone: event.visible_to_everyone ?? false,
    });
    setEventDialogOpen(true);
  };

  const openEditTopic = (topic: MeetingTopic) => {
    setEditingTopic(topic);
    setTopicForm({
      title: topic.title,
      description: topic.description || '',
      duration_minutes: topic.duration_minutes || 30,
      leader_user_id: topic.leader_user_id,
      is_active: topic.is_active ?? true,
    });
    setTopicDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('events.management')}</h2>
          <p className="text-muted-foreground">{t('events.managementDescription')}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="events">
            <Calendar className="h-4 w-4 mr-2" />
            {t('events.events')}
          </TabsTrigger>
          <TabsTrigger value="topics">
            <Video className="h-4 w-4 mr-2" />
            {t('events.meetingTopics')}
          </TabsTrigger>
          <TabsTrigger value="leaders">
            <Users className="h-4 w-4 mr-2" />
            {t('events.leaders')}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            {t('events.settings')}
          </TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetEventForm(); setEventDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('events.addEvent')}
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('events.title')}</TableHead>
                  <TableHead>{t('events.type')}</TableHead>
                  <TableHead>{t('events.dateTime')}</TableHead>
                  <TableHead>{t('events.visibility')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.event_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(event.start_time), 'PPp', { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {event.visible_to_partners && <Badge variant="secondary">P</Badge>}
                        {event.visible_to_specjalista && <Badge variant="secondary">S</Badge>}
                        {event.visible_to_clients && <Badge variant="secondary">C</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditEvent(event)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t('events.noEvents')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Topics Tab */}
        <TabsContent value="topics" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetTopicForm(); setTopicDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('events.addTopic')}
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('events.topic')}</TableHead>
                  <TableHead>{t('events.leader')}</TableHead>
                  <TableHead>{t('events.duration')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((topic) => (
                  <TableRow key={topic.id}>
                    <TableCell className="font-medium">{topic.title}</TableCell>
                    <TableCell>
                      {topic.leader?.first_name} {topic.leader?.last_name}
                    </TableCell>
                    <TableCell>{topic.duration_minutes} min</TableCell>
                    <TableCell>
                      <Badge variant={topic.is_active ? 'default' : 'secondary'}>
                        {topic.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditTopic(topic)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTopic(topic.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {topics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t('events.noTopics')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Leaders Tab */}
        <TabsContent value="leaders" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setLeaderDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('events.addLeader')}
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('events.leader')}</TableHead>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('events.canHost')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map((leader) => (
                  <TableRow key={leader.id}>
                    <TableCell className="font-medium">
                      {leader.profile?.first_name} {leader.profile?.last_name}
                    </TableCell>
                    <TableCell>{leader.profile?.email}</TableCell>
                    <TableCell>
                      <Switch
                        checked={leader.can_host_private_meetings ?? false}
                        onCheckedChange={(checked) => handleToggleLeader(leader.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveLeader(leader.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {leaders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t('events.noLeaders')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('events.calendarSettings')}</CardTitle>
              <CardDescription>{t('events.calendarSettingsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('events.enableCalendar')}</Label>
                  <p className="text-sm text-muted-foreground">{t('events.enableCalendarDescription')}</p>
                </div>
                <Switch
                  checked={settings?.is_enabled ?? true}
                  onCheckedChange={(checked) => handleSaveSettings({ is_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('events.sendReminders')}</Label>
                  <p className="text-sm text-muted-foreground">{t('events.sendRemindersDescription')}</p>
                </div>
                <Switch
                  checked={settings?.send_email_reminders ?? true}
                  onCheckedChange={(checked) => handleSaveSettings({ send_email_reminders: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('events.reminderHours')}</Label>
                <Input
                  type="number"
                  value={settings?.reminder_hours_before ?? 24}
                  onChange={(e) => handleSaveSettings({ reminder_hours_before: parseInt(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? t('events.editEvent') : t('events.addEvent')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('events.title')}</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('events.description')}</Label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('events.type')}</Label>
                <Select
                  value={eventForm.event_type}
                  onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting_public">{t('events.typeMeetingPublic')}</SelectItem>
                    <SelectItem value="meeting_private">{t('events.typeMeetingPrivate')}</SelectItem>
                    <SelectItem value="webinar">{t('events.typeWebinar')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('events.maxParticipants')}</Label>
                <Input
                  type="number"
                  value={eventForm.max_participants}
                  onChange={(e) => setEventForm({ ...eventForm, max_participants: e.target.value })}
                  placeholder={t('events.unlimited')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('events.startTime')}</Label>
                <Input
                  type="datetime-local"
                  value={eventForm.start_time ? eventForm.start_time.slice(0, 16) : ''}
                  onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value + ':00Z' })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('events.endTime')}</Label>
                <Input
                  type="datetime-local"
                  value={eventForm.end_time ? eventForm.end_time.slice(0, 16) : ''}
                  onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value + ':00Z' })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('events.location')}</Label>
              <Input
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder={t('events.locationPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('events.zoomLink')}</Label>
              <Input
                value={eventForm.zoom_link}
                onChange={(e) => setEventForm({ ...eventForm, zoom_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t('events.visibility')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={eventForm.visible_to_partners}
                    onCheckedChange={(checked) => setEventForm({ ...eventForm, visible_to_partners: checked })}
                  />
                  <Label>{t('role.partner')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={eventForm.visible_to_specjalista}
                    onCheckedChange={(checked) => setEventForm({ ...eventForm, visible_to_specjalista: checked })}
                  />
                  <Label>{t('role.specialist')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={eventForm.visible_to_clients}
                    onCheckedChange={(checked) => setEventForm({ ...eventForm, visible_to_clients: checked })}
                  />
                  <Label>{t('role.client')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={eventForm.visible_to_everyone}
                    onCheckedChange={(checked) => setEventForm({ ...eventForm, visible_to_everyone: checked })}
                  />
                  <Label>{t('events.everyone')}</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEvent} disabled={!eventForm.title || !eventForm.start_time || !eventForm.end_time}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Topic Dialog */}
      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTopic ? t('events.editTopic') : t('events.addTopic')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('events.topicTitle')}</Label>
              <Input
                value={topicForm.title}
                onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('events.description')}</Label>
              <Textarea
                value={topicForm.description}
                onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('events.duration')}</Label>
              <Select
                value={topicForm.duration_minutes.toString()}
                onValueChange={(value) => setTopicForm({ ...topicForm, duration_minutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('events.leader')}</Label>
              <Select
                value={topicForm.leader_user_id}
                onValueChange={(value) => setTopicForm({ ...topicForm, leader_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('events.selectLeader')} />
                </SelectTrigger>
                <SelectContent>
                  {leaders.filter(l => l.can_host_private_meetings).map((leader) => (
                    <SelectItem key={leader.user_id} value={leader.user_id}>
                      {leader.profile?.first_name} {leader.profile?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={topicForm.is_active}
                onCheckedChange={(checked) => setTopicForm({ ...topicForm, is_active: checked })}
              />
              <Label>{t('common.active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopicDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveTopic} disabled={!topicForm.title || !topicForm.leader_user_id}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leader Dialog */}
      <Dialog open={leaderDialogOpen} onOpenChange={setLeaderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('events.addLeader')}</DialogTitle>
            <DialogDescription>{t('events.searchUserToAdd')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t('events.searchByNameOrEmail')}
              value={leaderSearch}
              onChange={(e) => {
                setLeaderSearch(e.target.value);
                searchUsers(e.target.value);
              }}
            />
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => handleAddLeader(user.user_id)}
                >
                  <div>
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Plus className="h-4 w-4" />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsManagement;
