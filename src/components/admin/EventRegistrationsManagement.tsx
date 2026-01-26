import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, Users, CheckCircle, XCircle, Calendar } from 'lucide-react';
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
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch events for dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, event_type, start_time, occurrences')
          .eq('is_active', true)
          .order('start_time', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
        
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

  // Fetch registrations when event is selected
  useEffect(() => {
    if (!selectedEventId) {
      setRegistrations([]);
      return;
    }

    const fetchRegistrations = async () => {
      setIsLoadingRegistrations(true);
      try {
        const { data, error } = await supabase
          .from('event_registrations')
          .select(`
            id,
            event_id,
            user_id,
            status,
            registered_at,
            cancelled_at,
            occurrence_index,
            profiles!inner(first_name, last_name, email, role),
            events!inner(title, event_type, start_time, occurrences)
          `)
          .eq('event_id', selectedEventId)
          .order('registered_at', { ascending: false });

        if (error) throw error;
        setRegistrations((data as unknown as EventRegistration[]) || []);
      } catch (error: any) {
        console.error('Error fetching registrations:', error);
        toast({
          title: 'Błąd',
          description: 'Nie udało się pobrać rejestracji',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingRegistrations(false);
      }
    };

    fetchRegistrations();
  }, [selectedEventId, toast]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = registrations.length;
    const active = registrations.filter(r => r.status === 'registered').length;
    const cancelled = registrations.filter(r => r.status === 'cancelled').length;
    return { total, active, cancelled };
  }, [registrations]);

  // Filter registrations
  const filteredRegistrations = useMemo(() => {
    if (statusFilter === 'all') return registrations;
    return registrations.filter(r => r.status === statusFilter);
  }, [registrations, statusFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRegistrations.length === 0) {
      toast({
        title: 'Brak danych',
        description: 'Nie ma rejestracji do wyeksportowania',
        variant: 'destructive',
      });
      return;
    }

    const selectedEvent = events.find(e => e.id === selectedEventId);
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
    link.download = `rejestracje_${selectedEvent?.title || 'wydarzenie'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${filteredRegistrations.length} rejestracji`,
    });
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rejestracje użytkowników na wydarzenia
          </CardTitle>
          <CardDescription>
            Przeglądaj statystyki zapisów zalogowanych użytkowników na wydarzenia wewnętrzne
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
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
                      {event.title} ({event.event_type})
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

            <Button onClick={handleExportCSV} variant="outline" disabled={filteredRegistrations.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Eksport CSV
            </Button>
          </div>

          {/* Statistics */}
          {selectedEventId && (
            <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Wszystkich: <strong>{stats.total}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Aktywnych: <strong>{stats.active}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Anulowanych: <strong>{stats.cancelled}</strong></span>
              </div>
            </div>
          )}

          {/* Registrations table */}
          {isLoadingRegistrations ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedEventId ? (
            <div className="text-center py-8 text-muted-foreground">
              Wybierz wydarzenie, aby zobaczyć rejestracje
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak rejestracji dla wybranego wydarzenia
            </div>
          ) : (
            <div className="border rounded-lg">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default EventRegistrationsManagement;
