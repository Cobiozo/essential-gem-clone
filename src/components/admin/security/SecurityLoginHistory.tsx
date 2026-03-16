import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle, XCircle, Monitor, Tablet, Smartphone, CalendarIcon, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Country code to flag emoji using regional indicator symbols
const countryCodeToFlag = (code: string): string => {
  if (!code || code.length !== 2) return '';
  const codePoints = code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
};

const countryToFlag = (country: string, countryCode?: string): string => {
  if (countryCode && countryCode.length === 2) {
    return countryCodeToFlag(countryCode);
  }
  if (!country || country === 'unknown' || country === '—') return '';
  const codeMap: Record<string, string> = {
    'Poland': 'PL', 'Polska': 'PL', 'Germany': 'DE', 'Niemcy': 'DE',
    'United States': 'US', 'United Kingdom': 'GB', 'France': 'FR',
    'Spain': 'ES', 'Italy': 'IT', 'Czech Republic': 'CZ', 'Czechia': 'CZ',
    'Slovakia': 'SK', 'Ukraine': 'UA', 'Netherlands': 'NL', 'Belgium': 'BE',
    'Austria': 'AT', 'Switzerland': 'CH', 'Sweden': 'SE', 'Norway': 'NO',
    'Denmark': 'DK', 'Finland': 'FI', 'Ireland': 'IE', 'Portugal': 'PT',
    'Romania': 'RO', 'Hungary': 'HU', 'Lithuania': 'LT', 'Latvia': 'LV',
    'Estonia': 'EE', 'Bulgaria': 'BG', 'Croatia': 'HR', 'Slovenia': 'SI',
    'Canada': 'CA', 'Australia': 'AU', 'Japan': 'JP', 'China': 'CN',
    'India': 'IN', 'Brazil': 'BR', 'Russia': 'RU', 'Turkey': 'TR',
  };
  const code = codeMap[country];
  return code ? countryCodeToFlag(code) : '🌍';
};

const failureReasonLabel = (reason: string | null): string => {
  if (!reason) return '';
  const map: Record<string, string> = {
    'invalid_password': 'Błędne hasło',
    'email_not_confirmed': 'Email niepotwierdzony',
    'user_not_found': 'Użytkownik nie istnieje',
    'too_many_requests': 'Za dużo prób',
    'account_disabled': 'Konto zablokowane',
    'unknown_error': 'Nieznany błąd',
  };
  return map[reason] || reason;
};

const deviceIcon = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t === 'mobile') return <Smartphone className="w-4 h-4" />;
  if (t === 'tablet') return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
};

const deviceLabel = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t === 'mobile') return 'Telefon';
  if (t === 'tablet') return 'Tablet';
  return 'Komputer';
};

// Browser icon as inline SVG for common browsers
const BrowserIcon: React.FC<{ name: string }> = ({ name }) => {
  const n = (name || '').toLowerCase();
  
  if (n.includes('chrome') && !n.includes('edge')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
        <circle cx="12" cy="12" r="10" fill="#4285F4" />
        <circle cx="12" cy="12" r="4" fill="white" />
        <path d="M12 8h10c-1-3.5-4-6-8-7L12 8z" fill="#EA4335" />
        <path d="M6.5 17L2 9c-1 3.5 0 7.5 3 10l4.5-2z" fill="#34A853" />
        <path d="M17.5 17l-5 7c4 0 7.5-2.5 9-6l-4-1z" fill="#FBBC05" />
      </svg>
    );
  }
  
  if (n.includes('edge')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#0078D7" />
        <path d="M18 14c0 3-2.5 5-6 5-4 0-7-3-7-7 0-3 2-5.5 5-6.5C7 7 5 9.5 5 12.5 5 16 8 18 11 18c2.5 0 5-1 6-3l1-1z" fill="white" />
      </svg>
    );
  }
  
  if (n.includes('firefox')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
        <circle cx="12" cy="12" r="10" fill="#FF7139" />
        <path d="M18 8c-1-2-3-3.5-6-3.5-.5 0-1 0-1.5.2C12 5 13 6 13 7.5c0 1-1 2-2 2-1.5 0-2-1-2-2 0-.5.2-1 .5-1.5C7 7.5 5.5 10 5.5 12.5 5.5 16 8.5 19 12 19s6.5-3 6.5-6.5c0-2-.5-3.5-1-4.5z" fill="white" />
      </svg>
    );
  }
  
  if (n.includes('safari')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
        <circle cx="12" cy="12" r="10" fill="#006CFF" />
        <path d="M8 16l2-6 6-2-2 6z" fill="white" />
        <path d="M10 10l4 4" stroke="#FF3B30" strokeWidth="0.5" />
      </svg>
    );
  }
  
  if (n.includes('opera')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
        <circle cx="12" cy="12" r="10" fill="#FF1B2D" />
        <ellipse cx="12" cy="12" rx="4" ry="7" fill="white" />
      </svg>
    );
  }
  
  return <Globe className="w-4 h-4 shrink-0 text-muted-foreground" />;
};

