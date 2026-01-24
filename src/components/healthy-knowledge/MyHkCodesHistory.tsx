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
import { Heart, Search, Copy, Trash2, Loader2, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { HkOtpCode } from '@/types/healthyKnowledge';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';

// Live countdown component
const LiveCountdown: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
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
  }, [expiresAt]);

  if (isExpired) {
    return <span className="text-muted-foreground">Wygasł</span>;
  }

  return <span className="text-primary font-medium">{timeLeft}</span>;
};

const MyHkCodesHistory: React.FC = () => {
  const { user, isPartner, isAdmin } = useAuth();
  const [codes, setCodes] = useState<HkOtpCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const fetchCodes = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hk_otp_codes')
        .select(`
          *,
          healthy_knowledge (id, title, slug, otp_max_sessions)
        `)
        .eq('partner_id', user.id)
        .eq('is_deleted_by_user', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes((data as HkOtpCode[]) || []);
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
    if (isPast(new Date(code.expires_at))) return false;
    const maxSessions = code.healthy_knowledge?.otp_max_sessions || 3;
    if (code.used_sessions >= maxSessions) return false;
    return true;
  };

  const handleCopyLink = async (code: HkOtpCode) => {
    const slug = code.healthy_knowledge?.slug;
    if (!slug) return;
    
    const link = `https://purelife.info.pl/zdrowa-wiedza/${slug}`;
    await navigator.clipboard.writeText(link);
    toast.success('Link skopiowany do schowka');
  };

  const handleCopyMessage = async (code: HkOtpCode) => {
    const slug = code.healthy_knowledge?.slug;
    const title = code.healthy_knowledge?.title;
    if (!slug || !title) return;
    
    const link = `https://purelife.info.pl/zdrowa-wiedza/${slug}`;
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
              <CardTitle>Moje kody Zdrowej Wiedzy</CardTitle>
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
                          {code.recipient_name || code.recipient_email || '-'}
                        </TableCell>
                        <TableCell>
                          <LiveCountdown expiresAt={code.expires_at} />
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
                          {code.recipient_name || code.recipient_email || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(code.expires_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
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
