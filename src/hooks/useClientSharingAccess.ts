import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientSharingAccess {
  /** Czy użytkownik może w ogóle korzystać z funkcji udostępniania */
  canShare: boolean;
  /** Czy użytkownik jest klientem, dla którego obowiązują warunki odblokowania */
  isClientGated: boolean;
  /** Czy minęły 48h od zatwierdzenia + pierwszego logowania */
  timeConditionMet: boolean;
  /** Czy ukończono szkolenie "Niezbędnik klienta" */
  trainingCompleted: boolean;
  hoursRemaining: number | null;
  unlockAt: Date | null;
  totalLessons: number;
  completedLessons: number;
  loading: boolean;
}

const DEFAULT_STATE: ClientSharingAccess = {
  canShare: false,
  isClientGated: false,
  timeConditionMet: false,
  trainingCompleted: false,
  hoursRemaining: null,
  unlockAt: null,
  totalLessons: 0,
  completedLessons: 0,
  loading: true,
};

/**
 * Reguła: partnerzy / specjaliści / liderzy / admini udostępniają bez ograniczeń.
 * Klient dostaje funkcje udostępniania po 48h od zatwierdzenia konta i pierwszego
 * poprawnego logowania ORAZ po ukończeniu w Akademii modułu "Niezbędnik klienta".
 */
export function useClientSharingAccess(): ClientSharingAccess {
  const { user, isClient, isAdmin, loading: authLoading } = useAuth() as any;
  const [state, setState] = useState<ClientSharingAccess>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (authLoading) return;

      if (!user) {
        if (!cancelled) setState({ ...DEFAULT_STATE, loading: false });
        return;
      }

      // Role inne niż klient – bez ograniczeń
      if (!isClient || isAdmin) {
        if (!cancelled) {
          setState({
            ...DEFAULT_STATE,
            canShare: true,
            isClientGated: false,
            timeConditionMet: true,
            trainingCompleted: true,
            loading: false,
          });
        }
        return;
      }

      try {
        const { data, error } = await (supabase as any).rpc('get_client_sharing_status', {
          _user_id: user.id,
        });
        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        const unlockAt = row?.unlock_at ? new Date(row.unlock_at) : null;
        const hoursRemaining = unlockAt
          ? Math.max(0, Math.ceil((unlockAt.getTime() - Date.now()) / 3_600_000))
          : null;

        if (!cancelled) {
          setState({
            canShare: Boolean(row?.can_share),
            isClientGated: !row?.can_share,
            timeConditionMet: Boolean(row?.time_condition_met),
            trainingCompleted: Boolean(row?.training_completed),
            hoursRemaining,
            unlockAt,
            totalLessons: Number(row?.total_lessons ?? 0),
            completedLessons: Number(row?.completed_lessons ?? 0),
            loading: false,
          });
        }
      } catch (e) {
        console.warn('[useClientSharingAccess] error', e);
        if (!cancelled) setState({ ...DEFAULT_STATE, isClientGated: true, loading: false });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isClient, isAdmin, authLoading]);

  return state;
}

export default useClientSharingAccess;
