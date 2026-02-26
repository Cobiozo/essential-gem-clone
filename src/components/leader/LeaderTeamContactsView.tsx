import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contact, Search, Download, Loader2 } from 'lucide-react';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const LeaderTeamContactsView: React.FC = () => {
  const { teamMembers, loading } = useLeaderTeamMembers();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = teamMembers.filter(m => {
    const matchesSearch = !search ||
      (m.first_name?.toLowerCase().includes(search.toLowerCase())) ||
      (m.last_name?.toLowerCase().includes(search.toLowerCase())) ||
      (m.email?.toLowerCase().includes(search.toLowerCase())) ||
      (m.eq_id?.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roles = [...new Set(teamMembers.map(m => m.role).filter(Boolean))];

  const exportToXlsx = () => {
    const wsData = filtered.map(m => ({
      'Imię': m.first_name || '', 'Nazwisko': m.last_name || '',
      'Email': m.email || '', 'Telefon': m.phone_number || '',
      'EQ ID': m.eq_id || '', 'Rola': m.role || '',
      'Poziom': m.level,
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kontakty');
    XLSX.writeFile(wb, 'kontakty_zespolu.xlsx');
    toast({ title: 'Eksport zakończony' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Contact className="h-5 w-5 text-primary" />
          Kontakty zespołu
        </CardTitle>
        <CardDescription>Dane kontaktowe członków Twojego zespołu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Szukaj..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Rola" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              {roles.map(r => <SelectItem key={r} value={r!}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportToXlsx}>
            <Download className="h-4 w-4 mr-1" /> XLSX
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Brak kontaktów</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Imię</th>
                  <th className="text-left py-2 px-2">Nazwisko</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Telefon</th>
                  <th className="text-left py-2 px-2">EQ ID</th>
                  <th className="text-left py-2 px-2">Rola</th>
                  <th className="text-left py-2 px-2">Poziom</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 px-2">{m.first_name}</td>
                    <td className="py-2 px-2">{m.last_name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{m.email}</td>
                    <td className="py-2 px-2 text-muted-foreground">{m.phone_number || '—'}</td>
                    <td className="py-2 px-2"><Badge variant="outline" className="text-xs">{m.eq_id}</Badge></td>
                    <td className="py-2 px-2"><Badge variant="secondary" className="text-xs">{m.role}</Badge></td>
                    <td className="py-2 px-2 text-muted-foreground">{m.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderTeamContactsView;
