import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Mail, AlertTriangle, CheckCircle, XCircle, Shield, Clock,
  Search, ChevronLeft, ChevronRight, Copy, Info, ShieldAlert,
  ShieldCheck, TrendingUp, BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Strict providers risk list
const STRICT_PROVIDERS: Record<string, { risk: 'very_high' | 'high' | 'medium'; reason: string }> = {
  't-online.de': { risk: 'very_high', reason: 'Odrzuca maile z shared IP bez pełnego DKIM/DMARC pass' },
  'freenet.de': { risk: 'very_high', reason: 'Blokuje shared hosting SMTP' },
  'posteo.de': { risk: 'very_high', reason: 'Wymaga DKIM + DMARC strict alignment' },
  'mailbox.org': { risk: 'high', reason: 'Wymaga SPF + DKIM + DMARC' },
  'gmx.de': { risk: 'medium', reason: 'Przyjmuje ale filtruje do spamu bez DKIM' },
  'gmx.at': { risk: 'medium', reason: 'Przyjmuje ale filtruje do spamu bez DKIM' },
  'web.de': { risk: 'medium', reason: 'Przyjmuje ale filtruje do spamu bez DKIM' },
  'outlook.de': { risk: 'medium', reason: 'Microsoft wymaga SPF pass, sprawdza reputację IP' },
  'hotmail.de': { risk: 'medium', reason: 'Microsoft wymaga SPF pass, sprawdza reputację IP' },
  'yahoo.de': { risk: 'medium', reason: 'Wymaga DKIM, sprawdza reputację' },
};

const USER_WARNING_TEXT = `⚠️ Ważna informacja dotycząca powiadomień e-mail

Niektórzy dostawcy poczty e-mail (szczególnie T-Online.de, Freenet.de, Posteo.de, Mailbox.org) stosują bardzo rygorystyczne filtry antyspamowe, które mogą blokować wiadomości z naszej platformy.

Jeśli korzystasz z jednego z tych dostawców, zalecamy:
• Sprawdzanie folderu SPAM regularnie
• Dodanie adresu noreply@purelife.info.pl do kontaktów/białej listy
• Rozważenie użycia alternatywnego adresu e-mail (np. Gmail, WP, O2)

Dostarczalność jest potwierdzona dla: Gmail, WP.pl, O2.pl, Interia.pl, Onet.pl, ProtonMail, iCloud.`;

type TimeRange = '24h' | '7d' | '30d' | 'all';

const extractDomain = (email: string): string => {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : 'unknown';
};

