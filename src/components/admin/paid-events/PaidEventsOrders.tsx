import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, Mail, CheckCircle, Clock, XCircle, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface PaidEventOrder {
  id: string;
  event_id: string;
  ticket_id: string;
  user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  quantity: number | null;
  total_amount: number;
  status: string;
  payment_provider: string | null;
  payment_order_id: string | null;
  payment_transaction_id: string | null;
  ticket_code: string | null;
  ticket_generated_at: string | null;
  ticket_sent_at: string | null;
  checked_in: boolean | null;
  checked_in_at: string | null;
  created_at: string;
  paid_events: {
    title: string;
    event_date: string;
  } | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Oczekuje', variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
  paid: { label: 'Opłacony', variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
  cancelled: { label: 'Anulowany', variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
  refunded: { label: 'Zwrócony', variant: 'outline', icon: <XCircle className="w-3 h-3" /> },
};

export const PaidEventsOrders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');

  // Fetch orders with event data
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['paid-event-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_orders')
        .select(`
          *,
          paid_events (
            title,
            event_date
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PaidEventOrder[];
    },
  });

  // Get unique events for filter
  const events = [...new Map(
    orders
      .filter(o => o.paid_events)
      .map(o => [o.event_id, { id: o.event_id, title: o.paid_events!.title }])
  ).values()];

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const fullName = `${order.first_name} ${order.last_name}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.ticket_code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesEvent = eventFilter === 'all' || order.event_id === eventFilter;
    
    return matchesSearch && matchesStatus && matchesEvent;
  });

  // Stats
  const stats = {
    total: orders.length,
    paid: orders.filter(o => o.status === 'paid').length,
    pending: orders.filter(o => o.status === 'pending').length,
    checkedIn: orders.filter(o => o.checked_in).length,
    revenue: orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total_amount, 0),
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredOrders.map(order => ({
      'Wydarzenie': order.paid_events?.title || '-',
      'Imię': order.first_name,
      'Nazwisko': order.last_name,
      'Email': order.email,
      'Telefon': order.phone || '-',
      'Kod biletu': order.ticket_code || '-',
      'Status': statusConfig[order.status]?.label || order.status,
      'Kwota (PLN)': order.total_amount,
      'Ilość': order.quantity || 1,
      'Check-in': order.checked_in ? 'Tak' : 'Nie',
      'Data zamówienia': format(new Date(order.created_at), 'dd.MM.yyyy HH:mm', { locale: pl }),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Zamówienia');
    XLSX.writeFile(wb, `zamowienia-wydarzenia-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Wszystkie</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <div className="text-sm text-muted-foreground">Opłacone</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Oczekujące</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.checkedIn}</div>
            <div className="text-sm text-muted-foreground">Check-in</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.revenue.toFixed(2)} PLN</div>
            <div className="text-sm text-muted-foreground">Przychód</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po nazwisku, email lub kodzie biletu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Wydarzenie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie wydarzenia</SelectItem>
            {events.map(event => (
              <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie statusy</SelectItem>
            <SelectItem value="paid">Opłacone</SelectItem>
            <SelectItem value="pending">Oczekujące</SelectItem>
            <SelectItem value="cancelled">Anulowane</SelectItem>
            <SelectItem value="refunded">Zwrócone</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToExcel}>
          <Download className="w-4 h-4 mr-2" />
          Excel
        </Button>
      </div>

      {/* Orders table */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchQuery || statusFilter !== 'all' || eventFilter !== 'all'
              ? 'Brak zamówień spełniających kryteria'
              : 'Brak zamówień'}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wydarzenie</TableHead>
                <TableHead>Kupujący</TableHead>
                <TableHead>Kod biletu</TableHead>
                <TableHead>Kwota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.paid_events?.title || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.first_name} {order.last_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {order.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.ticket_code ? (
                        <div className="flex items-center gap-1 font-mono text-sm">
                          <Ticket className="w-4 h-4 text-muted-foreground" />
                          {order.ticket_code}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{order.total_amount.toFixed(2)} PLN</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                        {status.icon}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.checked_in ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {order.checked_in_at && format(new Date(order.checked_in_at), 'HH:mm', { locale: pl })}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
