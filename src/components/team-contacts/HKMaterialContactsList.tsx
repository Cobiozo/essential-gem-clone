import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Clock, BookOpen, Key } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export interface HKSessionContact {
  session_id: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string;
  email_consent: boolean;
  otp_code: string;
  knowledge_title: string;
  knowledge_slug: string;
  session_created_at: string;
  last_activity_at: string | null;
}

interface HKMaterialContactsListProps {
  sessions: HKSessionContact[];
  loading: boolean;
}

function formatDuration(startStr: string, endStr: string | null): string {
  if (!endStr) return '—';
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const diffMs = end - start;
  if (diffMs < 0) return '—';
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hours > 0) return `${hours}h ${remainMins}min`;
  if (mins > 0) return `${mins}min`;
  return '<1min';
}

export const HKMaterialContactsList: React.FC<HKMaterialContactsListProps> = ({ sessions, loading }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">Brak danych</p>
        <p className="text-sm mt-1">Gdy ktoś obejrzy materiał udostępniony przez Twój kod OTP, dane pojawią się tutaj.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imię i nazwisko</TableHead>
            <TableHead>Kontakt</TableHead>
            <TableHead>Kod OTP</TableHead>
            <TableHead>Materiał</TableHead>
            <TableHead>Data otwarcia</TableHead>
            <TableHead>Czas oglądania</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <TableRow key={s.session_id}>
              <TableCell className="font-medium">
                {s.guest_first_name} {s.guest_last_name}
                {s.email_consent && (
                  <Badge variant="outline" className="ml-2 text-xs">Zgoda email</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={`mailto:${s.guest_email}`} className="text-primary hover:underline">{s.guest_email}</a>
                  </span>
                  {s.guest_phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <a href={`tel:${s.guest_phone}`} className="hover:underline">{s.guest_phone}</a>
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <Key className="w-3.5 h-3.5 text-muted-foreground" />
                  {s.otp_code}
                </span>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5 text-sm">
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  {s.knowledge_title}
                </span>
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {format(new Date(s.session_created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5 text-sm">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  {formatDuration(s.session_created_at, s.last_activity_at)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
