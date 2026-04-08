

# Fix: Auto-Webinary infinite loading in Leader Panel

## Root cause

Two problems:

1. **Infinite re-render loop**: `useEffect` depends on `teamMembers` array from `useLeaderTeamMembers()`, but this array is recreated on every render (`.filter()` returns new reference). This causes: loadPermissions → setState → re-render → new array ref → effect fires again → loadPermissions → forever.

2. **RLS blocks permission reads**: The leader queries `leader_permissions.in('user_id', teamMemberIds)` but RLS only allows reading your own row (`user_id = auth.uid()`). The query silently returns empty — so even when loading completes, no permissions are shown.

## Fix

### `src/components/leader/LeaderAutoWebinarAccessView.tsx`
- Change `useEffect` dependency from `teamMembers` (unstable ref) to `teamMembers.length` or `teamLoading` only
- Add a `loaded` ref to prevent re-calling `loadPermissions` after first successful load
- Use the existing RPC or a new security-definer function to read team permissions (since direct table query is blocked by RLS)

Since creating a new RPC requires a migration, a simpler approach: use a security-definer RPC `leader_get_team_auto_webinar_access` that takes an array of user_ids and returns their `can_access_auto_webinar` status — but only if the caller's downline includes those users.

**Alternatively (simpler, no migration):** Query permissions one-by-one using the existing `leader_update_auto_webinar_access` RPC for reads... no, that's only for updates.

**Simplest approach (migration needed):** Create a new RPC `leader_get_team_permissions` that returns `can_access_auto_webinar` for users in the caller's organization tree.

### Migration: New RPC function
```sql
CREATE OR REPLACE FUNCTION public.leader_get_team_auto_webinar_access(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, can_access_auto_webinar boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Verify caller has can_manage_auto_webinar_access
  IF NOT EXISTS (
    SELECT 1 FROM leader_permissions lp
    WHERE lp.user_id = auth.uid() AND lp.can_manage_auto_webinar_access = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT lp.user_id, COALESCE(lp.can_access_auto_webinar, false)
  FROM leader_permissions lp
  WHERE lp.user_id = ANY(p_user_ids);
END; $$;
```

### Component fix
- Replace direct `supabase.from('leader_permissions').select(...)` with `supabase.rpc('leader_get_team_auto_webinar_access', { p_user_ids: userIds })`
- Fix useEffect deps: `[teamLoading]` + use a ref to track if permissions were already loaded

## Files to change

| File | Change |
|------|--------|
| Migration SQL | New RPC `leader_get_team_auto_webinar_access` |
| `src/components/leader/LeaderAutoWebinarAccessView.tsx` | Fix useEffect deps, use RPC instead of direct table query |

