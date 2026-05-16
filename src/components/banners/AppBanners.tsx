import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export type AppBanner = {
  id: string;
  enabled: boolean;
  priority: number;
  title: string;
  message: string;
  button_label: string;
  severity: 'info' | 'warning' | 'destructive' | 'success';
  dismissible: boolean;
  style_variant: 'soft' | 'solid' | 'outline' | 'gradient';
  accent_color: string | null;
  icon_name: string;
  target_url: string;
  open_in_new_tab: boolean;
  audience_type: 'all' | 'missing_profile_fields' | 'role' | 'specific_users';
  required_fields: string[];
  target_roles: string[];
  target_user_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
  hide_on_paths: string[];
};

const PROFILE_FIELDS = [
  'first_name','last_name','eq_id','street_address','postal_code','city','country','phone_number',
];

export const FIELD_LABELS: Record<string, string> = {
  first_name: 'Imię',
  last_name: 'Nazwisko',
  eq_id: 'EQ ID',
  street_address: 'Ulica i numer',
  postal_code: 'Kod pocztowy',
  city: 'Miasto',
  country: 'Kraj',
  phone_number: 'Numer telefonu',
};

function variantClasses(b: Pick<AppBanner, 'severity' | 'style_variant'>) {
  const sev = b.severity;
  const v = b.style_variant;
  // Severity-based palette
  const palette = {
    info: { soft: 'border-sky-500/60 bg-sky-50/60 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-700/60', solid: 'bg-sky-600 text-white border-sky-700', outline: 'border-sky-500 text-sky-700 dark:text-sky-200', gradient: 'border-sky-500/60 text-sky-950 dark:text-sky-50 bg-gradient-to-r from-sky-100 to-cyan-100 dark:from-sky-900/60 dark:to-cyan-900/60' },
    warning: { soft: 'border-amber-500/60 bg-amber-50/60 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-700/60', solid: 'bg-amber-500 text-white border-amber-600', outline: 'border-amber-500 text-amber-700 dark:text-amber-200', gradient: 'border-amber-500/60 text-amber-950 dark:text-amber-50 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60' },
    destructive: { soft: 'border-destructive/60 bg-destructive/10 text-destructive-foreground', solid: 'bg-destructive text-destructive-foreground border-destructive', outline: 'border-destructive text-destructive', gradient: 'border-destructive/60 text-destructive bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-950/60 dark:to-rose-950/60' },
    success: { soft: 'border-emerald-500/60 bg-emerald-50/60 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-700/60', solid: 'bg-emerald-600 text-white border-emerald-700', outline: 'border-emerald-500 text-emerald-700 dark:text-emerald-200', gradient: 'border-emerald-500/60 text-emerald-950 dark:text-emerald-50 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/60 dark:to-teal-900/60' },
  };
  return palette[sev]?.[v] || palette.info.soft;
}

function resolveIcon(name: string): React.ComponentType<{ className?: string }> {
  const Icon = (Icons as any)[name];
  return Icon || Icons.Info;
}

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

interface BannerCardProps {
  banner: AppBanner;
  missing?: string[];
  onDismiss?: (id: string) => void;
}

