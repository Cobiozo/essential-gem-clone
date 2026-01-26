import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, Users, CheckCircle, XCircle, Calendar, UserPlus, Mail, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface EventOption {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  occurrences: any;
  allow_invites: boolean;
}

interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  registered_at: string;
  cancelled_at: string | null;
  occurrence_index: number | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
  };
  events: {
    title: string;
    event_type: string;
    start_time: string;
    occurrences: any;
  };
}

interface GuestRegistration {
  id: string;
  event_id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  status: string;
  registered_at: string;
  confirmation_sent: boolean;
  reminder_sent: boolean;
  invited_by_user_id: string | null;
  team_contact_id: string | null;
  inviter_profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'partner':
      return 'default';
    case 'specjalista':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'partner':
      return 'Partner';
    case 'specjalista':
      return 'Specjalista';
    case 'client':
      return 'Klient';
    default:
      return role;
  }
};

const getOccurrenceDate = (
  occurrences: any,
  occurrenceIndex: number | null,
  baseStartTime: string
): string => {
  if (occurrenceIndex === null || occurrenceIndex === undefined) {
    return format(new Date(baseStartTime), 'dd.MM.yyyy HH:mm', { locale: pl });
  }

  let parsedOccurrences: any[] | null = null;

  if (Array.isArray(occurrences)) {
    parsedOccurrences = occurrences;
  } else if (typeof occurrences === 'string') {
    try {
      parsedOccurrences = JSON.parse(occurrences);
    } catch {
      parsedOccurrences = null;
    }
  }

  if (!parsedOccurrences || !Array.isArray(parsedOccurrences) || occurrenceIndex >= parsedOccurrences.length) {
    return format(new Date(baseStartTime), 'dd.MM.yyyy HH:mm', { locale: pl });
  }

  const occurrence = parsedOccurrences[occurrenceIndex];
  return `${occurrence.date} ${occurrence.time}`;
};

