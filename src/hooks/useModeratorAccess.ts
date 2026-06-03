import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook do sprawdzania uprawnień moderatora.
 *
 * Zasady:
 * - Admin zawsze ma pełen dostęp (`can()` zawsze true).
 * - Moderator ma rolę `moderator` w `user_roles` ORAZ wpis w
 *   `moderator_permissions.modules` (JSONB) z true dla danego klucza.
 *
 * Klucze modułów to dowolne stringi (zwykle `value` zakładki w
 * AdminSidebar lub klucz strony, np. `news_hub`). Admin wybiera je w
 * UI Moderatorów.
 *
 * Granularność – pod-akcje (np. `news_hub:edit`):
 * - `canAction(module, action)` zwraca true jeśli admin nadał albo
 *   ogólny moduł `news_hub` (= pełen dostęp), albo konkretną akcję
 *   `news_hub:edit`. Daje to elastyczność: zostaw `news_hub: true` =
 *   wszystko, lub odznacz i zostaw tylko `news_hub:edit` = tylko edycja.
 *
 * Granularność – konkretne treści (np. tylko wybrane posty):
 * - `allowedIds(module)` czyta `modules['<module>:ids']: string[]`.
 *   Pusta lista lub brak = wszystkie (`'all'`), niepusta = whitelist.
 */
export interface ModeratorAccess {
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  modules: Record<string, any>;
  can: (moduleKey: string) => boolean;
  canAction: (moduleKey: string, action: string) => boolean;
  allowedIds: (moduleKey: string) => string[] | 'all';
  hasAnyAdminAccess: boolean;
}

export const useModeratorAccess = (): ModeratorAccess => {
  const { user, isAdmin } = useAuth();
  const [isModerator, setIsModerator] = useState(false);
  const [modules, setModules] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) { setIsModerator(false); setModules({}); setLoading(false); }
        return;
      }
      if (isAdmin) {
        if (!cancelled) { setIsModerator(false); setModules({}); setLoading(false); }
        return;
      }
      try {
        const [{ data: roleRow }, { data: permRow }] = await Promise.all([
          supabase.from('user_roles').select('role')
            .eq('user_id', user.id).eq('role', 'moderator' as any).maybeSingle(),
          supabase.from('moderator_permissions').select('modules')
            .eq('user_id', user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        const moderator = !!roleRow;
        setIsModerator(moderator);
        const mods = (permRow?.modules || {}) as Record<string, any>;
        setModules(moderator ? mods : {});
      } catch (err) {
        console.error('[useModeratorAccess] failed:', err);
        if (!cancelled) { setIsModerator(false); setModules({}); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, isAdmin]);

  const can = (moduleKey: string): boolean => {
    if (isAdmin) return true;
    if (!isModerator) return false;
    return modules[moduleKey] === true;
  };

  const canAction = (moduleKey: string, action: string): boolean => {
    if (isAdmin) return true;
    if (!isModerator) return false;
    // Pełen dostęp do modułu => każda akcja
    if (modules[moduleKey] === true) return true;
    // Konkretna akcja, np. 'news_hub:edit'
    return modules[`${moduleKey}:${action}`] === true;
  };

  const allowedIds = (moduleKey: string): string[] | 'all' => {
    if (isAdmin) return 'all';
    const raw = modules[`${moduleKey}:ids`];
    if (!Array.isArray(raw) || raw.length === 0) return 'all';
    return raw.filter((x) => typeof x === 'string');
  };

  const hasAnyAdminAccess = isAdmin || (isModerator && Object.values(modules).some((v) => v === true || (Array.isArray(v) && v.length > 0)));

  return { loading, isAdmin, isModerator, modules, can, canAction, allowedIds, hasAnyAdminAccess };
};
