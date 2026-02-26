import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Download, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const LeaderEventRegistrationsView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const { data: events = [] } = useQuery({
    queryKey: ['leader-events-for-regs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events').select('id, title, start_time, event_type')
        .eq('host_user_id', user!.id).in('event_type', ['webinar', 'team_training'])
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: registrations = [], isLoading: regsLoading } = useQuery({
    queryKey: ['leader-event-regs', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const [userRegs, guestRegs] = await Promise.all([
        supabase.from('event_registrations').select('id, user_id, registered_at, status').eq('event_id', selectedEventId),
        supabase.from('guest_event_registrations').select('id, first_name, last_name, email, phone, registered_at, status').eq('event_id', selectedEventId),
      ]);
      const userIds = (userRegs.data || []).map(r => r.user_id);
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, first_name, last_name, email, phone_number').in('user_id', userIds);
        (profiles || []).forEach(p => { profilesMap[p.user_id] = p; });
      }
      const userRows = (userRegs.data || []).map(r => {
        const p = profilesMap[r.user_id];
        return { id: r.id, type: 'user' as const, first_name: p?.first_name || '—', last_name: p?.last_name || '—', email: p?.email || '—', phone: p?.phone_number || '—', registered_at: r.registered_at, status: r.status || 'registered' };
      });
      const guestRows = (guestRegs.data || []).map(r => ({ id: r.id, type: 'guest' as const, first_name: r.first_name, last_name: r.last_name || '—', email: r.email, phone: r.phone || '—', registered_at: r.registered_at, status: r.status || 'registered' }));
      return [...userRows, ...guestRows];
    },
    enabled: !!selectedEventId,
  });

  const exportToXlsx = () => {
    if (registrations.length === 0) return;
    const eventTitle = events.find(e => e.id === selectedEventId)?.title || 'rejestracje';
    const wsData = registrations.map(r => ({ 'Imię': r.first_name, 'Nazwisko': r.last_name, 'Email': r.email, 'Telefon': r.phone, 'Typ': r.type === 'user' ? 'Użytkownik' : 'Gość', 'Status': r.status, 'Data rejestracji': r.registered_at ? format(new Date(r.registered_at), 'dd.MM.yyyy HH:mm') : '—' }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rejestracje');
    XLSX.writeFile(wb, `${eventTitle}_rejestracje.xlsx`);
    toast({ title: 'Eksport zakończony' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Rejestracje na wydarzenia</CardTitle>
        <CardDescription>Podgląd osób zarejestrowanych na Twoje wydarzenia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Wybierz wydarzenie" /></SelectTrigger>
            <SelectContent>{events.map(e => (<SelectItem key={e.id} value={e.id}>{e.title} ({e.start_time ? format(new Date(e.start_time), 'dd.MM.yyyy', { locale: pl }) : '—'})</SelectItem>))}</SelectContent>
          </Select>
          {registrations.length > 0 && <Button variant="outline" size="sm" onClick={exportToXlsx}><Download className="h-4 w-4 mr-1" /> XLSX</Button>}
        </div>
        {!selectedEventId ? <p className="text-center text-muted-foreground py-8 text-sm">Wybierz wydarzenie</p> : regsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : registrations.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">Brak rejestracji</p> : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><Users className="h-4 w-4" /><span>{registrations.length} rejestracji</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2 px-2">Imię</th><th className="text-left py-2 px-2">Nazwisko</th><th className="text-left py-2 px-2">Email</th><th className="text-left py-2 px-2">Telefon</th><th className="text-left py-2 px-2">Typ</th><th className="text-left py-2 px-2">Status</th></tr></thead>
                <tbody>{registrations.map(r => (<tr key={r.id} className="border-b last:border-0"><td className="py-2 px-2">{r.first_name}</td><td className="py-2 px-2">{r.last_name}</td><td className="py-2 px-2 text-muted-foreground">{r.email}</td><td className="py-2 px-2 text-muted-foreground">{r.phone}</td><td className="py-2 px-2"><Badge variant={r.type === 'user' ? 'default' : 'outline'} className="text-xs">{r.type === 'user' ? 'Użytkownik' : 'Gość'}</Badge></td><td className="py-2 px-2">{r.status}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderEventRegistrationsView;