export const EmailDeliveryDashboard: React.FC = () => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);

  const getTimeRangeDate = (range: TimeRange): string | null => {
    const now = new Date();
    switch (range) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default: return null;
    }
  };

  // Fetch all email logs
  const { data: emailLogs, isLoading } = useQuery({
    queryKey: ['email-delivery-logs', timeRange],
    queryFn: async () => {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false });

      const rangeDate = getTimeRangeDate(timeRange);
      if (rangeDate) {
        query = query.gte('created_at', rangeDate);
      }

      // Fetch up to 5000 for analytics
      const { data, error } = await query.limit(5000);
      if (error) throw error;
      return data || [];
    },
  });

  // Computed stats
  const stats = useMemo(() => {
    if (!emailLogs) return { total: 0, sent: 0, failed: 0, strictDomainCount: 0, todayCount: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sent = emailLogs.filter(e => e.status === 'sent').length;
    const failed = emailLogs.filter(e => e.status === 'failed').length;
    const todayCount = emailLogs.filter(e => new Date(e.created_at!) >= today).length;

    const strictDomainCount = emailLogs.filter(e => {
      const domain = extractDomain(e.recipient_email || '');
      return STRICT_PROVIDERS[domain];
    }).length;

    return { total: emailLogs.length, sent, failed, strictDomainCount, todayCount };
  }, [emailLogs]);

  // Domain analytics
  const domainAnalytics = useMemo(() => {
    if (!emailLogs) return [];

    const domainMap = new Map<string, { count: number; lastSent: string; failed: number }>();
    emailLogs.forEach(log => {
      const domain = extractDomain(log.recipient_email || '');
      const existing = domainMap.get(domain) || { count: 0, lastSent: '', failed: 0 };
      existing.count++;
      if (log.status === 'failed') existing.failed++;
      if (!existing.lastSent || log.created_at! > existing.lastSent) {
        existing.lastSent = log.created_at!;
      }
      domainMap.set(domain, existing);
    });

    return Array.from(domainMap.entries())
      .map(([domain, data]) => ({
        domain,
        ...data,
        strictInfo: STRICT_PROVIDERS[domain] || null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [emailLogs]);

  // All unique domains for filter
  const allDomains = useMemo(() => {
    return domainAnalytics.map(d => d.domain);
  }, [domainAnalytics]);

  // Filtered logs for table
  const filteredLogs = useMemo(() => {
    if (!emailLogs) return [];
    return emailLogs.filter(log => {
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (domainFilter !== 'all') {
        const domain = extractDomain(log.recipient_email || '');
        if (domain !== domainFilter) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          (log.recipient_email || '').toLowerCase().includes(q) ||
          (log.subject || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [emailLogs, statusFilter, domainFilter, searchQuery]);

  const paginatedLogs = filteredLogs.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filteredLogs.length / perPage);

  const getRiskBadge = (risk: 'very_high' | 'high' | 'medium') => {
    switch (risk) {
      case 'very_high':
        return <Badge variant="destructive" className="text-xs">Bardzo wysokie</Badge>;
      case 'high':
        return <Badge variant="destructive" className="text-xs opacity-80">Wysokie</Badge>;
      case 'medium':
        return <Badge className="text-xs bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Średnie</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Wysłano</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Błąd</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const copyWarningText = () => {
    navigator.clipboard.writeText(USER_WARNING_TEXT);
    toast({ title: 'Skopiowano', description: 'Tekst ostrzeżenia skopiowany do schowka' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Monitoring dostarczalności e-mail
        </h2>
        <p className="text-muted-foreground mt-1">
          Statystyki wysyłki, analiza domen i informacje o rygorystycznych dostawcach
        </p>
      </div>

      {/* Time range filter */}
      <div className="flex flex-wrap gap-2">
        {([['24h', 'Ostatnie 24h'], ['7d', '7 dni'], ['30d', '30 dni'], ['all', 'Wszystko']] as const).map(([value, label]) => (
          <Button
            key={value}
            variant={timeRange === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setTimeRange(value); setPage(0); }}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Łącznie wysłanych</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Wysłane dzisiaj</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.todayCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rygorystyczne domeny</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-yellow-600" />
              <span className="text-2xl font-bold">{stats.strictDomainCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Błędy wysyłki</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <span className="text-2xl font-bold">{stats.failed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Domain Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Analityka domen
          </CardTitle>
          <CardDescription>Statystyki wysyłki per domena odbiorcy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domena</TableHead>
                  <TableHead className="text-right">Wysłane</TableHead>
                  <TableHead className="text-right">Błędy</TableHead>
                  <TableHead>Ostatnia wysyłka</TableHead>
                  <TableHead>Ryzyko</TableHead>
                  <TableHead>Uwagi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domainAnalytics.slice(0, 30).map(d => (
                  <TableRow
                    key={d.domain}
                    className={cn(
                      d.strictInfo?.risk === 'very_high' && 'bg-destructive/5',
                      d.strictInfo?.risk === 'high' && 'bg-yellow-500/5',
                    )}
                  >
                    <TableCell className="font-mono text-sm">{d.domain}</TableCell>
                    <TableCell className="text-right font-medium">{d.count}</TableCell>
                    <TableCell className="text-right">{d.failed > 0 ? <span className="text-destructive font-medium">{d.failed}</span> : '0'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(d.lastSent).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      {d.strictInfo ? getRiskBadge(d.strictInfo.risk) : (
                        <Badge variant="outline" className="text-xs"><ShieldCheck className="w-3 h-3 mr-1" />OK</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {d.strictInfo?.reason || 'Brak znanych problemów'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Strict providers warning section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Znane rygorystyczne serwery pocztowe
          </CardTitle>
          <CardDescription>
            Informacja o dostawcach, do których dostarczalność może być ograniczona przy konfiguracji shared hosting SMTP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Bardzo wysokie ryzyko niedostarczenia</AlertTitle>
            <AlertDescription>
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li><strong>T-Online.de</strong> — odrzuca maile z shared IP bez pełnego DKIM/DMARC pass</li>
                <li><strong>Freenet.de</strong> — blokuje shared hosting SMTP</li>
                <li><strong>Posteo.de</strong> — wymaga DKIM + DMARC strict alignment</li>
                <li><strong>Mailbox.org</strong> — wymaga SPF + DKIM + DMARC</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Średnie ryzyko (możliwy filtr SPAM)</AlertTitle>
            <AlertDescription>
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li><strong>GMX.de / Web.de</strong> — przyjmuje, ale filtruje do spamu bez DKIM</li>
                <li><strong>Outlook.de / Hotmail.de</strong> — Microsoft sprawdza reputację IP</li>
                <li><strong>Yahoo.de</strong> — wymaga DKIM, sprawdza reputację</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Potwierdzona dostarczalność</AlertTitle>
            <AlertDescription>
              Gmail, WP.pl, O2.pl, Interia.pl, Onet.pl, ProtonMail, iCloud — brak znanych problemów z dostarczalnością.
            </AlertDescription>
          </Alert>

          <Separator />

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Copy className="w-4 h-4" />
              Tekst ostrzeżenia dla użytkowników
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Skopiuj ten tekst i umieść go na stronie, w emailu powitalnym lub w FAQ:
            </p>
            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap font-mono">
              {USER_WARNING_TEXT}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={copyWarningText}>
              <Copy className="w-4 h-4 mr-2" />
              Kopiuj tekst
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email logs table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Logi wysyłki e-mail
          </CardTitle>
          <CardDescription>Szczegółowa lista wysłanych wiadomości</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po emailu lub temacie..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="sent">Wysłane</SelectItem>
                <SelectItem value="failed">Błędy</SelectItem>
              </SelectContent>
            </Select>
            <Select value={domainFilter} onValueChange={v => { setDomainFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Domena" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie domeny</SelectItem>
                {allDomains.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(0); }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Znaleziono: {filteredLogs.length} wiadomości
          </div>

          {/* Table */}
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Odbiorca</TableHead>
                  <TableHead>Temat</TableHead>
                  <TableHead>Domena</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Błąd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Ładowanie...</TableCell></TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Brak wyników</TableCell></TableRow>
                ) : paginatedLogs.map(log => {
                  const domain = extractDomain(log.recipient_email || '');
                  const isStrict = !!STRICT_PROVIDERS[domain];
                  return (
                    <TableRow key={log.id} className={cn(isStrict && 'bg-yellow-500/5')}>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate">{log.recipient_email}</TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm">{log.subject}</TableCell>
                      <TableCell>
                        <span className={cn("text-sm font-mono", isStrict && "text-yellow-700 font-medium")}>{domain}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status || 'unknown')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at!).toLocaleDateString('pl-PL', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                        {log.error_message || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Strona {page + 1} z {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailDeliveryDashboard;
