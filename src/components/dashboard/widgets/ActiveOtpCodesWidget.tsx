import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Clock, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActiveOtpCode {
  id: string;
  code: string;
  expires_at: string;
  used_sessions: number;
  reflink: {
    title: string | null;
    slug: string | null;
    otp_max_sessions: number | null;
  } | null;
  first_session_expires_at: string | null;
}

// Live countdown component that updates every second with visibility control
// Uses tabular-nums and fixed width to prevent flickering/jumping
const LiveCountdown: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const updateTime = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft(t('dashboard.otpExpired') || 'Wygasł');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      // Fixed format with padding to prevent layout jumps
      if (hours > 0) {
        setTimeLeft(`${hours}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setTimeLeft(`${minutes}:${pad(seconds)}`);
      }
    };
    
    const startTimer = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(updateTime, 1000);
    };
    
    const stopTimer = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        updateTime();
        startTimer();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    updateTime();
    if (!document.hidden) {
      startTimer();
    }
    
    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [expiresAt, t]);
  
  // tabular-nums ensures fixed-width digits, min-w prevents layout shifts
  return (
    <span 
      className="font-mono inline-block min-w-[3.5rem] text-right"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {timeLeft}
    </span>
  );
};

export const ActiveOtpCodesWidget: React.FC = () => {
  const { user, isPartner } = useAuth();
  const { t } = useLanguage();
  const [codes, setCodes] = useState<ActiveOtpCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveCodes = async () => {
    if (!user?.id) return;
    
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('infolink_otp_codes')
      .select(`
        id, code, expires_at, used_sessions,
        reflink:reflinks(title, slug, otp_max_sessions),
        infolink_sessions(expires_at)
      `)
      .eq('partner_id', user.id)
      .eq('is_invalidated', false)
      .gte('expires_at', now)
      .order('expires_at', { ascending: true });

    if (error) {
      console.error('Error fetching active OTP codes:', error);
      setCodes([]);
    } else {
      const validCodes = (data || [])
        .filter(c => c.reflink)
        .map(c => {
          const sessions = (c as any).infolink_sessions || [];
          const firstSessionExpiresAt = sessions.length > 0
            ? sessions.sort((a: any, b: any) => 
                new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
              )[0].expires_at
            : null;
          return {
            id: c.id,
            code: c.code,
            expires_at: c.expires_at,
            used_sessions: c.used_sessions,
            reflink: c.reflink,
            first_session_expires_at: firstSessionExpiresAt,
          };
        }) as ActiveOtpCode[];
      setCodes(validCodes);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.id || !isPartner) return;

    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(fetchActiveCodes, 60000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchActiveCodes();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for custom event from InfoLinksWidget OTP generation
    const handleOtpGenerated = () => {
      fetchActiveCodes();
    };
    window.addEventListener('otpCodeGenerated', handleOtpGenerated);

    // Real-time subscription for OTP codes changes
    const channelName = `otp-codes-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'infolink_otp_codes',
          filter: `partner_id=eq.${user.id}`
        },
        () => {
          fetchActiveCodes();
        }
      )
      .subscribe();

    fetchActiveCodes();
    if (!document.hidden) {
      startPolling();
    }

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('otpCodeGenerated', handleOtpGenerated);
      supabase.removeChannel(channel);
    };
  }, [user?.id, isPartner]);

  // Hide widget for non-partners or when no active codes
  if (!isPartner || (!loading && codes.length === 0)) return null;

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            {t('dashboard.activeOtpCodes') || 'Aktywne kody OTP'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          {t('dashboard.activeOtpCodes') || 'Aktywne kody OTP'}
          <Badge variant="secondary" className="ml-auto">{codes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto">
        {codes.map((code) => {
          const isUsed = code.used_sessions > 0;
          const maxSessions = code.reflink?.otp_max_sessions || 1;
          
          return (
            <div key={code.id} className="p-3 bg-muted/50 rounded-lg space-y-1.5 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-primary text-lg tracking-wider">
                  {code.code}
                </span>
                {isUsed ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('dashboard.otpUsed') || 'Użyty'}
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {t('dashboard.otpPending') || 'Oczekuje'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate font-medium">
                {code.reflink?.title || code.reflink?.slug || 'InfoLink'}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {isUsed && code.first_session_expires_at ? (
                    <>
                      {t('dashboard.otpSessionExpiresIn') || 'Sesja wygasa za'}{' '}
                      <LiveCountdown expiresAt={code.first_session_expires_at} />
                    </>
                  ) : (
                    <span className="italic">
                      {t('dashboard.otpWaitingForUse') || 'Oczekuje na użycie'}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {code.used_sessions}/{maxSessions} {t('dashboard.otpSessions') || 'sesji'}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
