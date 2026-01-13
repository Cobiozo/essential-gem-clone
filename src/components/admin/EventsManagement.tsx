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
  RefreshCw,
  MessageSquare,
  UsersRound,
  UserRound
} from 'lucide-react';
import type { DbEvent, MeetingTopic, LeaderPermission, EventsSettings, AdminLeaderWithProfile, TopicWithLeader } from '@/types/events';
import { WebinarForm } from './WebinarForm';
import { WebinarList } from './WebinarList';
import { TeamTrainingForm } from './TeamTrainingForm';
import { TeamTrainingList } from './TeamTrainingList';
import { BookOpen } from 'lucide-react';

export const EventsManagement: React.FC = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const dateLocale = language === 'pl' ? pl : enUS;

  // State
  const [activeTab, setActiveTab] = useState('webinars');
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [topics, setTopics] = useState<TopicWithLeader[]>([]);
  const [leaders, setLeaders] = useState<AdminLeaderWithProfile[]>([]);
  const [settings, setSettings] = useState<EventsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showWebinarForm, setShowWebinarForm] = useState(false);
  const [editingWebinar, setEditingWebinar] = useState<DbEvent | null>(null);
  const [showTeamTrainingForm, setShowTeamTrainingForm] = useState(false);
  const [editingTeamTraining, setEditingTeamTraining] = useState<DbEvent | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DbEvent | null>(null);
  const [editingTopic, setEditingTopic] = useState<MeetingTopic | null>(null);
  
  // Form states for team/private meetings
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

  // Filtered events by type
  const webinars = events.filter(e => e.event_type === 'webinar');
  const teamTrainings = events.filter(e => e.event_type === 'team_training');
  const teamMeetings = events.filter(e => e.event_type === 'meeting_public');
  const privateMeetings = events.filter(e => e.event_type === 'meeting_private');

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

  // Webinar handlers
  const handleWebinarSave = () => {
    setShowWebinarForm(false);
    setEditingWebinar(null);
    loadEvents();
  };

  const handleWebinarCancel = () => {
    setShowWebinarForm(false);
    setEditingWebinar(null);
  };

  const handleEditWebinar = (webinar: DbEvent) => {
    setEditingWebinar(webinar);
    setShowWebinarForm(true);
  };

  const handleDeleteWebinar = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('toast.success'), description: 'Webinar został usunięty' });
    loadEvents();
  };

  // Team Training handlers
  const handleTeamTrainingSave = () => {
    setShowTeamTrainingForm(false);
    setEditingTeamTraining(null);
    loadEvents();
  };

  const handleTeamTrainingCancel = () => {
    setShowTeamTrainingForm(false);
    setEditingTeamTraining(null);
  };

  const handleEditTeamTraining = (training: DbEvent) => {
    setEditingTeamTraining(training);
    setShowTeamTrainingForm(true);
  };

  const handleDeleteTeamTraining = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('toast.success'), description: 'Szkolenie zostało usunięte' });
    loadEvents();
  };

  // Event handlers (for team/private meetings)
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
        .insert({ ...eventData, created_by: user.id }));
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
          <h2 className="text-2xl font-bold">Zarządzanie Wydarzeniami</h2>
          <p className="text-muted-foreground">Panel administratora</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'webinars' && !showWebinarForm && (
            <Button onClick={() => setShowWebinarForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj Webinar
            </Button>
          )}
          {activeTab === 'team-training' && !showTeamTrainingForm && (
            <Button onClick={() => setShowTeamTrainingForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj Szkolenie
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="webinars" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Webinary</span>
          </TabsTrigger>
          <TabsTrigger value="team-training" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Szkolenie zespołu</span>
          </TabsTrigger>
          <TabsTrigger value="sms-logs" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Logi SMS</span>
          </TabsTrigger>
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Tematy</span>
          </TabsTrigger>
          <TabsTrigger value="leaders" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Liderzy</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Ustawienia</span>
          </TabsTrigger>
        </TabsList>

        {/* Webinars Tab */}
        <TabsContent value="webinars" className="space-y-4 mt-6">
          {showWebinarForm ? (
            <WebinarForm
              editingWebinar={editingWebinar}
              onSave={handleWebinarSave}
              onCancel={handleWebinarCancel}
            />
          ) : (
            <WebinarList
              webinars={webinars}
              onEdit={handleEditWebinar}
              onDelete={handleDeleteWebinar}
              onRefresh={loadEvents}
            />
          )}
        </TabsContent>

        {/* Team Training Tab */}
        <TabsContent value="team-training" className="space-y-4 mt-6">
          {showTeamTrainingForm ? (
            <TeamTrainingForm
              editingTraining={editingTeamTraining}
              onSave={handleTeamTrainingSave}
              onCancel={handleTeamTrainingCancel}
            />
          ) : (
            <TeamTrainingList
              trainings={teamTrainings}
              onEdit={handleEditTeamTraining}
              onDelete={handleDeleteTeamTraining}
              onRefresh={loadEvents}
            />
          )}
        </TabsContent>

        {/* SMS Logs Tab */}
        <TabsContent value="sms-logs" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Logi przypomnień SMS</CardTitle>
              <CardDescription>Historia wysłanych przypomnień SMS dla webinarów</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Brak logów SMS. Przypomnienia zostaną zapisane po włączeniu funkcji SMS.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Topics Tab */}
        <TabsContent value="topics" className="space-y-4 mt-6">
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
        <TabsContent value="leaders" className="space-y-4 mt-6">
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
        <TabsContent value="settings" className="space-y-4 mt-6">
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
