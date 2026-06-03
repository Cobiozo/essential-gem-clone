import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for checking moderator permissions.
 *
 * Behaviour:
 * - Admin always returns `isAdmin = true` and `can(...)` always returns `true`.
 * - A moderator has a row in `user_roles` with role `moderator` AND a row in
 *   `moderator_permissions` whose `modules` JSON contains `true` for the
 *   requested module key.
 *
 * Module keys are free-form strings (matching sidebar `value` for tabs, or
 * page-level keys like `news_hub` for separate routes). Admin assigns them
 * via the Moderators management UI.
 */
export interface ModeratorAccess {
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  modules: Record<string, boolean>;
  can: (moduleKey: string) => boolean;
  hasAnyAdminAccess: boolean;
}

export const useModeratorAccess = (): ModeratorAccess => {
  const { user, isAdmin } = useAuth();
  const [isModerator, setIsModerator] = useState(false);
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) {
          setIsModerator(false);
          setModules({});
          setLoading(false);
        }
        return;
      }
      if (isAdmin) {
        if (!cancelled) {
          setIsModerator(false);
          setModules({});
          setLoading(false);
        }
        return;
      }

      try {
        const [{ data: roleRow }, { data: permRow }] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'moderator' as any)
            .maybeSingle(),
          supabase
            .from('moderator_permissions')
            .select('modules')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        if (cancelled) return;
        const moderator = !!roleRow;
        setIsModerator(moderator);
        const mods = (permRow?.modules || {}) as Record<string, boolean>;
        setModules(moderator ? mods : {});
      } catch (err) {
        console.error('[useModeratorAccess] failed:', err);
        if (!cancelled) {
          setIsModerator(false);
          setModules({});
        }
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

  return {
    loading,
    isAdmin,
    isModerator,
    modules,
    can,
    hasAnyAdminAccess: isAdmin || (isModerator && Object.values(modules).some(Boolean)),
  };
};
