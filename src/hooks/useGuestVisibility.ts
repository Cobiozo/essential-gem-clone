import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type GuestScope = 'sidebar' | 'topbar' | 'avatarMenu' | 'widgets' | 'banners' | 'pages' | 'events';
export type GuestConfig = Record<string, any>;

const DEFAULT_GLOBAL: GuestConfig = {
  sidebar: { items: { dashboard: true, news: true, knowledge: false } },
  topbar: { sound: true, notifications: true, language: true, theme: true, tutorial: false, chat: false, calendar: false, switchClassic: false },
  avatarMenu: { home: true, myAccount: true, settings: true, apiSync: false, toolPanel: false, logout: true },
  widgets: { newsBanner: true, infoBanners: true, map: false, newsTicker: true, introVideo: false },
  banners: { allowAll: false, items: {} },
  pages: { html: {} },
  events: { showPublicList: false, items: {} },
};

function deepMerge<T extends Record<string, any>>(base: T, patch: T | undefined | null): T {
  if (!patch) return base;
  const out: any = { ...base };
  for (const k of Object.keys(patch)) {
    const v = (patch as any)[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge((base as any)?.[k] ?? {}, v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

interface UseGuestVisibilityOptions {
  /** When true, always returns visibility, even for non-guest users (admin preview). */
  forceGuestMode?: boolean;
  /** Override target user id for fetching overrides (admin preview of a specific guest). */
  overrideUserId?: string | null;
}

export const useGuestVisibility = (opts: UseGuestVisibilityOptions = {}) => {
  const { userRole, user } = useAuth();
  const isGuest = userRole?.role === 'guest';
  const active = isGuest || opts.forceGuestMode === true;

  const [globalCfg, setGlobalCfg] = useState<GuestConfig | null>(null);
  const [overrideCfg, setOverrideCfg] = useState<GuestConfig | null>(null);
  const [loading, setLoading] = useState(active);

  const targetUserId = opts.overrideUserId !== undefined ? opts.overrideUserId : (isGuest ? user?.id ?? null : null);

  useEffect(() => {
    if (!active) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data: g } = await (supabase as any)
        .from('guest_visibility_global')
        .select('config')
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setGlobalCfg((g?.config as GuestConfig) ?? DEFAULT_GLOBAL);

      if (targetUserId) {
        const { data: ov } = await (supabase as any)
          .from('guest_visibility_overrides')
          .select('config')
          .eq('user_id', targetUserId)
          .maybeSingle();
        if (cancelled) return;
        setOverrideCfg((ov?.config as GuestConfig) ?? null);
      } else {
        setOverrideCfg(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [active, targetUserId]);

  const mergedConfig = useMemo<GuestConfig>(() => {
    if (!active) return DEFAULT_GLOBAL;
    return deepMerge(deepMerge(DEFAULT_GLOBAL, globalCfg), overrideCfg);
  }, [active, globalCfg, overrideCfg]);

  const isVisible = useCallback((scope: GuestScope, key: string, fallback = true) => {
    if (!active) return true; // non-guests always see everything
    const scopeCfg = mergedConfig?.[scope];
    if (!scopeCfg) return fallback;
    if (scope === 'banners') {
      if (scopeCfg.allowAll) return true;
      return Boolean(scopeCfg.items?.[key]);
    }
    if (scope === 'pages') return Boolean(scopeCfg.html?.[key]);
    if (scope === 'events') return Boolean(scopeCfg.items?.[key]);
    if (scope === 'sidebar') return Boolean(scopeCfg.items?.[key]);
    const v = scopeCfg[key];
    return v === undefined ? fallback : Boolean(v);
  }, [active, mergedConfig]);

  return { isGuest, active, loading, config: mergedConfig, globalCfg, overrideCfg, isVisible };
};
