import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, CheckCircle, XCircle, Mail, Trophy, Download, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import * as XLSX from 'xlsx';

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

interface EventRegistrationReportProps {
  registrations: EventRegistration[];
  guestRegistrations: GuestRegistration[];
  eventTitle: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  partner: 'Partner',
  specjalista: 'Specjalista',
  client: 'Klient',
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(200, 80%, 50%)',
];

export const EventRegistrationReport: React.FC<EventRegistrationReportProps> = ({
  registrations,
  guestRegistrations,
  eventTitle,
}) => {
  // Unique users
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, EventRegistration>();
    registrations.forEach(r => {
      if (!map.has(r.user_id)) map.set(r.user_id, r);
    });
    return Array.from(map.values());
  }, [registrations]);

  // Stats
  const stats = useMemo(() => {
    const totalUsers = uniqueUsers.length;
    const activeUsers = new Set(registrations.filter(r => r.status === 'registered').map(r => r.user_id)).size;
    const cancelledUsers = new Set(registrations.filter(r => r.status === 'cancelled').map(r => r.user_id)).size;
    const totalGuests = guestRegistrations.length;
    const activeGuests = guestRegistrations.filter(r => r.status === 'registered').length;
    const confirmedEmail = guestRegistrations.filter(r => r.confirmation_sent).length;
    const reminderSent = guestRegistrations.filter(r => r.reminder_sent).length;

    return {
      total: totalUsers + totalGuests,
      totalUsers,
      activeUsers,
      cancelledUsers,
      totalGuests,
      activeGuests,
      confirmedEmail,
      reminderSent,
    };
  }, [uniqueUsers, registrations, guestRegistrations]);

  // Role distribution pie
  const roleData = useMemo(() => {
    const counts: Record<string, number> = {};
    uniqueUsers.forEach(r => {
      const role = r.profiles.role || 'unknown';
      counts[role] = (counts[role] || 0) + 1;
    });
    return Object.entries(counts).map(([role, count]) => ({
      name: ROLE_LABELS[role] || role,
      value: count,
    }));
  }, [uniqueUsers]);

  // Users vs Guests pie
  const userVsGuestData = useMemo(() => [
    { name: 'Użytkownicy', value: stats.totalUsers },
    { name: 'Goście', value: stats.totalGuests },
  ], [stats]);

  // Registration timeline
  const timelineData = useMemo(() => {
    const dayMap = new Map<string, { users: number; guests: number }>();

    registrations.forEach(r => {
      const day = format(startOfDay(parseISO(r.registered_at)), 'dd.MM');
      const entry = dayMap.get(day) || { users: 0, guests: 0 };
      entry.users++;
      dayMap.set(day, entry);
    });

    guestRegistrations.forEach(r => {
      const day = format(startOfDay(parseISO(r.registered_at)), 'dd.MM');
      const entry = dayMap.get(day) || { users: 0, guests: 0 };
      entry.guests++;
      dayMap.set(day, entry);
    });

    return Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, counts]) => ({ day, ...counts }));
  }, [registrations, guestRegistrations]);

  // Top 10 partner ranking
  const partnerRanking = useMemo(() => {
    const inviterMap = new Map<string, { total: number; active: number; profile: { first_name: string | null; last_name: string | null } | null }>();

    guestRegistrations.forEach(r => {
      if (!r.invited_by_user_id) return;
      const entry = inviterMap.get(r.invited_by_user_id) || { total: 0, active: 0, profile: r.inviter_profile || null };
      entry.total++;
      if (r.status === 'registered') entry.active++;
      if (!entry.profile && r.inviter_profile) entry.profile = r.inviter_profile;
      inviterMap.set(r.invited_by_user_id, entry);
    });

    return Array.from(inviterMap.entries())
      .map(([userId, data]) => ({
        userId,
        name: data.profile
          ? `${data.profile.first_name || ''} ${data.profile.last_name || ''}`.trim() || 'Brak danych'
          : 'Brak danych',
        total: data.total,
        active: data.active,
        rate: data.total > 0 ? Math.round((data.active / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [guestRegistrations]);

  // XLSX export
  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();

    // Stats sheet
    const statsRows = [
      ['Raport rejestracji', eventTitle],
      ['Data wygenerowania', format(new Date(), 'dd.MM.yyyy HH:mm')],
      [],
      ['Metryka', 'Wartość'],
      ['Łącznie zapisanych', stats.total],
      ['Użytkownicy', stats.totalUsers],
      ['Użytkownicy aktywni', stats.activeUsers],
      ['Użytkownicy anulowani', stats.cancelledUsers],
      ['Goście', stats.totalGuests],
      ['Goście aktywni', stats.activeGuests],
      ['Potwierdzono email', stats.confirmedEmail],
      ['Wysłano przypomnienie', stats.reminderSent],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(statsRows), 'Statystyki');

    // Users sheet
    const userRows = [
      ['Imię', 'Nazwisko', 'Email', 'Rola', 'Status', 'Data zapisu'],
      ...registrations.map(r => [
        r.profiles.first_name || '',
        r.profiles.last_name || '',
        r.profiles.email,
        ROLE_LABELS[r.profiles.role] || r.profiles.role,
        r.status === 'registered' ? 'Aktywny' : 'Anulowany',
        format(parseISO(r.registered_at), 'dd.MM.yyyy HH:mm'),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(userRows), 'Użytkownicy');

    // Guests sheet
    const guestRows = [
      ['Imię', 'Nazwisko', 'Email', 'Telefon', 'Status', 'Data rejestracji', 'Zaproszony przez', 'Potwierdzenie', 'Przypomnienie'],
      ...guestRegistrations.map(r => [
        r.first_name,
        r.last_name || '',
        r.email,
        r.phone || '',
        r.status,
        format(parseISO(r.registered_at), 'dd.MM.yyyy HH:mm'),
        r.inviter_profile ? `${r.inviter_profile.first_name || ''} ${r.inviter_profile.last_name || ''}`.trim() : '',
        r.confirmation_sent ? 'Tak' : 'Nie',
        r.reminder_sent ? 'Tak' : 'Nie',
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guestRows), 'Goście');

    // Ranking sheet
    const rankingRows = [
      ['Pozycja', 'Imię i nazwisko', 'Zaproszonych', 'Aktywnych', 'Skuteczność %'],
      ...partnerRanking.map((p, i) => [i + 1, p.name, p.total, p.active, p.rate]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rankingRows), 'Ranking partnerów');

    XLSX.writeFile(wb, `raport_${eventTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Raport i statystyki</h3>
        </div>
        <Button onClick={handleExportXLSX} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Eksport XLSX
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Łącznie zapisanych</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeUsers + stats.activeGuests}</p>
                <p className="text-xs text-muted-foreground">Aktywnych</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cancelledUsers}</p>
                <p className="text-xs text-muted-foreground">Anulowanych</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <UserPlus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalGuests}</p>
                <p className="text-xs text-muted-foreground">Goście</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users vs Guests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Użytkownicy vs Goście</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={userVsGuestData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {userVsGuestData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Brak danych</div>
            )}
          </CardContent>
        </Card>

        {/* Role distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rozkład ról</CardTitle>
          </CardHeader>
          <CardContent>
            {roleData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {roleData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Brak danych</div>
            )}
          </CardContent>
        </Card>

        {/* Registration timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejestracje w czasie</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Legend />
                  <Bar dataKey="users" name="Użytkownicy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="guests" name="Goście" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Brak danych</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email/Reminder stats */}
      {stats.totalGuests > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Mail className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Potwierdzono email: <strong>{stats.confirmedEmail}</strong>/{stats.totalGuests}</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Wysłano przypomnienie: <strong>{stats.reminderSent}</strong>/{stats.totalGuests}</span>
          </div>
        </div>
      )}

      {/* Top 10 partner ranking */}
      {partnerRanking.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Top 10 — Ranking skuteczności zapraszania
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-center">Zaproszonych</TableHead>
                    <TableHead className="text-center">Aktywnych</TableHead>
                    <TableHead className="text-center">Skuteczność</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerRanking.map((partner, i) => (
                    <TableRow key={partner.userId}>
                      <TableCell className="font-bold">
                        {i < 3 ? (
                          <span className={i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-600'}>
                            {['🥇', '🥈', '🥉'][i]}
                          </span>
                        ) : (
                          i + 1
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{partner.name}</TableCell>
                      <TableCell className="text-center">{partner.total}</TableCell>
                      <TableCell className="text-center">{partner.active}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={partner.rate >= 80 ? 'default' : partner.rate >= 50 ? 'secondary' : 'outline'}
                          className={partner.rate >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                        >
                          {partner.rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventRegistrationReport;
