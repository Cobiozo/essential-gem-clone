import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

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

type BannerConfig = {
  enabled: boolean;
  title: string;
  message: string;
  button_label: string;
  required_fields: string[];
  target_path: string;
  severity: 'info' | 'warning' | 'destructive';
  dismissible: boolean;
};

const HIDDEN_ON_PATHS = ['/auth', '/reset-password', '/change-password', '/install'];

export const ProfileFieldsBanner: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Only authenticated users
  const enabled = !!user?.id && !HIDDEN_ON_PATHS.some((p) => location.pathname.startsWith(p));

  const { data: config } = useQuery({
    queryKey: ['profile-fields-banner-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profile_completion_banner_config')
        .select('*')
        .maybeSingle();
      return data as unknown as BannerConfig | null;
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile-fields-banner-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_name,last_name,eq_id,street_address,postal_code,city,country,phone_number')
        .eq('user_id', user.id)
        .maybeSingle();
      return data as Record<string, string | null> | null;
    },
    enabled: enabled && !!config?.enabled,
    staleTime: 30 * 1000,
  });

  const missing = useMemo(() => {
    if (!config?.enabled || !profile || !Array.isArray(config.required_fields)) return [];
    return config.required_fields.filter((f) => {
      const v = (profile as any)[f];
      return v == null || String(v).trim() === '';
    });
  }, [config, profile]);

  useEffect(() => {
    setDismissed(false);
  }, [location.pathname]);

  if (!enabled || !config?.enabled || missing.length === 0) return null;

  const sessionKey = `pfb-dismissed-${missing.join(',')}`;
  if (config.dismissible && (dismissed || sessionStorage.getItem(sessionKey))) return null;

  const Icon = config.severity === 'destructive'
    ? AlertCircle
    : config.severity === 'warning'
      ? AlertTriangle
      : Info;

  const variant = config.severity === 'destructive' ? 'destructive' : 'default';
  const toneClass =
    config.severity === 'warning'
      ? 'border-amber-500/60 bg-amber-50/60 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-700/60'
      : config.severity === 'info'
        ? 'border-sky-500/60 bg-sky-50/60 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-700/60'
        : '';

  const handleCta = () => {
    const target = `${config.target_path || '/my-account'}?highlight=${encodeURIComponent(missing.join(','))}`;
    navigate(target);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(sessionKey, '1');
    } catch (_e) {
      /* ignore */
    }
  };

  return (
    <div className="px-4 pt-3">
      <Alert variant={variant as any} className={`relative ${toneClass}`}>
        <Icon className="h-4 w-4" />
        <AlertTitle className="pr-8">{config.title}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="text-sm">{config.message}</p>
          <p className="text-xs opacity-90">
            <span className="font-semibold">Brakuje:</span>{' '}
            {missing.map((f) => FIELD_LABELS[f] ?? f).join(', ')}
          </p>
          <div>
            <Button size="sm" onClick={handleCta} className="mt-1">
              {config.button_label}
            </Button>
          </div>
        </AlertDescription>
        {config.dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded hover:bg-foreground/10"
            aria-label="Zamknij"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </Alert>
    </div>
  );
};

export default ProfileFieldsBanner;
