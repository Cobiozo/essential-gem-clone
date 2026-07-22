import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Heart, Search, Copy, Trash2, Loader2, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { HkOtpCode } from '@/types/healthyKnowledge';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { getAppDateLocale } from '@/utils/dateLocale';
import { useLanguage } from '@/contexts/LanguageContext';

// Live countdown component - starts from first use, not generation
const LiveCountdown: React.FC<{ expiresAt: string; firstUsedAt: string | null; validityHours?: number }> = ({ 
  expiresAt, 
  firstUsedAt,
  validityHours = 24 
}) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      
      // If code hasn't been used yet, show "Oczekuje"
      if (!firstUsedAt) {
        setIsPending(true);
        setIsExpired(false);
        setTimeLeft('');
        return;
      }
      
      setIsPending(false);
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Wygasł');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, firstUsedAt]);

  if (isPending) {
    return (
      <span className="text-muted-foreground text-sm flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Oczekuje ({validityHours}h)
      </span>
    );
  }

  if (isExpired) {
    return <span className="text-muted-foreground">Wygasł</span>;
  }

  return <span className="text-primary font-medium">{timeLeft}</span>;
};

const MyHkCodesHistory: React.FC = () => {
  const { user, isPartner, isAdmin, profile } = useAuth();
  const { language } = useLanguage();
  const [codes, setCodes] = useState<HkOtpCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [expandedGuests, setExpandedGuests] = useState<Set<string>>(new Set());
  const toggleGuests = (id: string) => setExpandedGuests(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const fetchCodes = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hk_otp_codes')
        .select(`
          *,
          healthy_knowledge (id, title, slug, otp_max_sessions, otp_validity_hours),
          hk_otp_sessions (
            id,
            created_at,
            last_activity_at,
            expires_at,
            guest_first_name,
            guest_last_name,
            guest_email,
            guest_phone,
            email_consent,
            watched_seconds,
            completed_at

          )
        `)
        .eq('partner_id', user.id)
        .eq('is_deleted_by_user', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(((data as unknown) as HkOtpCode[]) || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast.error('Nie udało się pobrać kodów');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCodes();
    
    // Listen for new codes
    const handleNewCode = () => fetchCodes();
    window.addEventListener('hkOtpCodeGenerated', handleNewCode);
    return () => window.removeEventListener('hkOtpCodeGenerated', handleNewCode);
  }, [fetchCodes]);

  const getCodeStatus = (code: HkOtpCode) => {
    if (code.is_invalidated) {
      return { label: 'Unieważniony', variant: 'destructive' as const, icon: XCircle };
    }
    
    // If not used yet, check if the code itself has expired (7-day window)
    if (!code.first_used_at) {
      if (isPast(new Date(code.expires_at))) {
        return { label: 'Niewykorzystany', variant: 'secondary' as const, icon: AlertCircle };
      }
      return { label: 'Oczekuje', variant: 'outline' as const, icon: Clock };
    }
    
    // Code was used - check if access has expired
    if (isPast(new Date(code.expires_at))) {
      return { label: 'Wygasły', variant: 'secondary' as const, icon: AlertCircle };
    }
    
    const maxSessions = code.healthy_knowledge?.otp_max_sessions || 3;
    if (code.used_sessions >= maxSessions) {
      return { label: 'Wykorzystany', variant: 'outline' as const, icon: CheckCircle };
    }
    return { label: 'Aktywny', variant: 'default' as const, icon: Clock };
  };

  const isCodeActive = (code: HkOtpCode) => {
    if (code.is_invalidated) return false;
    
    // If not used yet, code is still active if within 7-day window
    if (!code.first_used_at) {
      return !isPast(new Date(code.expires_at));
    }
    
    // If used, check if access has expired
    if (isPast(new Date(code.expires_at))) return false;
    
    const maxSessions = code.healthy_knowledge?.otp_max_sessions || 3;
    if (code.used_sessions >= maxSessions) return false;
    return true;
  };

  const handleCopyLink = async (code: HkOtpCode) => {
    const slug = code.healthy_knowledge?.slug;
    if (!slug) return;
    
    const ref = code.partner_eq_id || profile?.eq_id || null;
    const baseLink = `https://purelifecenter.pl/zdrowa-wiedza/${slug}`;
    const link = ref ? `${baseLink}?ref=${encodeURIComponent(ref)}` : baseLink;
    await navigator.clipboard.writeText(link);
    toast.success('Link skopiowany do schowka');
  };

  const handleCopyMessage = async (code: HkOtpCode) => {
    const slug = code.healthy_knowledge?.slug;
    const title = code.healthy_knowledge?.title;
    if (!slug || !title) return;
    
    const ref = code.partner_eq_id || profile?.eq_id || null;
    const baseLink = `https://purelifecenter.pl/zdrowa-wiedza/${slug}`;
    const link = ref ? `${baseLink}?ref=${encodeURIComponent(ref)}` : baseLink;
    const message = `🔗 Link: ${link}\n🔑 Kod dostępu: ${code.code}`;
    
    await navigator.clipboard.writeText(message);
    toast.success('Wiadomość skopiowana do schowka');
  };

  const handleSoftDelete = async (code: HkOtpCode) => {
    try {
      const { error } = await supabase
        .from('hk_otp_codes')
        .update({ 
          is_deleted_by_user: true, 
          deleted_by_user_at: new Date().toISOString() 
        })
        .eq('id', code.id);

      if (error) throw error;
      
      setCodes(prev => prev.filter(c => c.id !== code.id));
      toast.success('Kod usunięty z historii');
    } catch (error) {
      console.error('Error deleting code:', error);
      toast.error('Nie udało się usunąć kodu');
    }
  };

  const getLatestSession = (code: HkOtpCode) => {
    const sessions = [...(code.hk_otp_sessions || [])];
    return sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
  };

  const getRecipientLabel = (code: HkOtpCode) => {
    const session = getLatestSession(code);
    if (session) {
      const guestName = `${session.guest_first_name || ''} ${session.guest_last_name || ''}`.trim();
      return guestName || session.guest_email || session.guest_phone || 'Gość aktywował dostęp';
    }
    return code.recipient_name || code.recipient_email || '-';
  };

  const getRecipientDetails = (code: HkOtpCode) => {
    const session = getLatestSession(code);
    if (!session) return null;
    const parts = [session.guest_email, session.guest_phone].filter(Boolean);
    if (typeof session.watched_seconds === 'number') {
      const seconds = Math.max(0, session.watched_seconds);
      const watched = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      parts.push(`oglądanie: ${watched}`);
    }
    return parts.join(' · ');
  };

  const renderRecipientCell = (code: HkOtpCode) => {
    const sessions = [...(code.hk_otp_sessions || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (sessions.length === 0) {
      return <p className="font-medium truncate text-muted-foreground">{code.recipient_name || code.recipient_email || '-'}</p>;
    }
    const isOpen = expandedGuests.has(code.id);
    return (
      <div>
        <button
          type="button"
          onClick={() => toggleGuests(code.id)}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          {isOpen ? 'Ukryj dane osoby' : `Pokaż dane osoby (${sessions.length})`}
        </button>
        {isOpen && (
          <div className="mt-1.5 space-y-1.5">
            {sessions.map((s) => {
              const name = `${s.guest_first_name || ''} ${s.guest_last_name || ''}`.trim();
              const seconds = Math.max(0, Number(s.watched_seconds || 0));
              const watched = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
              return (
                <div key={s.id} className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-xs text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground truncate">{name || s.guest_email || 'Osoba bez danych'}</p>
                  {s.guest_email && <p className="truncate">{s.guest_email}</p>}
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {s.guest_phone && <span>{s.guest_phone}</span>}
                    <span>Oglądanie: {watched}</span>
                    <span className={s.completed_at ? 'text-green-500 font-medium' : 'text-amber-500'}>
                      {s.completed_at ? '✅ Ukończone' : '⏳ W trakcie'}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Filter codes by tab and search
  const filteredCodes = codes.filter(code => {
    const matchesTab = activeTab === 'active' ? isCodeActive(code) : !isCodeActive(code);
    const matchesSearch = searchTerm === '' || 
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.healthy_knowledge?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  const activeCodes = codes.filter(isCodeActive);
  const archivedCodes = codes.filter(c => !isCodeActive(c));

  if (!isPartner && !isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Moje kody Bazy Wiedzy</CardTitle>
              <CardDescription>Historia wygenerowanych kodów dostępu</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCodes} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archived')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Aktywne ({activeCodes.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archiwum ({archivedCodes.length})
            </TabsTrigger>
          </TabsList>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po kodzie, materiale, odbiorcy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <TabsContent value="active" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{searchTerm ? 'Nie znaleziono kodów' : 'Brak aktywnych kodów'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Materiał</TableHead>
                    <TableHead>Odbiorca</TableHead>
                    <TableHead>Pozostało</TableHead>
                    <TableHead>Sesje</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCodes.map((code) => {
                    const status = getCodeStatus(code);
                    const maxSessions = code.healthy_knowledge?.otp_max_sessions || 3;
                    return (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-bold">{code.code}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {code.healthy_knowledge?.title || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[260px]">
                            {renderRecipientCell(code)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <LiveCountdown 
                            expiresAt={code.expires_at} 
                            firstUsedAt={code.first_used_at}
                            validityHours={code.healthy_knowledge?.otp_validity_hours}
                          />
                        </TableCell>
                        <TableCell>
                          <span className={code.used_sessions >= maxSessions ? 'text-orange-500' : ''}>
                            {code.used_sessions}/{maxSessions}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleCopyLink(code)} title="Kopiuj link">
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCopyMessage(code)} title="Kopiuj wiadomość">
                              <Copy className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleSoftDelete(code)} title="Usuń z historii" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{searchTerm ? 'Nie znaleziono kodów' : 'Brak zarchiwizowanych kodów'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Materiał</TableHead>
                    <TableHead>Odbiorca</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wygasł</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCodes.map((code) => {
                    const status = getCodeStatus(code);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-bold text-muted-foreground">{code.code}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {code.healthy_knowledge?.title || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[260px]">
                            {renderRecipientCell(code)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(code.expires_at), 'dd.MM.yyyy HH:mm', { locale: getAppDateLocale(language) })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleSoftDelete(code)} title="Usuń z historii" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MyHkCodesHistory;
