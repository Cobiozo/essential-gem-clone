import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const PAGE_SIZE = 25;

export const AdminActivityLog: React.FC = () => {
  const [page, setPage] = useState(0);
  const [filterAdminId, setFilterAdminId] = useState<string>('all');
  const [filterActionType, setFilterActionType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch admins for filter
  const { data: admins } = useQuery({
    queryKey: ['admin-activity-log-admins'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_activity_log')
        .select('admin_user_id')
        .order('created_at', { ascending: false });
      
      const uniqueIds = [...new Set(data?.map(d => d.admin_user_id) || [])];
      if (uniqueIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', uniqueIds);
      
      return profiles || [];
    },
  });

  // Fetch action types for filter
  const { data: actionTypes } = useQuery({
    queryKey: ['admin-activity-log-types'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_activity_log')
        .select('action_type');
      return [...new Set(data?.map(d => d.action_type) || [])].sort();
    },
  });

  // Fetch logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['admin-activity-log', page, filterAdminId, filterActionType, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('admin_activity_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterAdminId !== 'all') {
        query = query.eq('admin_user_id', filterAdminId);
      }
      if (filterActionType !== 'all') {
        query = query.eq('action_type', filterActionType);
      }
      if (searchQuery.trim()) {
        query = query.ilike('action_description', `%${searchQuery.trim()}%`);
      }

      const { data, count } = await query;
      
      // Fetch admin profiles for display
      const adminIds = [...new Set(data?.map(d => d.admin_user_id) || [])];
      let profilesMap: Record<string, any> = {};
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', adminIds);
        profiles?.forEach(p => { profilesMap[p.user_id] = p; });
      }

      return { logs: data || [], count: count || 0, profiles: profilesMap };
    },
  });

  const totalPages = Math.ceil((logsData?.count || 0) / PAGE_SIZE);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getAdminName = (adminId: string) => {
    const p = logsData?.profiles?.[adminId];
    return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : adminId.slice(0, 8);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Dziennik działań administratorów
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj w opisie..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={filterAdminId} onValueChange={v => { setFilterAdminId(v); setPage(0); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Wszyscy admini" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy admini</SelectItem>
              {admins?.map(a => (
                <SelectItem key={a.user_id} value={a.user_id}>
                  {`${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterActionType} onValueChange={v => { setFilterActionType(v); setPage(0); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Wszystkie akcje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie akcje</SelectItem>
              {actionTypes?.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <ScrollArea className="max-h-[600px]">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Admin</th>
                  <th className="text-left p-3 font-medium">Typ akcji</th>
                  <th className="text-left p-3 font-medium">Opis</th>
                  <th className="text-left p-3 font-medium">Tabela</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Ładowanie...</td></tr>
                ) : logsData?.logs.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Brak wpisów</td></tr>
                ) : logsData?.logs.map(log => (
                  <tr key={log.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 whitespace-nowrap text-muted-foreground text-xs">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {getAdminName(log.admin_user_id)}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">{log.action_type}</Badge>
                    </td>
                    <td className="p-3 max-w-[300px] truncate">{log.action_description}</td>
                    <td className="p-3 text-xs text-muted-foreground">{log.target_table || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {logsData?.count || 0} wpisów · Strona {page + 1} z {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
