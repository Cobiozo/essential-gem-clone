import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Save, Loader2, Eye, Megaphone, Video, Users, AlertCircle, ChevronDown, Search, User, Calendar, Sparkles } from 'lucide-react';
import { NewsTicker } from '@/components/news-ticker';
import { Checkbox } from '@/components/ui/checkbox';
import { format, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMultiFormProtection } from '@/hooks/useFormProtection';

interface TickerSettings {
  id: string;
  is_enabled: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  source_webinars: boolean;
  source_team_meetings: boolean;
  source_announcements: boolean;
  source_important_banners: boolean;
  animation_mode: 'scroll' | 'rotate' | 'static';
  scroll_speed: number;
  rotate_interval: number;
  background_color: string | null;
  text_color: string | null;
}

interface TickerItem {
  id: string;
  content: string;
  short_description: string | null;
  icon: string;
  thumbnail_url: string | null;
  link_url: string | null;
  is_active: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  priority: number;
  is_important: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  // New fields
  target_user_id: string | null;
  font_size: string | null;
  custom_color: string | null;
  effect: string | null;
  icon_animation: string | null;
}

interface EventItem {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  is_active: boolean;
}

interface SelectedEvent {
  id: string;
  event_id: string;
  is_enabled: boolean;
  custom_label: string | null;
}

interface UserProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
}

const ICON_OPTIONS = [
  { value: 'Megaphone', label: 'Megafon' },
  { value: 'Info', label: 'Info' },
  { value: 'AlertCircle', label: 'Alert' },
  { value: 'Star', label: 'Gwiazdka' },
  { value: 'Bell', label: 'Dzwonek' },
  { value: 'Gift', label: 'Prezent' },
  { value: 'Heart', label: 'Serce' },
  { value: 'Zap', label: 'Błyskawica' },
  { value: 'Trophy', label: 'Trofeum' },
  { value: 'Sparkles', label: 'Iskry' },
];

const FONT_SIZE_OPTIONS = [
  { value: 'normal', label: 'Normalny' },
  { value: 'large', label: 'Duży' },
  { value: 'xlarge', label: 'Bardzo duży' },
];

const EFFECT_OPTIONS = [
  { value: 'none', label: 'Brak' },
  { value: 'blink', label: 'Mruganie (3x)' },
  { value: 'pulse', label: 'Pulsowanie' },
  { value: 'glow', label: 'Poświata' },
];

const ICON_ANIMATION_OPTIONS = [
  { value: 'none', label: 'Brak' },
  { value: 'bounce', label: 'Podskakiwanie' },
  { value: 'spin', label: 'Obrót' },
  { value: 'shake', label: 'Trzęsienie' },
];

