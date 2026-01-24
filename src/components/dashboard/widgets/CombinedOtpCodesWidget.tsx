import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Key, Clock, Copy, Loader2, CheckCircle2, XCircle, Users } from 'lucide-react';
import { HkOtpCode } from '@/types/healthyKnowledge';

// Shared types
interface InfoLinkCode {
  id: string;
  code: string;
  expires_at: string;
  is_invalidated: boolean;
  used_sessions: number;
  created_at: string;
  first_session_expires_at?: string | null;
  reflink?: {
    id: string;
    title: string;
    otp_max_sessions: number;
    otp_validity_hours?: number;
  };
  infolink_sessions?: { expires_at: string }[];
}

// Shared LiveCountdown component for HK codes (timer from first use)
const HkLiveCountdown: React.FC<{ 
  firstUsedAt: string | null;
  validityHours?: number;
}> = ({ firstUsedAt, validityHours = 24 }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      if (document.hidden) return;
      
      // If not used yet, show waiting status
      if (!firstUsedAt) {
        setTimeLeft('');
        return;
      }

      // Calculate expiry from first use
      const firstUse = new Date(firstUsedAt).getTime();
      const accessExpiry = firstUse + (validityHours * 60 * 60 * 1000);
      const now = new Date().getTime();
      const diff = accessExpiry - now;

      if (diff <= 0) {
        setTimeLeft('Wygasł');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      
      if (hours > 0) {
        setTimeLeft(`${hours}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setTimeLeft(`${pad(minutes)}:${pad(seconds)}`);
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
  }, [firstUsedAt, validityHours]);

  if (!firstUsedAt) {
    return <span className="text-xs text-muted-foreground italic">Oczekuje na użycie</span>;
  }

  return <span className="font-mono text-xs tabular-nums">{timeLeft}</span>;
};

// InfoLink countdown (timer from session creation or expires_at)
const InfoLinkLiveCountdown: React.FC<{ 
  expiresAt: string;
  isUsed: boolean;
}> = ({ expiresAt, isUsed }) => {
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

      const pad = (n: number) => n.toString().padStart(2, '0');
      
      if (hours > 0) {
        setTimeLeft(`${hours}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setTimeLeft(`${pad(minutes)}:${pad(seconds)}`);
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

  if (!isUsed) {
    return <span className="text-xs text-muted-foreground italic">Oczekuje na użycie</span>;
  }

  return <span className="font-mono text-xs tabular-nums">{timeLeft}</span>;
};

export const CombinedOtpCodesWidget: React.FC = () => {
  const { user, isPartner, isAdmin } = useAuth();
  const [infoLinkCodes, setInfoLinkCodes] = useState<InfoLinkCode[]>([]);
  const [hkCodes, setHkCodes] = useState<HkOtpCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infolinks');

  // Fetch InfoLink codes
  const fetchInfoLinkCodes = useCallback(async () => {
    if (!user) return;
    
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('infolink_otp_codes')
        .select(`
          id, code, expires_at, used_sessions, created_at,
          reflink:reflinks(id, title, otp_max_sessions, otp_validity_hours),
          infolink_sessions(expires_at)
        `)
        .eq('partner_id', user.id)
        .eq('is_invalidated', false)
        .gte('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Calculate first_session_expires_at for each code
      const codesWithSession = (data || []).map((code: any) => {
        const sessions = code.infolink_sessions || [];
        const firstSession = sessions.length > 0 
          ? sessions.reduce((earliest: any, s: any) => 
              !earliest || new Date(s.expires_at) < new Date(earliest.expires_at) ? s : earliest
            , null)
          : null;
        return {
          ...code,
          first_session_expires_at: firstSession?.expires_at || null
        };
      });
      
      setInfoLinkCodes(codesWithSession);
    } catch (error) {
      console.error('Error fetching InfoLink OTP codes:', error);
    }
  }, [user]);

  // Fetch HK codes
  const fetchHkCodes = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('hk_otp_codes')
        .select(`
          *,
          healthy_knowledge (id, title, slug, otp_max_sessions, otp_validity_hours)
        `)
        .eq('partner_id', user.id)
        .eq('is_invalidated', false)
        .eq('is_deleted_by_user', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Filter only active codes (not expired based on first_used_at + validity)
      const activeCodes = (data || []).filter((code: any) => {
        if (!code.first_used_at) return true; // Not used yet - still active
        const knowledge = code.healthy_knowledge;
        const validityHours = knowledge?.otp_validity_hours || 24;
        const firstUse = new Date(code.first_used_at).getTime();
        const accessExpiry = firstUse + (validityHours * 60 * 60 * 1000);
        return Date.now() < accessExpiry;
      });
      
      setHkCodes(activeCodes as HkOtpCode[]);
    } catch (error) {
      console.error('Error fetching HK OTP codes:', error);
    }
  }, [user]);

  // Combined fetch
  const fetchAllCodes = useCallback(async () => {
    await Promise.all([fetchInfoLinkCodes(), fetchHkCodes()]);
    setLoading(false);
  }, [fetchInfoLinkCodes, fetchHkCodes]);

  useEffect(() => {
    fetchAllCodes();
    
    // Polling every 60 seconds
    const interval = setInterval(fetchAllCodes, 60000);
    
    // Event listeners for new codes
    const handleInfoLinkCode = () => fetchInfoLinkCodes();
    const handleHkCode = () => fetchHkCodes();
    
    window.addEventListener('otpCodeGenerated', handleInfoLinkCode);
    window.addEventListener('hkOtpCodeGenerated', handleHkCode);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('otpCodeGenerated', handleInfoLinkCode);
      window.removeEventListener('hkOtpCodeGenerated', handleHkCode);
    };
  }, [fetchAllCodes, fetchInfoLinkCodes, fetchHkCodes]);

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

  // Don't render if no codes in both categories
  const totalCodes = infoLinkCodes.length + hkCodes.length;
  
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Kody dostępu OTP</CardTitle>
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

  if (totalCodes === 0) {
    return null;
  }

  // Get status for HK codes
  const getHkCodeStatus = (code: HkOtpCode) => {
    const knowledge = code.healthy_knowledge as any;
    const maxSessions = knowledge?.otp_max_sessions || 3;
    const validityHours = knowledge?.otp_validity_hours || 24;
    
    const isUsed = code.used_sessions > 0 || code.first_used_at !== null;
    const isExhausted = code.used_sessions >= maxSessions;
    
    // Check if expired (after first use + validity hours)
    if (code.first_used_at) {
      const firstUse = new Date(code.first_used_at).getTime();
      const accessExpiry = firstUse + (validityHours * 60 * 60 * 1000);
      if (Date.now() > accessExpiry) {
        return { label: 'Wygasł', variant: 'secondary' as const, icon: XCircle };
      }
    }
    
    if (isExhausted) {
      return { label: 'Wyczerpany', variant: 'secondary' as const, icon: XCircle };
    }
    if (isUsed) {
      return { label: `Użyty (${code.used_sessions}/${maxSessions})`, variant: 'default' as const, icon: CheckCircle2 };
    }
    return { label: 'Oczekuje', variant: 'outline' as const, icon: null };
  };

  // Get status for InfoLink codes
  const getInfoLinkCodeStatus = (code: InfoLinkCode) => {
    const maxSessions = code.reflink?.otp_max_sessions || 1;
    const isUsed = code.used_sessions > 0;
    const isExhausted = code.used_sessions >= maxSessions;
    
    if (isExhausted) {
      return { label: 'Wyczerpany', variant: 'secondary' as const, icon: XCircle };
    }
    if (isUsed) {
      return { label: `Użyty (${code.used_sessions}/${maxSessions})`, variant: 'default' as const, icon: CheckCircle2 };
    }
    return { label: 'Oczekuje', variant: 'outline' as const, icon: null };
  };

  const renderEmptyState = (type: string) => (
    <p className="text-sm text-muted-foreground text-center py-4">
      Brak aktywnych kodów {type}.
    </p>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Kody dostępu OTP</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="infolinks" className="text-xs sm:text-sm">
              InfoLinki
              {infoLinkCodes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {infoLinkCodes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="zdrowa-wiedza" className="text-xs sm:text-sm">
              Zdrowa Wiedza
              {hkCodes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {hkCodes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="infolinks" className="mt-0 space-y-2">
            {infoLinkCodes.length === 0 ? (
              renderEmptyState('InfoLink')
            ) : (
              infoLinkCodes.map((code) => {
                const status = getInfoLinkCodeStatus(code);
                const StatusIcon = status.icon;
                const maxSessions = code.reflink?.otp_max_sessions || 1;
                const isUsed = code.used_sessions > 0;
                const sessionExpiry = code.first_session_expires_at || code.expires_at;
                
                return (
                  <div 
                    key={code.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
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
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {code.reflink?.title || 'InfoLink'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 ml-2">
                      <Badge 
                        variant={status.variant} 
                        className={`text-xs ${status.variant === 'default' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                      >
                        {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                        {status.label}
                      </Badge>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <InfoLinkLiveCountdown 
                            expiresAt={sessionExpiry}
                            isUsed={isUsed}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span className="text-xs">{code.used_sessions}/{maxSessions}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="zdrowa-wiedza" className="mt-0 space-y-2">
            {hkCodes.length === 0 ? (
              renderEmptyState('Zdrowa Wiedza')
            ) : (
              hkCodes.map((code) => {
                const knowledge = code.healthy_knowledge as any;
                const maxSessions = knowledge?.otp_max_sessions || 3;
                const validityHours = knowledge?.otp_validity_hours || 24;
                const status = getHkCodeStatus(code);
                const StatusIcon = status.icon;
                
                return (
                  <div 
                    key={code.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
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
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {knowledge?.title || 'Materiał'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 ml-2">
                      <Badge 
                        variant={status.variant} 
                        className={`text-xs ${status.variant === 'default' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                      >
                        {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                        {status.label}
                      </Badge>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <HkLiveCountdown 
                            firstUsedAt={code.first_used_at}
                            validityHours={validityHours}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span className="text-xs">{code.used_sessions}/{maxSessions}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CombinedOtpCodesWidget;
