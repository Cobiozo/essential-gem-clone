import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Mail, Calendar, User, MessageSquare, Search, RefreshCw, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useFormProtection } from '@/hooks/useFormProtection';

interface SupportTicket {
  id: string;
  created_at: string;
  sent_at: string | null;
  subject: string;
  status: string;
  recipient_email: string;
  error_message: string | null;
  metadata: {
    type?: string;
    sender_name?: string;
    sender_email?: string;
    original_subject?: string;
    message?: string;
  } | null;
}

export const SupportTicketsManagement: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Protect against tab-switch reloads when viewing ticket details
  useFormProtection(!!selectedTicket);

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('metadata->>type', 'support_form')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTickets(data as SupportTicket[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = tickets.filter(t => {
    const metadata = t.metadata || {};
    return (
      metadata.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metadata.sender_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metadata.original_subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Wysłano</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Błąd</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Oczekuje</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Zgłoszenia formularza wsparcia
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchTickets} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Odśwież
        </Button>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po imieniu, emailu lub temacie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
          <span>Wszystkich: {tickets.length}</span>
          <span>Wysłanych: {tickets.filter(t => t.status === 'sent').length}</span>
          <span>Błędów: {tickets.filter(t => t.status === 'failed').length}</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Ładowanie zgłoszeń...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'Brak zgłoszeń pasujących do wyszukiwania' : 'Brak zgłoszeń wsparcia'}
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nadawca</TableHead>
                  <TableHead>Temat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{ticket.metadata?.sender_name || '-'}</span>
                        <span className="text-sm text-muted-foreground">{ticket.metadata?.sender_email || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {ticket.metadata?.original_subject || ticket.subject}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(ticket.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Details Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Szczegóły zgłoszenia
              </DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> Data zgłoszenia
                    </span>
                    <p className="font-medium">
                      {format(new Date(selectedTicket.created_at), 'dd MMMM yyyy, HH:mm', { locale: pl })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div>{getStatusBadge(selectedTicket.status)}</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="w-4 h-4" /> Nadawca
                  </span>
                  <p className="font-medium">{selectedTicket.metadata?.sender_name || '-'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-4 h-4" /> Email nadawcy
                  </span>
                  <p className="font-medium">{selectedTicket.metadata?.sender_email || '-'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Temat</span>
                  <p className="font-medium">{selectedTicket.metadata?.original_subject || selectedTicket.subject}</p>
                </div>

                {selectedTicket.metadata?.message && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Treść wiadomości</span>
                    <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
                      {selectedTicket.metadata.message}
                    </div>
                  </div>
                )}

                {selectedTicket.error_message && (
                  <div className="space-y-1">
                    <span className="text-sm text-destructive">Błąd wysyłki</span>
                    <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {selectedTicket.error_message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