export const SecurityLoginHistory: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSuspicious, setFilterSuspicious] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Fetch user profiles for mapping user_id -> name
  const { data: profilesMap } = useQuery({
    queryKey: ['login-history-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email');
      const map: Record<string, { first_name: string; last_name: string; email: string }> = {};
      (data || []).forEach(p => {
        map[p.user_id] = { first_name: p.first_name || '', last_name: p.last_name || '', email: p.email || '' };
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['security-login-history', searchQuery, filterStatus, filterSuspicious, dateFrom, dateTo, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('login_audit_log')
        .select('*', { count: 'exact' })
        .order('login_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filterSuspicious === 'suspicious') {
        query = query.eq('is_suspicious', true);
      } else if (filterSuspicious === 'normal') {
        query = query.eq('is_suspicious', false);
      }

      if (dateFrom) {
        query = query.gte('login_at', dateFrom.toISOString());
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte('login_at', end.toISOString());
      }

      if (searchQuery) {
        query = query.ilike('ip_address', `%${searchQuery}%`);
      }

      if (filterStatus === 'success') {
        query = query.filter('login_status', 'eq', 'success');
      } else if (filterStatus === 'failed') {
        query = query.filter('login_status', 'eq', 'failed');
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data || [], count: count || 0 };
    },
  });

  const totalPages = Math.ceil((data?.count || 0) / pageSize);
  const startRow = page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, data?.count || 0);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterSuspicious('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
  };

  const getUserDisplay = (userId: string | null) => {
    if (!userId) return '—';
    const p = profilesMap?.[userId];
    if (!p) return userId.substring(0, 8) + '…';
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    return name || p.email || userId.substring(0, 8) + '…';
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Historia logowań</CardTitle>
        {/* Filters row */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal text-xs", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {dateFrom ? format(dateFrom, 'dd.MM.yyyy') : 'Od'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal text-xs", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {dateTo ? format(dateTo, 'dd.MM.yyyy') : 'Do'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(0); }} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="success">Poprawne</SelectItem>
              <SelectItem value="failed">Nieudane</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSuspicious} onValueChange={(v) => { setFilterSuspicious(v); setPage(0); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Ocena" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="suspicious">Podejrzane</SelectItem>
              <SelectItem value="normal">OK</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Szukaj po IP..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-7 h-8 w-[160px] text-xs"
            />
          </div>

          {(dateFrom || dateTo || filterStatus !== 'all' || filterSuspicious !== 'all' || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
              Wyczyść filtry
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px] text-xs font-semibold">Lp.</TableHead>
                    <TableHead className="text-xs font-semibold">Użytkownik</TableHead>
                    <TableHead className="text-xs font-semibold">Data logowania</TableHead>
                    <TableHead className="text-xs font-semibold">Status logowania</TableHead>
                    <TableHead className="text-xs font-semibold">Ocena</TableHead>
                    <TableHead className="text-xs font-semibold">Adres IP</TableHead>
                    <TableHead className="text-xs font-semibold">Kraj</TableHead>
                    <TableHead className="text-xs font-semibold">Miasto</TableHead>
                    <TableHead className="text-xs font-semibold">Typ urządzenia</TableHead>
                    <TableHead className="text-xs font-semibold">System operacyjny</TableHead>
                    <TableHead className="text-xs font-semibold">Przeglądarka</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs.map((log, index) => {
                    const loginStatus = (log as any).login_status || 'success';
                    const failureReason = (log as any).failure_reason;
                    const isSuccess = loginStatus === 'success';
                    const countryCode = (log as any).country_code || '';

                    return (
                      <TableRow key={log.id} className={cn(
                        log.is_suspicious && 'bg-destructive/5',
                        !isSuccess && !log.is_suspicious && 'bg-orange-50/50 dark:bg-orange-950/10'
                      )}>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {page * pageSize + index + 1}
                        </TableCell>

                        {/* Użytkownik */}
                        <TableCell className="text-xs max-w-[150px] truncate">
                          {getUserDisplay(log.user_id)}
                        </TableCell>

                        <TableCell className="text-xs">
                          {format(new Date(log.login_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isSuccess ? (
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive shrink-0" />
                            )}
                            <div>
                              <span className="text-xs font-medium">
                                {isSuccess ? 'Poprawne' : 'Nieudane'}
                              </span>
                              {!isSuccess && failureReason && (
                                <div className="text-[10px] text-muted-foreground">
                                  {failureReasonLabel(failureReason)}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {log.is_suspicious ? (
                            <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              {log.anomaly_type || 'Podejrzane'}
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-xs text-green-600">OK</span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs font-mono">{log.ip_address}</TableCell>

                        {/* Kraj z flagą */}
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-base leading-none">{countryToFlag(log.country || '', countryCode)}</span>
                            <span>{log.country && log.country !== 'unknown' ? log.country : '—'}</span>
                          </div>
                        </TableCell>

                        {/* Miasto */}
                        <TableCell className="text-xs">
                          {log.city && log.city !== 'unknown' ? log.city : '—'}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            {deviceIcon((log as any).device_type || '')}
                            <span>{deviceLabel((log as any).device_type || '')}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs">{(log as any).os_name || '—'}</TableCell>

                        {/* Przeglądarka z ikoną */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <BrowserIcon name={(log as any).browser_name || ''} />
                            <span>{(log as any).browser_name || '—'}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!data?.logs || data.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        Brak danych logowań
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Wierszy na stronę:</span>
                <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                  <SelectTrigger className="w-[70px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  {data?.count ? `${startRow}-${endRow} / ${data.count}` : '0'}
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (page < 3) {
                      pageNum = i;
                    } else if (page > totalPages - 4) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="icon"
                        className="h-7 w-7 text-xs"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
