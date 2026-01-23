import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, Clock, Copy, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { HkOtpCode } from '@/types/healthyKnowledge';

const LiveCountdown: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      if (document.hidden) return;
      
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Wygasł');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    const handleVisibility = () => {
      if (!document.hidden) updateCountdown();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [expiresAt]);

  return <span className="font-mono text-xs">{timeLeft}</span>;
};

export const ActiveHkCodesWidget: React.FC = () => {
  const { user, isPartner, isAdmin } = useAuth();
  const [codes, setCodes] = useState<HkOtpCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveCodes = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('hk_otp_codes')
        .select(`
          *,
          healthy_knowledge (id, title, slug, otp_max_sessions)
        `)
        .eq('is_invalidated', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setCodes((data as HkOtpCode[]) || []);
    } catch (error) {
      console.error('Error fetching HK OTP codes:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchActiveCodes();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchActiveCodes, 60000);
    
    // Listen for new code events
    const handleNewCode = () => fetchActiveCodes();
    window.addEventListener('hkOtpCodeGenerated', handleNewCode);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('hkOtpCodeGenerated', handleNewCode);
    };
  }, [fetchActiveCodes]);

  // Only show for partners and admins
  if (!isPartner && !isAdmin) {
    return null;
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Kod skopiowany');
    } catch (error) {
      toast.error('Nie udało się skopiować');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Aktywne kody ZW</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (codes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Aktywne kody ZW</CardTitle>
          </div>
          <CardDescription>Kody dostępu do Zdrowej Wiedzy</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak aktywnych kodów. Wygeneruj nowy w sekcji Zdrowa Wiedza.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Aktywne kody ZW</CardTitle>
        </div>
        <CardDescription>Kody dostępu do materiałów</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {codes.map((code) => {
          const knowledge = code.healthy_knowledge as any;
          const maxSessions = knowledge?.otp_max_sessions || 3;
          const isUsed = code.used_sessions > 0;
          const isExhausted = code.used_sessions >= maxSessions;

          return (
            <div 
              key={code.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm">{code.code}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopyCode(code.code)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {knowledge?.title || 'Materiał'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  {isExhausted ? (
                    <Badge variant="secondary" className="text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      Wyczerpany
                    </Badge>
                  ) : isUsed ? (
                    <Badge variant="default" className="text-xs bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Użyty ({code.used_sessions}/{maxSessions})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Oczekuje
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <LiveCountdown expiresAt={code.expires_at} />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ActiveHkCodesWidget;