export const EventRegistrationsManagement: React.FC = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [guestRegistrations, setGuestRegistrations] = useState<GuestRegistration[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'guests'>('users');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const selectedEvent = useMemo(() => 
    events.find(e => e.id === selectedEventId), 
    [events, selectedEventId]
  );

  // Fetch events for dropdown - only webinars and team_training
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, event_type, start_time, occurrences, allow_invites')
          .eq('is_active', true)
          .in('event_type', ['webinar', 'team_training'])
          .order('start_time', { ascending: false });

        if (error) throw error;
        setEvents((data || []) as EventOption[]);
        
        // Auto-select first event if available
        if (data && data.length > 0) {
          setSelectedEventId(data[0].id);
        }
      } catch (error: any) {
        toast({
          title: 'Błąd',
          description: 'Nie udało się pobrać listy wydarzeń',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [toast]);

  // Fetch user registrations when event is selected
  useEffect(() => {
    if (!selectedEventId) {
      setRegistrations([]);
      return;
    }

    const fetchRegistrations = async () => {
      setIsLoadingRegistrations(true);
      try {
        // Fetch registrations separately to avoid RLS issues with joins
        const { data: regData, error: regError } = await supabase
          .from('event_registrations')
          .select('id, event_id, user_id, status, registered_at, cancelled_at, occurrence_index')
          .eq('event_id', selectedEventId)
          .order('registered_at', { ascending: false });

        if (regError) throw regError;
        if (!regData || regData.length === 0) {
          setRegistrations([]);
          return;
        }

        // Fetch unique user profiles
        const userIds = [...new Set(regData.map(r => r.user_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, role')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Fetch event data
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, title, event_type, start_time, occurrences')
          .eq('id', selectedEventId)
          .single();

        if (eventError) throw eventError;

        // Merge data
        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        
        const enrichedRegistrations = regData.map(reg => ({
          ...reg,
          profiles: profilesMap.get(reg.user_id) || {
            first_name: null,
            last_name: null,
            email: 'Brak danych',
            role: 'unknown'
          },
          events: eventData
        }));

        setRegistrations(enrichedRegistrations as EventRegistration[]);
      } catch (error: any) {
        console.error('Error fetching registrations:', error);
        toast({
          title: 'Błąd',
          description: 'Nie udało się pobrać rejestracji użytkowników',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingRegistrations(false);
      }
    };

    fetchRegistrations();
  }, [selectedEventId, toast]);

  // Fetch guest registrations when event is selected
  useEffect(() => {
    if (!selectedEventId) {
      setGuestRegistrations([]);
      return;
    }

    const fetchGuestRegistrations = async () => {
      setIsLoadingGuests(true);
      try {
        const { data: regData, error: regError } = await supabase
          .from('guest_event_registrations')
          .select('*')
          .eq('event_id', selectedEventId)
          .order('registered_at', { ascending: false });

        if (regError) throw regError;

        // Fetch inviter profiles
        const inviterIds = [...new Set(
          (regData || [])
            .filter(r => r.invited_by_user_id)
            .map(r => r.invited_by_user_id)
        )].filter(Boolean) as string[];

        let profilesMap: Record<string, { first_name: string | null; last_name: string | null }> = {};

        if (inviterIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', inviterIds);

          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => {
              acc[p.user_id] = { first_name: p.first_name, last_name: p.last_name };
              return acc;
            }, {} as typeof profilesMap);
          }
        }

        const enrichedData = (regData || []).map(r => ({
          ...r,
          inviter_profile: r.invited_by_user_id ? profilesMap[r.invited_by_user_id] || null : null,
        }));

        setGuestRegistrations(enrichedData);
      } catch (error) {
        console.error('Error fetching guest registrations:', error);
        toast({
          title: 'Błąd',
          description: 'Nie udało się pobrać rejestracji gości',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingGuests(false);
      }
    };

    fetchGuestRegistrations();
  }, [selectedEventId, toast]);

  // Calculate statistics for users
  const userStats = useMemo(() => {
    const total = registrations.length;
    const active = registrations.filter(r => r.status === 'registered').length;
    const cancelled = registrations.filter(r => r.status === 'cancelled').length;
    return { total, active, cancelled };
  }, [registrations]);

  // Calculate statistics for guests
  const guestStats = useMemo(() => {
    const total = guestRegistrations.length;
    const active = guestRegistrations.filter(r => r.status === 'registered').length;
    const confirmed = guestRegistrations.filter(r => r.confirmation_sent).length;
    return { total, active, confirmed };
  }, [guestRegistrations]);

  // Filter registrations
  const filteredRegistrations = useMemo(() => {
    if (statusFilter === 'all') return registrations;
    return registrations.filter(r => r.status === statusFilter);
  }, [registrations, statusFilter]);

  const filteredGuestRegistrations = useMemo(() => {
    if (statusFilter === 'all') return guestRegistrations;
    return guestRegistrations.filter(r => r.status === statusFilter);
  }, [guestRegistrations, statusFilter]);

  // Export users to CSV
  const handleExportUsersCSV = () => {
    if (filteredRegistrations.length === 0) {
      toast({
        title: 'Brak danych',
        description: 'Nie ma rejestracji do wyeksportowania',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Imię', 'Nazwisko', 'Email', 'Rola', 'Status', 'Data zapisu', 'Termin wydarzenia'];
    const rows = filteredRegistrations.map(r => [
      r.profiles.first_name || '',
      r.profiles.last_name || '',
      r.profiles.email,
      getRoleLabel(r.profiles.role),
      r.status === 'registered' ? 'Zapisany' : 'Anulowany',
      format(new Date(r.registered_at), 'dd.MM.yyyy HH:mm', { locale: pl }),
      getOccurrenceDate(r.events.occurrences, r.occurrence_index, r.events.start_time),
    ]);

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `uzytkownicy_${selectedEvent?.title || 'wydarzenie'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${filteredRegistrations.length} rejestracji`,
    });
  };

  // Export guests to CSV
  const handleExportGuestsCSV = () => {
    if (filteredGuestRegistrations.length === 0) {
      toast({
        title: 'Brak danych',
        description: 'Nie ma rejestracji gości do wyeksportowania',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Imię', 'Nazwisko', 'Email', 'Telefon', 'Status', 'Data rejestracji', 'Zaproszony przez', 'Potwierdzenie', 'Przypomnienie'];
    const rows = filteredGuestRegistrations.map(r => [
      r.first_name,
      r.last_name || '',
      r.email,
      r.phone || '',
      r.status,
      format(new Date(r.registered_at), 'dd.MM.yyyy HH:mm'),
      r.inviter_profile ? `${r.inviter_profile.first_name || ''} ${r.inviter_profile.last_name || ''}`.trim() : '',
      r.confirmation_sent ? 'Tak' : 'Nie',
      r.reminder_sent ? 'Tak' : 'Nie',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `goscie_${selectedEvent?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'wydarzenie'}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
    
    toast({
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${filteredGuestRegistrations.length} rejestracji gości`,
    });
  };

  // Send reminder to guest
  const handleSendReminder = async (registration: GuestRegistration) => {
    setSendingReminder(registration.id);
    try {
      const { error } = await supabase.functions.invoke('send-webinar-confirmation', {
        body: {
          eventId: selectedEventId,
          email: registration.email,
          firstName: registration.first_name,
          lastName: registration.last_name,
          eventTitle: selectedEvent?.title || 'Webinar',
          eventDate: selectedEvent?.start_time,
        },
      });

      if (error) throw error;

      await supabase
        .from('guest_event_registrations')
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq('id', registration.id);

      setGuestRegistrations(prev => 
        prev.map(r => r.id === registration.id ? { ...r, reminder_sent: true } : r)
      );

      toast({
        title: 'Sukces',
        description: `Przypomnienie wysłane do ${registration.email}`,
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wysłać przypomnienia',
        variant: 'destructive',
      });
    } finally {
      setSendingReminder(null);
    }
  };

  // Update guest status
  const handleUpdateGuestStatus = async (registrationId: string, newStatus: string) => {
    try {
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === 'cancelled') {
        updates.cancelled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('guest_event_registrations')
        .update(updates)
        .eq('id', registrationId);

      if (error) throw error;

      setGuestRegistrations(prev => 
        prev.map(r => r.id === registrationId ? { ...r, status: newStatus } : r)
      );

      toast({
        title: 'Sukces',
        description: 'Status został zaktualizowany',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować statusu',
        variant: 'destructive',
      });
    }
  };

  const getGuestStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Zarejestrowany</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Anulowany</Badge>;
      case 'attended':
        return <Badge className="bg-blue-500"><Users className="h-3 w-3 mr-1" />Uczestniczył</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rejestracje na wydarzenia
          </CardTitle>
          <CardDescription>
            Przeglądaj statystyki zapisów użytkowników i gości na wydarzenia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event selector */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1.5 block">Wydarzenie</label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={isLoadingEvents}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz wydarzenie..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} ({format(new Date(event.start_time), 'dd.MM.yyyy')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="registered">Zapisani</SelectItem>
                  <SelectItem value="cancelled">Anulowani</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs for users/guests */}
          {selectedEventId && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'users' | 'guests')}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <TabsList>
                  <TabsTrigger value="users" className="gap-2">
                    <Users className="h-4 w-4" />
                    Użytkownicy ({userStats.total})
                  </TabsTrigger>
                  {selectedEvent?.allow_invites && (
                    <TabsTrigger value="guests" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Goście ({guestStats.total})
                    </TabsTrigger>
                  )}
                </TabsList>

                <Button 
                  onClick={activeTab === 'users' ? handleExportUsersCSV : handleExportGuestsCSV} 
                  variant="outline" 
                  disabled={activeTab === 'users' ? filteredRegistrations.length === 0 : filteredGuestRegistrations.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Eksport CSV
                </Button>
              </div>

              {/* Users tab */}
              <TabsContent value="users" className="space-y-4">
                {/* Statistics */}
                <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Wszystkich: <strong>{userStats.total}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Aktywnych: <strong>{userStats.active}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Anulowanych: <strong>{userStats.cancelled}</strong></span>
                  </div>
                </div>

                {/* Users table */}
                {isLoadingRegistrations ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredRegistrations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Brak rejestracji użytkowników dla wybranego wydarzenia
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Imię i nazwisko</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rola</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Termin</TableHead>
                          <TableHead>Data zapisu</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRegistrations.map((registration) => (
                          <TableRow key={registration.id}>
                            <TableCell className="font-medium">
                              {registration.profiles.first_name} {registration.profiles.last_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {registration.profiles.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(registration.profiles.role)}>
                                {getRoleLabel(registration.profiles.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {registration.status === 'registered' ? (
                                <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Zapisany
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Anulowany
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {getOccurrenceDate(
                                  registration.events.occurrences,
                                  registration.occurrence_index,
                                  registration.events.start_time
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(registration.registered_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Guests tab */}
              <TabsContent value="guests" className="space-y-4">
                {/* Statistics */}
                <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Wszystkich: <strong>{guestStats.total}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Aktywnych: <strong>{guestStats.active}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Potwierdzono email: <strong>{guestStats.confirmed}</strong></span>
                  </div>
                </div>

                {/* Guests table */}
                {isLoadingGuests ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredGuestRegistrations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    Brak rejestracji gości dla tego wydarzenia
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Imię i nazwisko</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data rejestracji</TableHead>
                          <TableHead>Zaproszony przez</TableHead>
                          <TableHead>Powiadomienia</TableHead>
                          <TableHead>Akcje</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGuestRegistrations.map(registration => (
                          <TableRow key={registration.id}>
                            <TableCell className="font-medium">
                              {registration.first_name} {registration.last_name || ''}
                            </TableCell>
                            <TableCell>{registration.email}</TableCell>
                            <TableCell>{registration.phone || '-'}</TableCell>
                            <TableCell>
                              <Select 
                                value={registration.status} 
                                onValueChange={(value) => handleUpdateGuestStatus(registration.id, value)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  {getGuestStatusBadge(registration.status)}
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="registered">Zarejestrowany</SelectItem>
                                  <SelectItem value="cancelled">Anulowany</SelectItem>
                                  <SelectItem value="attended">Uczestniczył</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {format(new Date(registration.registered_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                            </TableCell>
                            <TableCell>
                              {registration.inviter_profile 
                                ? `${registration.inviter_profile.first_name || ''} ${registration.inviter_profile.last_name || ''}`.trim()
                                : <span className="text-muted-foreground">-</span>
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Badge variant={registration.confirmation_sent ? "default" : "outline"} className="text-xs">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {registration.confirmation_sent ? '✓' : '✗'}
                                </Badge>
                                <Badge variant={registration.reminder_sent ? "default" : "outline"} className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {registration.reminder_sent ? '✓' : '✗'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendReminder(registration)}
                                disabled={sendingReminder === registration.id}
                              >
                                {sendingReminder === registration.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Empty state when no event selected */}
          {!selectedEventId && !isLoadingEvents && (
            <div className="text-center py-8 text-muted-foreground">
              Wybierz wydarzenie, aby zobaczyć rejestracje
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventRegistrationsManagement;
