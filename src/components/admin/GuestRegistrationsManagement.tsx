import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Download, Mail, Users, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

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

interface EventOption {
  id: string;
  title: string;
  start_time: string;
}

const GuestRegistrationsManagement: React.FC = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [registrations, setRegistrations] = useState<GuestRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Fetch webinar events
  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time')
        .in('event_type', ['webinar', 'team_training'])
        .eq('is_active', true)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }
      setEvents(data || []);
      if (data && data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    };

    fetchEvents();
  }, []);

  // Fetch registrations when event changes
  useEffect(() => {
    if (!selectedEventId) return;

    const fetchRegistrations = async () => {
      setLoading(true);
      try {
        // Fetch registrations first
        const { data: regData, error: regError } = await supabase
          .from('guest_event_registrations')
          .select('*')
          .eq('event_id', selectedEventId)
          .order('registered_at', { ascending: false });

        if (regError) throw regError;

        // If we have registrations with inviters, fetch their profiles separately
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

        // Merge profiles into registrations
        const enrichedData = (regData || []).map(r => ({
          ...r,
          inviter_profile: r.invited_by_user_id ? profilesMap[r.invited_by_user_id] || null : null,
        }));

        setRegistrations(enrichedData);
      } catch (error) {
        console.error('Error fetching registrations:', error);
        toast({
          title: 'Błąd',
          description: 'Nie udało się pobrać listy rejestracji',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, [selectedEventId, toast]);

  const handleExportCSV = () => {
    if (registrations.length === 0) {
      toast({
        title: 'Brak danych',
        description: 'Nie ma danych do eksportu',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Imię', 'Nazwisko', 'Email', 'Telefon', 'Status', 'Data rejestracji', 'Zaproszony przez', 'Potwierdzenie', 'Przypomnienie'];
    const rows = registrations.map(r => [
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
    
    const selectedEvent = events.find(e => e.id === selectedEventId);
    const fileName = selectedEvent 
      ? `rejestracje-${selectedEvent.title.replace(/[^a-zA-Z0-9]/g, '_')}-${format(new Date(), 'yyyyMMdd')}.csv`
      : `rejestracje-${format(new Date(), 'yyyyMMdd')}.csv`;
    
    link.download = fileName;
    link.click();
    
    toast({
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${registrations.length} rejestracji`,
    });
  };

  const handleSendReminder = async (registration: GuestRegistration) => {
    setSendingReminder(registration.id);
    try {
      const selectedEvent = events.find(e => e.id === selectedEventId);
      
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

      // Update reminder status
      await supabase
        .from('guest_event_registrations')
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq('id', registration.id);

      setRegistrations(prev => 
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

  const handleUpdateStatus = async (registrationId: string, newStatus: string) => {
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

      setRegistrations(prev => 
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

  const getStatusBadge = (status: string) => {
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

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const registeredCount = registrations.filter(r => r.status === 'registered').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Zarządzanie rejestracjami gości
        </CardTitle>
        <CardDescription>
          Przeglądaj i zarządzaj gośćmi zarejestrowanymi na webinary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event selector */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Wybierz wydarzenie</label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz webinar..." />
              </SelectTrigger>
              <SelectContent>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} ({format(new Date(event.start_time), 'dd.MM.yyyy')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" onClick={handleExportCSV} disabled={registrations.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Eksport CSV
          </Button>
        </div>

        {/* Stats */}
        {selectedEvent && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{registrations.length}</p>
              <p className="text-sm text-muted-foreground">Wszystkich rejestracji</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{registeredCount}</p>
              <p className="text-sm text-muted-foreground">Aktywnych</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{registrations.filter(r => r.confirmation_sent).length}</p>
              <p className="text-sm text-muted-foreground">Potwierdzono emailem</p>
            </div>
          </div>
        )}

        {/* Registrations table */}
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Ładowanie...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Brak rejestracji dla tego wydarzenia</p>
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
                {registrations.map(registration => (
                  <TableRow key={registration.id}>
                    <TableCell className="font-medium">
                      {registration.first_name} {registration.last_name || ''}
                    </TableCell>
                    <TableCell>{registration.email}</TableCell>
                    <TableCell>{registration.phone || '-'}</TableCell>
                    <TableCell>
                      <Select 
                        value={registration.status} 
                        onValueChange={(value) => handleUpdateStatus(registration.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          {getStatusBadge(registration.status)}
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
      </CardContent>
    </Card>
  );
};

export default GuestRegistrationsManagement;
