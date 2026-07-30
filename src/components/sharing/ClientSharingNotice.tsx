import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, GraduationCap, Check, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientSharingAccess } from '@/hooks/useClientSharingAccess';

interface Props {
  access: ClientSharingAccess;
  className?: string;
}

/**
 * Informacja dla klienta: kiedy zostanie odblokowane udostępnianie materiałów.
 */
export const ClientSharingNotice: React.FC<Props> = ({ access, className }) => {
  const navigate = useNavigate();

  if (access.loading || !access.isClientGated) return null;

  const Item = ({ done, icon: Icon, children }: { done: boolean; icon: any; children: React.ReactNode }) => (
    <li className="flex items-start gap-2">
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
          done ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
      </span>
      <span className={cn('leading-snug', done && 'text-muted-foreground line-through')}>{children}</span>
    </li>
  );

  return (
    <div
      className={cn(
        'w-full sm:max-w-sm rounded-lg border border-border bg-muted/40 p-3 text-xs',
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        <Share2 className="h-3.5 w-3.5 text-primary" />
        Udostępnianie materiałów
      </div>
      <p className="mb-2 text-muted-foreground">
        Funkcja „Udostępnij” zostanie włączona po 48 godzinach od dołączenia do platformy oraz po
        ukończeniu w Akademii szkolenia „Niezbędnik klienta”.
      </p>
      <ul className="space-y-1.5 text-muted-foreground">
        <Item done={access.timeConditionMet} icon={Clock}>
          48 godzin od zatwierdzenia konta i pierwszego logowania
          {!access.timeConditionMet && access.hoursRemaining !== null && (
            <span className="text-foreground"> — pozostało ok. {access.hoursRemaining} h</span>
          )}
        </Item>
        <Item done={access.trainingCompleted} icon={GraduationCap}>
          Ukończenie szkolenia „Niezbędnik klienta”
          {!access.trainingCompleted && access.totalLessons > 0 && (
            <span className="text-foreground">
              {' '}
              — {access.completedLessons}/{access.totalLessons} lekcji
            </span>
          )}
        </Item>
      </ul>
      {!access.trainingCompleted && (
        <button
          type="button"
          onClick={() => navigate('/training')}
          className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Przejdź do Akademii
        </button>
      )}
    </div>
  );
};

export default ClientSharingNotice;
