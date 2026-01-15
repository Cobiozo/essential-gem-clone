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
}

// Live countdown component that updates every second
const LiveCountdown: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
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
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, t]);
  
  return <span className="font-mono">{timeLeft}</span>;
};

export const ActiveOtpCodesWidget: React.FC = () => {
  const { user, isPartner } = useAuth();
  const { t } = useLanguage();
  const [codes, setCodes] = useState<ActiveOtpCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !isPartner) return;

    const fetchActiveCodes = async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('infolink_otp_codes')
        .select(`
          id, code, expires_at, used_sessions,
          reflink:reflinks(title, slug, otp_max_sessions)
        `)
        .eq('partner_id', user.id)
        .eq('is_invalidated', false)
        .gte('expires_at', now)
        .order('expires_at', { ascending: true });

      if (error) {
        console.error('Error fetching active OTP codes:', error);
        setCodes([]);
      } else {
        // Filter codes that have valid reflink
        const validCodes = (data || []).filter(c => c.reflink) as ActiveOtpCode[];
        setCodes(validCodes);
      }
      setLoading(false);
    };

    fetchActiveCodes();
    
    // Auto-refresh every 60 seconds to check for expired codes
    const interval = setInterval(fetchActiveCodes, 60000);
    return () => clearInterval(interval);
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
                  {t('dashboard.otpExpiresIn') || 'Wygasa za'} <LiveCountdown expiresAt={code.expires_at} />
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
