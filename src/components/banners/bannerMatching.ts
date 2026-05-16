import type { AppBanner } from './AppBanners';

export interface BannerMatchContext {
  userId?: string | null;
  role?: string | null;
  profile?: Record<string, string | null> | null;
  pathname: string;
  now?: number;
}

export interface BannerMatchResult {
  visible: boolean;
  reason?: string;
  missing?: string[];
}

export function computeMissingFields(
  required: string[],
  profile?: Record<string, string | null> | null,
): string[] {
  if (!profile) return required;
  return required.filter((f) => {
    const v = (profile as any)[f];
    return v == null || String(v).trim() === '';
  });
}

export function matchBanner(b: AppBanner, ctx: BannerMatchContext): BannerMatchResult {
  if (!b.enabled) return { visible: false, reason: 'Wyłączony' };

  const now = ctx.now ?? Date.now();
  if (b.starts_at && new Date(b.starts_at).getTime() > now) {
    return { visible: false, reason: 'Jeszcze nieaktywny (przed datą startu)' };
  }
  if (b.ends_at && new Date(b.ends_at).getTime() < now) {
    return { visible: false, reason: 'Po dacie zakończenia' };
  }

  if (b.hide_on_paths?.some((p) => ctx.pathname.startsWith(p))) {
    return { visible: false, reason: `Ukryty na ścieżce ${ctx.pathname}` };
  }

  if (b.audience_type === 'role') {
    if (!ctx.role || !b.target_roles?.includes(ctx.role)) {
      return { visible: false, reason: `Audiencja: role (${(b.target_roles || []).join(', ') || '—'})` };
    }
  } else if (b.audience_type === 'specific_users') {
    if (!ctx.userId || !b.target_user_ids?.includes(ctx.userId)) {
      return { visible: false, reason: 'Nie jest na liście użytkowników' };
    }
  } else if (b.audience_type === 'missing_profile_fields') {
    const missing = computeMissingFields(b.required_fields || [], ctx.profile);
    if (missing.length === 0) {
      return { visible: false, reason: 'Wszystkie wymagane pola uzupełnione' };
    }
    return { visible: true, missing };
  }

  return { visible: true };
}
