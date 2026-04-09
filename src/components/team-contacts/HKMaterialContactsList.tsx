import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Clock, BookOpen, Key, Calendar } from 'lucide-react';
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
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
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
    <div className="space-y-3">
      {sessions.map((s) => (
        <div
          key={s.session_id}
          className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
        >
          {/* Row 1: Name + badge */}
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-base font-semibold text-foreground">
              {s.guest_first_name} {s.guest_last_name}
            </h4>
            {s.email_consent && (
              <Badge variant="outline" className="text-xs shrink-0">Zgoda email</Badge>
            )}
          </div>

          {/* Row 2: Contact info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-3">
            <a href={`mailto:${s.guest_email}`} className="flex items-center gap-1.5 text-primary hover:underline">
              <Mail className="w-3.5 h-3.5" />
              {s.guest_email}
            </a>
            {s.guest_phone && (
              <a href={`tel:${s.guest_phone}`} className="flex items-center gap-1.5 text-foreground hover:underline">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                {s.guest_phone}
              </a>
            )}
          </div>

          {/* Row 3: Material title */}
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground mb-3">
            <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{s.knowledge_title}</span>
          </div>

          {/* Row 4: Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-mono">
              <Key className="w-3 h-3" />
              {s.otp_code}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(s.session_created_at), 'dd.MM.yyyy, HH:mm', { locale: pl })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(s.session_created_at, s.last_activity_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};