export const NewsTickerManagement: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TickerSettings | null>(null);
  const [items, setItems] = useState<TickerItem[]>([]);
  const [editingItem, setEditingItem] = useState<TickerItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Events state
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<SelectedEvent[]>([]);
  const [webinarsOpen, setWebinarsOpen] = useState(true);
  const [meetingsOpen, setMeetingsOpen] = useState(true);
  const [savingEvents, setSavingEvents] = useState(false);

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [newItem, setNewItem] = useState({
    content: '',
    short_description: '',
    icon: 'Megaphone',
    thumbnail_url: '',
    link_url: '',
    visible_to_clients: true,
    visible_to_partners: true,
    visible_to_specjalista: true,
    priority: 0,
    is_important: false,
    start_date: '',
    end_date: '',
    // New fields
    targeting_mode: 'roles' as 'roles' | 'user',
    target_user_id: '',
    target_user_name: '',
    font_size: 'normal',
    custom_color: '',
    effect: 'none',
    icon_animation: 'none',
  });

  // Protect form from page refresh on tab switch
  useMultiFormProtection(showAddDialog, !!editingItem);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch settings
      const { data: settingsData } = await supabase
        .from('news_ticker_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsData) {
        setSettings(settingsData as TickerSettings);
      }

      // Fetch items
      const { data: itemsData } = await supabase
        .from('news_ticker_items')
        .select('*')
        .order('priority', { ascending: false });

      if (itemsData) {
        setItems(itemsData as TickerItem[]);
      }

      // Fetch all events (webinars and team_training)
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, event_type, start_time, is_active')
        .in('event_type', ['webinar', 'team_training'])
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (eventsData) {
        setAllEvents(eventsData);
      }

      // Fetch selected events
      const { data: selectedData } = await supabase
        .from('news_ticker_selected_events')
        .select('*');

      if (selectedData) {
        setSelectedEvents(selectedData);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email, role')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    setUserSearchResults(data || []);
    setSearchingUsers(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  // Save settings
  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('news_ticker_settings')
      .update({
        is_enabled: settings.is_enabled,
        visible_to_clients: settings.visible_to_clients,
        visible_to_partners: settings.visible_to_partners,
        visible_to_specjalista: settings.visible_to_specjalista,
        source_webinars: settings.source_webinars,
        source_team_meetings: settings.source_team_meetings,
        source_announcements: settings.source_announcements,
        source_important_banners: settings.source_important_banners,
        animation_mode: settings.animation_mode,
        scroll_speed: settings.scroll_speed,
        rotate_interval: settings.rotate_interval,
        background_color: settings.background_color || null,
        text_color: settings.text_color || null,
      })
      .eq('id', settings.id);

    setSaving(false);

    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się zapisać ustawień', variant: 'destructive' });
    } else {
      toast({ title: 'Zapisano', description: 'Ustawienia zostały zaktualizowane' });
    }
  };

  // Toggle event selection
  const toggleEventSelection = async (eventId: string, isSelected: boolean) => {
    if (isSelected) {
      // Add to selected
      const { data, error } = await supabase
        .from('news_ticker_selected_events')
        .insert({ event_id: eventId, is_enabled: true })
        .select()
        .single();

      if (!error && data) {
        setSelectedEvents([...selectedEvents, data]);
      }
    } else {
      // Remove from selected
      const existing = selectedEvents.find(s => s.event_id === eventId);
      if (existing) {
        await supabase.from('news_ticker_selected_events').delete().eq('id', existing.id);
        setSelectedEvents(selectedEvents.filter(s => s.event_id !== eventId));
      }
    }
  };

  // Check if event is selected
  const isEventSelected = (eventId: string) => {
    return selectedEvents.some(s => s.event_id === eventId && s.is_enabled);
  };

  // Add new item
  const addItem = async () => {
    const { data, error } = await supabase
      .from('news_ticker_items')
      .insert({
        content: newItem.content,
        short_description: newItem.short_description || null,
        icon: newItem.icon,
        thumbnail_url: newItem.thumbnail_url || null,
        link_url: newItem.link_url || null,
        visible_to_clients: newItem.targeting_mode === 'roles' ? newItem.visible_to_clients : false,
        visible_to_partners: newItem.targeting_mode === 'roles' ? newItem.visible_to_partners : false,
        visible_to_specjalista: newItem.targeting_mode === 'roles' ? newItem.visible_to_specjalista : false,
        priority: newItem.priority,
        is_important: newItem.is_important,
        start_date: newItem.start_date || null,
        end_date: newItem.end_date || null,
        target_user_id: newItem.targeting_mode === 'user' ? newItem.target_user_id : null,
        font_size: newItem.is_important ? newItem.font_size : 'normal',
        custom_color: newItem.is_important ? (newItem.custom_color || null) : null,
        effect: newItem.is_important ? newItem.effect : 'none',
        icon_animation: newItem.is_important ? newItem.icon_animation : 'none',
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się dodać komunikatu', variant: 'destructive' });
    } else {
      setItems([data as TickerItem, ...items]);
      setShowAddDialog(false);
      resetNewItem();
      toast({ title: 'Dodano', description: 'Komunikat został dodany' });
    }
  };

  const resetNewItem = () => {
    setNewItem({
      content: '',
      short_description: '',
      icon: 'Megaphone',
      thumbnail_url: '',
      link_url: '',
      visible_to_clients: true,
      visible_to_partners: true,
      visible_to_specjalista: true,
      priority: 0,
      is_important: false,
      start_date: '',
      end_date: '',
      targeting_mode: 'roles',
      target_user_id: '',
      target_user_name: '',
      font_size: 'normal',
      custom_color: '',
      effect: 'none',
      icon_animation: 'none',
    });
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  // Update item
  const updateItem = async (item: TickerItem) => {
    const { error } = await supabase
      .from('news_ticker_items')
      .update({
        content: item.content,
        short_description: item.short_description,
        icon: item.icon,
        thumbnail_url: item.thumbnail_url,
        link_url: item.link_url,
        is_active: item.is_active,
        visible_to_clients: item.visible_to_clients,
        visible_to_partners: item.visible_to_partners,
        visible_to_specjalista: item.visible_to_specjalista,
        priority: item.priority,
        is_important: item.is_important,
        start_date: item.start_date,
        end_date: item.end_date,
        target_user_id: item.target_user_id,
        font_size: item.font_size,
        custom_color: item.custom_color,
        effect: item.effect,
        icon_animation: item.icon_animation,
      })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować komunikatu', variant: 'destructive' });
    } else {
      setItems(items.map(i => i.id === item.id ? item : i));
      setEditingItem(null);
      toast({ title: 'Zapisano', description: 'Komunikat został zaktualizowany' });
    }
  };

  // Delete item
  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('news_ticker_items').delete().eq('id', id);

    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się usunąć komunikatu', variant: 'destructive' });
    } else {
      setItems(items.filter(i => i.id !== id));
      toast({ title: 'Usunięto', description: 'Komunikat został usunięty' });
    }
  };

  // Toggle item active status
  const toggleItemActive = async (item: TickerItem) => {
    const updatedItem = { ...item, is_active: !item.is_active };
    await updateItem(updatedItem);
  };

  // Filter events by type
  const webinars = allEvents.filter(e => e.event_type === 'webinar');
  const meetings = allEvents.filter(e => e.event_type === 'team_training');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pasek Informacyjny (News Ticker)</h2>
          <p className="text-muted-foreground">
            Zarządzaj komunikatami wyświetlanymi w pasku informacyjnym na dashboardzie
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          <TabsTrigger value="items">Komunikaty ({items.length})</TabsTrigger>
          <TabsTrigger value="events">Wydarzenia</TabsTrigger>
          <TabsTrigger value="preview">Podgląd</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia główne</CardTitle>
              <CardDescription>Konfiguracja widoczności i źródeł danych</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Włączony</Label>
                  <p className="text-sm text-muted-foreground">Wyświetlaj pasek informacyjny na dashboardzie</p>
                </div>
                <Switch
                  checked={settings?.is_enabled ?? false}
                  onCheckedChange={(checked) => setSettings(s => s ? { ...s, is_enabled: checked } : null)}
                />
              </div>

              {/* Role visibility */}
              <div className="space-y-3">
                <Label>Widoczność dla ról</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visible_clients"
                      checked={settings?.visible_to_clients ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, visible_to_clients: !!checked } : null)}
                    />
                    <label htmlFor="visible_clients" className="text-sm">Klienci</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visible_partners"
                      checked={settings?.visible_to_partners ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, visible_to_partners: !!checked } : null)}
                    />
                    <label htmlFor="visible_partners" className="text-sm">Partnerzy</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visible_specjalista"
                      checked={settings?.visible_to_specjalista ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, visible_to_specjalista: !!checked } : null)}
                    />
                    <label htmlFor="visible_specjalista" className="text-sm">Specjaliści</label>
                  </div>
                </div>
              </div>

              {/* Data sources */}
              <div className="space-y-3">
                <Label>Źródła danych</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source_announcements"
                      checked={settings?.source_announcements ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, source_announcements: !!checked } : null)}
                    />
                    <label htmlFor="source_announcements" className="text-sm flex items-center gap-2">
                      <Megaphone className="h-4 w-4" />
                      Komunikaty admina
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source_webinars"
                      checked={settings?.source_webinars ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, source_webinars: !!checked } : null)}
                    />
                    <label htmlFor="source_webinars" className="text-sm flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Webinary (wybrane w zakładce Wydarzenia)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source_meetings"
                      checked={settings?.source_team_meetings ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, source_team_meetings: !!checked } : null)}
                    />
                    <label htmlFor="source_meetings" className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Spotkania zespołowe (wybrane w zakładce Wydarzenia)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source_banners"
                      checked={settings?.source_important_banners ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, source_important_banners: !!checked } : null)}
                    />
                    <label htmlFor="source_banners" className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Ważne informacje (bannery)
                    </label>
                  </div>
                </div>
              </div>

              {/* Animation settings */}
              <div className="space-y-4">
                <Label>Animacja</Label>
                <Select
                  value={settings?.animation_mode ?? 'scroll'}
                  onValueChange={(value) => setSettings(s => s ? { ...s, animation_mode: value as 'scroll' | 'rotate' | 'static' } : null)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scroll">Przewijanie (marquee)</SelectItem>
                    <SelectItem value="rotate">Rotacja (zmiana co X sekund)</SelectItem>
                    <SelectItem value="static">Statyczny</SelectItem>
                  </SelectContent>
                </Select>

                {settings?.animation_mode === 'scroll' && (
                  <div className="space-y-2">
                    <Label>Prędkość przewijania: {settings.scroll_speed} px/s</Label>
                    <Slider
                      value={[settings.scroll_speed]}
                      onValueChange={([value]) => setSettings(s => s ? { ...s, scroll_speed: value } : null)}
                      min={20}
                      max={150}
                      step={10}
                      className="w-[300px]"
                    />
                  </div>
                )}

                {settings?.animation_mode === 'rotate' && (
                  <div className="space-y-2">
                    <Label>Interwał rotacji: {settings.rotate_interval}s</Label>
                    <Slider
                      value={[settings.rotate_interval]}
                      onValueChange={([value]) => setSettings(s => s ? { ...s, rotate_interval: value } : null)}
                      min={2}
                      max={15}
                      step={1}
                      className="w-[300px]"
                    />
                  </div>
                )}
              </div>

              <Button onClick={saveSettings} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Zapisz ustawienia
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Wybór wydarzeń
              </CardTitle>
              <CardDescription>
                Zaznacz wydarzenia, które mają być wyświetlane w pasku informacyjnym
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webinars */}
              <Collapsible open={webinarsOpen} onOpenChange={setWebinarsOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", webinarsOpen && "rotate-180")} />
                  <Video className="h-4 w-4" />
                  <span className="font-medium">Webinary ({webinars.length})</span>
                  <Badge variant="secondary" className="ml-auto">
                    {webinars.filter(e => isEventSelected(e.id)).length} wybrane
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-2 pl-4">
                    {webinars.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Brak aktywnych webinarów</p>
                    ) : (
                      webinars.map(event => {
                        const eventDate = new Date(event.start_time);
                        const isOld = isPast(eventDate);
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-md border",
                              isOld && "opacity-50"
                            )}
                          >
                            <Checkbox
                              checked={isEventSelected(event.id)}
                              onCheckedChange={(checked) => toggleEventSelection(event.id, !!checked)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{event.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(eventDate, 'd MMMM yyyy, HH:mm', { locale: pl })}
                                {isOld && ' - minęło'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Team Meetings */}
              <Collapsible open={meetingsOpen} onOpenChange={setMeetingsOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", meetingsOpen && "rotate-180")} />
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Spotkania zespołowe ({meetings.length})</span>
                  <Badge variant="secondary" className="ml-auto">
                    {meetings.filter(e => isEventSelected(e.id)).length} wybrane
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-2 pl-4">
                    {meetings.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Brak aktywnych spotkań zespołowych</p>
                    ) : (
                      meetings.map(event => {
                        const eventDate = new Date(event.start_time);
                        const isOld = isPast(eventDate);
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-md border",
                              isOld && "opacity-50"
                            )}
                          >
                            <Checkbox
                              checked={isEventSelected(event.id)}
                              onCheckedChange={(checked) => toggleEventSelection(event.id, !!checked)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{event.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(eventDate, 'd MMMM yyyy, HH:mm', { locale: pl })}
                                {isOld && ' - minęło'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <p className="text-sm text-muted-foreground">
                Zmiany są zapisywane automatycznie. Wybrane wydarzenia pojawią się w tickerze po włączeniu źródła w Ustawieniach.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetNewItem(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj komunikat
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nowy komunikat</DialogTitle>
                  <DialogDescription>Dodaj nowy komunikat do paska informacyjnego</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Treść *</Label>
                    <Textarea
                      value={newItem.content}
                      onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                      placeholder="Treść komunikatu..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Krótki opis (dla tickera, max 120 znaków)</Label>
                    <Input
                      value={newItem.short_description}
                      onChange={(e) => setNewItem({ ...newItem, short_description: e.target.value.slice(0, 120) })}
                      placeholder="Krótka wersja komunikatu..."
                    />
                    <p className="text-xs text-muted-foreground">{newItem.short_description.length}/120</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ikona</Label>
                      <Select value={newItem.icon} onValueChange={(value) => setNewItem({ ...newItem, icon: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priorytet</Label>
                      <Input
                        type="number"
                        value={newItem.priority}
                        onChange={(e) => setNewItem({ ...newItem, priority: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Link (opcjonalny)</Label>
                    <Input
                      value={newItem.link_url}
                      onChange={(e) => setNewItem({ ...newItem, link_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  {/* Targeting mode */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <Label>Widoczność dla</Label>
                    <RadioGroup
                      value={newItem.targeting_mode}
                      onValueChange={(value) => setNewItem({ ...newItem, targeting_mode: value as 'roles' | 'user' })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="roles" id="target_roles" />
                        <label htmlFor="target_roles" className="text-sm">Wybranych ról</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="user" id="target_user" />
                        <label htmlFor="target_user" className="text-sm">Konkretnego użytkownika</label>
                      </div>
                    </RadioGroup>

                    {newItem.targeting_mode === 'roles' ? (
                      <div className="flex gap-4 pt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={newItem.visible_to_clients}
                            onCheckedChange={(checked) => setNewItem({ ...newItem, visible_to_clients: !!checked })}
                          />
                          <span className="text-sm">Klienci</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={newItem.visible_to_partners}
                            onCheckedChange={(checked) => setNewItem({ ...newItem, visible_to_partners: !!checked })}
                          />
                          <span className="text-sm">Partnerzy</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={newItem.visible_to_specjalista}
                            onCheckedChange={(checked) => setNewItem({ ...newItem, visible_to_specjalista: !!checked })}
                          />
                          <span className="text-sm">Specjaliści</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2">
                        <Label>Wybierz użytkownika</Label>
                        {newItem.target_user_name ? (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                            <User className="h-4 w-4" />
                            <span className="text-sm font-medium">{newItem.target_user_name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setNewItem({ ...newItem, target_user_id: '', target_user_name: '' })}
                            >
                              Zmień
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                value={userSearchQuery}
                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                placeholder="Wpisz imię, nazwisko lub email..."
                                className="pl-9"
                              />
                            </div>
                            {searchingUsers && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Szukanie...
                              </div>
                            )}
                            {userSearchResults.length > 0 && (
                              <ScrollArea className="h-40 border rounded-md">
                                <div className="p-2 space-y-1">
                                  {userSearchResults.map(user => (
                                    <button
                                      key={user.user_id}
                                      type="button"
                                      onClick={() => {
                                        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Użytkownik';
                                        setNewItem({
                                          ...newItem,
                                          target_user_id: user.user_id,
                                          target_user_name: `${name} (${user.email || 'brak email'})`,
                                        });
                                        setUserSearchQuery('');
                                        setUserSearchResults([]);
                                      }}
                                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left"
                                    >
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {user.first_name} {user.last_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {user.email} • {user.role}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </ScrollArea>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Important checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="new_important"
                      checked={newItem.is_important}
                      onCheckedChange={(checked) => setNewItem({ ...newItem, is_important: !!checked })}
                    />
                    <label htmlFor="new_important" className="text-sm">Oznacz jako ważny (wyróżnienie kolorem)</label>
                  </div>

                  {/* Advanced styling (only when important) */}
                  {newItem.is_important && (
                    <div className="space-y-4 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-600" />
                        <Label className="text-amber-600 dark:text-amber-400">Zaawansowane stylowanie</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Rozmiar czcionki</Label>
                          <Select value={newItem.font_size} onValueChange={(value) => setNewItem({ ...newItem, font_size: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FONT_SIZE_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Kolor tekstu</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={newItem.custom_color || '#f59e0b'}
                              onChange={(e) => setNewItem({ ...newItem, custom_color: e.target.value })}
                              className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              value={newItem.custom_color}
                              onChange={(e) => setNewItem({ ...newItem, custom_color: e.target.value })}
                              placeholder="#f59e0b"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Efekt</Label>
                          <Select value={newItem.effect} onValueChange={(value) => setNewItem({ ...newItem, effect: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {EFFECT_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Animacja ikony</Label>
                          <Select value={newItem.icon_animation} onValueChange={(value) => setNewItem({ ...newItem, icon_animation: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ICON_ANIMATION_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data rozpoczęcia</Label>
                      <Input
                        type="datetime-local"
                        value={newItem.start_date}
                        onChange={(e) => setNewItem({ ...newItem, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data zakończenia</Label>
                      <Input
                        type="datetime-local"
                        value={newItem.end_date}
                        onChange={(e) => setNewItem({ ...newItem, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowAddDialog(false); resetNewItem(); }}>Anuluj</Button>
                  <Button onClick={addItem} disabled={!newItem.content || (newItem.targeting_mode === 'user' && !newItem.target_user_id)}>
                    Dodaj
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Brak komunikatów. Kliknij "Dodaj komunikat" aby utworzyć pierwszy.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <Card key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {item.is_important && (
                            <Badge variant="destructive" className="text-xs">Ważny</Badge>
                          )}
                          {!item.is_active && (
                            <Badge variant="secondary" className="text-xs">Nieaktywny</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">Priorytet: {item.priority}</Badge>
                          {item.target_user_id && (
                            <Badge variant="secondary" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              Dla użytkownika
                            </Badge>
                          )}
                          {item.effect && item.effect !== 'none' && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                              {EFFECT_OPTIONS.find(o => o.value === item.effect)?.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{item.short_description || item.content}</p>
                        {item.short_description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                        )}
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                          {!item.target_user_id && (
                            <>
                              {item.visible_to_clients && <span>Klienci</span>}
                              {item.visible_to_partners && <span>Partnerzy</span>}
                              {item.visible_to_specjalista && <span>Specjaliści</span>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => toggleItemActive(item)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edytuj komunikat</DialogTitle>
              </DialogHeader>
              {editingItem && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Treść *</Label>
                    <Textarea
                      value={editingItem.content}
                      onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Krótki opis</Label>
                    <Input
                      value={editingItem.short_description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, short_description: e.target.value.slice(0, 120) })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ikona</Label>
                      <Select value={editingItem.icon} onValueChange={(value) => setEditingItem({ ...editingItem, icon: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priorytet</Label>
                      <Input
                        type="number"
                        value={editingItem.priority}
                        onChange={(e) => setEditingItem({ ...editingItem, priority: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Link</Label>
                    <Input
                      value={editingItem.link_url || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, link_url: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={editingItem.is_important}
                      onCheckedChange={(checked) => setEditingItem({ ...editingItem, is_important: !!checked })}
                    />
                    <span className="text-sm">Oznacz jako ważny</span>
                  </div>

                  {/* Styling for editing */}
                  {editingItem.is_important && (
                    <div className="space-y-3 p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                      <Label className="text-sm text-amber-600">Stylowanie</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Select
                          value={editingItem.font_size || 'normal'}
                          onValueChange={(value) => setEditingItem({ ...editingItem, font_size: value })}
                        >
                          <SelectTrigger><SelectValue placeholder="Rozmiar" /></SelectTrigger>
                          <SelectContent>
                            {FONT_SIZE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={editingItem.effect || 'none'}
                          onValueChange={(value) => setEditingItem({ ...editingItem, effect: value })}
                        >
                          <SelectTrigger><SelectValue placeholder="Efekt" /></SelectTrigger>
                          <SelectContent>
                            {EFFECT_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={editingItem.icon_animation || 'none'}
                          onValueChange={(value) => setEditingItem({ ...editingItem, icon_animation: value })}
                        >
                          <SelectTrigger><SelectValue placeholder="Animacja ikony" /></SelectTrigger>
                          <SelectContent>
                            {ICON_ANIMATION_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="color"
                          value={editingItem.custom_color || '#f59e0b'}
                          onChange={(e) => setEditingItem({ ...editingItem, custom_color: e.target.value })}
                          className="h-10 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingItem(null)}>Anuluj</Button>
                <Button onClick={() => editingItem && updateItem(editingItem)}>Zapisz</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Podgląd paska informacyjnego
              </CardTitle>
              <CardDescription>
                Tak będzie wyglądał pasek na dashboardzie (widok admina - wszystkie komunikaty)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-lg p-4">
                <NewsTicker />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewsTickerManagement;