export const BannerCard: React.FC<BannerCardProps> = ({ banner, missing = [], onDismiss }) => {
  const navigate = useNavigate();
  const Icon = resolveIcon(banner.icon_name);
  const handleCta = () => {
    if (isExternal(banner.target_url)) {
      window.open(banner.target_url, banner.open_in_new_tab ? '_blank' : '_self', 'noopener,noreferrer');
    } else {
      let target = banner.target_url || '/dashboard';
      if (banner.audience_type === 'missing_profile_fields' && missing.length > 0) {
        target += (target.includes('?') ? '&' : '?') + 'highlight=' + encodeURIComponent(missing.join(','));
      }
      if (banner.open_in_new_tab) {
        window.open(target, '_blank');
      } else {
        navigate(target);
      }
    }
  };

  const style = banner.accent_color
    ? ({ '--banner-accent': banner.accent_color } as React.CSSProperties)
    : undefined;

  return (
    <Alert className={`relative border ${variantClasses(banner)}`} style={style}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="pr-8">{banner.title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm whitespace-pre-line">{banner.message}</p>
        {banner.audience_type === 'missing_profile_fields' && missing.length > 0 && (
          <p className="text-xs opacity-90">
            <span className="font-semibold">Brakuje:</span>{' '}
            {missing.map((f) => FIELD_LABELS[f] ?? f).join(', ')}
          </p>
        )}
        {banner.button_label && banner.target_url && (
          <div>
            <Button size="sm" onClick={handleCta} className="mt-1 gap-1">
              {banner.button_label}
              {isExternal(banner.target_url) && <Icons.ExternalLink className="h-3 w-3" />}
            </Button>
          </div>
        )}
      </AlertDescription>
      {banner.dismissible && onDismiss && (
        <button
          onClick={() => onDismiss(banner.id)}
          className="absolute top-2 right-2 p-1 rounded hover:bg-foreground/10"
          aria-label="Zamknij"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </Alert>
  );
};

export const AppBanners: React.FC = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissedTick, setDismissedTick] = useState(0);

  const enabled = !!user?.id;

  const { data: banners } = useQuery({
    queryKey: ['app-banners-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_banners')
        .select('*')
        .eq('enabled', true)
        .order('priority', { ascending: false });
      return (data as unknown as AppBanner[]) || [];
    },
    enabled,
    staleTime: 60 * 1000,
  });

  const needsProfile = useMemo(
    () => (banners || []).some((b) => b.audience_type === 'missing_profile_fields'),
    [banners]
  );

  const { data: profile } = useQuery({
    queryKey: ['app-banners-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS.join(','))
        .eq('user_id', user.id)
        .maybeSingle();
      return data as unknown as Record<string, string | null> | null;
    },
    enabled: enabled && needsProfile,
    staleTime: 30 * 1000,
  });

  const computeMissing = (required: string[]): string[] => computeMissingFields(required, profile);

  // Auto-redirect after profile completed
  const wasIncomplete = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!banners || !profile) return;
    for (const b of banners) {
      if (b.audience_type !== 'missing_profile_fields') continue;
      const missing = computeMissing(b.required_fields || []);
      if (missing.length > 0) {
        wasIncomplete.current[b.id] = true;
      } else if (wasIncomplete.current[b.id] && location.pathname.startsWith('/my-account')) {
        wasIncomplete.current[b.id] = false;
        navigate('/dashboard');
        return;
      }
    }
  }, [banners, profile, location.pathname, navigate]);

  const visible = useMemo(() => {
    if (!banners) return [];
    return banners.filter((b) => {
      const m = matchBanner(b, {
        userId: user?.id,
        role: userRole?.role,
        profile,
        pathname: location.pathname,
      });
      if (!m.visible) return false;
      if (b.dismissible) {
        try {
          if (sessionStorage.getItem(`app-banner-dismissed-${b.id}`)) return false;
        } catch (_e) { /* ignore */ }
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners, profile, location.pathname, userRole?.role, user?.id, dismissedTick]);

  const handleDismiss = (id: string) => {
    try { sessionStorage.setItem(`app-banner-dismissed-${id}`, '1'); } catch (_e) { /* ignore */ }
    setDismissedTick((n) => n + 1);
  };

  if (!enabled || visible.length === 0) return null;

  return (
    <div className="px-4 pt-3 space-y-2">
      {visible.map((b) => (
        <BannerCard
          key={b.id}
          banner={b}
          missing={b.audience_type === 'missing_profile_fields' ? computeMissing(b.required_fields || []) : []}
          onDismiss={b.dismissible ? handleDismiss : undefined}
        />
      ))}
    </div>
  );
};

export default AppBanners;
