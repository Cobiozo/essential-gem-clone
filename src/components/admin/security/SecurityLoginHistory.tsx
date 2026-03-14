import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const SecurityLoginHistory: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSuspicious, setFilterSuspicious] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['security-login-history', searchQuery, filterSuspicious, page],
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

      if (searchQuery) {
        query = query.or(`ip_address.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,country.ilike.%${searchQuery}%,user_id.eq.${searchQuery}`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Fetch user profiles for display
      const userIds = [...new Set((data || []).map(l => l.user_id))];
      let profiles: Record<string, { first_name: string; last_name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', userIds);
        if (profilesData) {
          for (const p of profilesData) {
            profiles[p.user_id] = { first_name: p.first_name || '', last_name: p.last_name || '', email: p.email || '' };
          }
        }
      }

      return { logs: data || [], count: count || 0, profiles };
    },
  });

  const totalPages = Math.ceil((data?.count || 0) / pageSize);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Historia logowań</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po IP, mieście, kraju..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={filterSuspicious} onValueChange={(v) => { setFilterSuspicious(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="suspicious">Podejrzane</SelectItem>
              <SelectItem value="normal">Normalne</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableRow>
                    <TableHead>Użytkownik</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Miasto</TableHead>
                    <TableHead>Kraj</TableHead>
                    <TableHead>Urządzenie</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Przeglądarka</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs.map((log) => {
                    const profile = data.profiles[log.user_id];
                    return (
                      <TableRow key={log.id} className={log.is_suspicious ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-sm">
                          <div className="font-medium">
                            {profile ? `${profile.first_name} ${profile.last_name}` : 'Nieznany'}
                          </div>
                          <div className="text-xs text-muted-foreground">{profile?.email}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(log.login_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{log.ip_address}</TableCell>
                        <TableCell className="text-sm">{log.city || '—'}</TableCell>
                        <TableCell className="text-sm">{log.country || '—'}</TableCell>
                        <TableCell className="text-sm capitalize">{(log as any).device_type || '—'}</TableCell>
                        <TableCell className="text-sm">{(log as any).os_name || '—'}</TableCell>
                        <TableCell className="text-sm">{(log as any).browser_name || '—'}</TableCell>
                        <TableCell>
                          {log.is_suspicious ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {log.anomaly_type || 'Podejrzane'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!data?.logs || data.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Brak danych logowań
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Strona {page + 1} z {totalPages} ({data?.count} wpisów)
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
          </>
        )}
      </CardContent>
    </Card>
  );
};
