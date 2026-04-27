import React from 'react';
import { useOmegaTestReminderLog } from '@/hooks/useOmegaTestReminderLog';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, User, AlertCircle, CheckCircle2, MinusCircle, Loader2 } from 'lucide-react';

interface Props {
  testId?: string | null;
  clientId?: string | null;
}

const kindLabel = (k: '25d' | '120d') => (k === '25d' ? '+25 dni (odbiór wyniku)' : '+120 dni (test porównawczy)');

const channelMeta = (c: 'in_app' | 'email_partner' | 'email_client') => {
  switch (c) {
    case 'in_app': return { label: 'Powiadomienie w aplikacji', icon: Bell };
    case 'email_partner': return { label: 'E-mail do partnera', icon: User };
    case 'email_client': return { label: 'E-mail do klienta', icon: Mail };
  }
};

const statusMeta = (s: 'sent' | 'failed' | 'skipped') => {
  switch (s) {
    case 'sent': return { label: 'Wysłano', variant: 'default' as const, icon: CheckCircle2, className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' };
    case 'failed': return { label: 'Błąd', variant: 'destructive' as const, icon: AlertCircle, className: '' };
    case 'skipped': return { label: 'Pominięto', variant: 'secondary' as const, icon: MinusCircle, className: '' };
  }
};

const errorLabel = (err: string | null) => {
  if (!err) return null;
  switch (err) {
    case 'opt_out': return 'Wyłączone w ustawieniach testu';
    case 'smtp_not_configured': return 'SMTP nieskonfigurowany';
    case 'no_partner_email': return 'Brak adresu e-mail partnera';
    case 'no_client_email': return 'Brak adresu e-mail klienta';
    case 'smtp_send_failed': return 'Serwer SMTP odrzucił wiadomość';
    default: return err;
  }
};

export const ReminderHistoryList: React.FC<Props> = ({ testId, clientId }) => {
  const { data, isLoading } = useOmegaTestReminderLog({ testId, clientId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Ładowanie historii…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-border/40 bg-muted/20 text-center">
        <Bell className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          Brak wysłanych powiadomień. Pierwsze wyślą się automatycznie po +25 dniach od daty testu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {data.map((entry) => {
        const ch = channelMeta(entry.channel);
        const st = statusMeta(entry.status);
        const ChIcon = ch.icon;
        const StIcon = st.icon;
        const errLabel = errorLabel(entry.error);
        return (
          <div
            key={entry.id}
            className="p-3 rounded-lg bg-background/50 border border-border/20 space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ChIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{ch.label}</span>
              </div>
              <Badge variant={st.variant} className={`text-[10px] gap-1 ${st.className}`}>
                <StIcon className="h-3 w-3" />
                {st.label}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span>{format(parseISO(entry.sent_at), 'dd MMM yyyy, HH:mm', { locale: pl })}</span>
              <span>•</span>
              <span>{kindLabel(entry.kind)}</span>
              {entry.recipient && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[220px]">{entry.recipient}</span>
                </>
              )}
            </div>
            {errLabel && (
              <p className="text-[11px] italic text-muted-foreground/80">Powód: {errLabel}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
