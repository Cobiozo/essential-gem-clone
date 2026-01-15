import React, { useState, useEffect } from 'react';
import { Key, Search, XCircle, RefreshCw, Clock, User, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';

interface OtpCode {
  id: string;
  reflink_id: string;
  partner_id: string;
  code: string;
  expires_at: string;
  is_invalidated: boolean;
  used_sessions: number;
  created_at: string;
  reflink?: {
    title: string | null;
    slug: string | null;
    otp_max_sessions: number | null;
  };
  partner?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export const OtpCodesManagement: React.FC = () => {
  const [otpCodes, setOtpCodes] = useState<OtpCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'invalidated'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchOtpCodes();
  }, []);

  const fetchOtpCodes = async () => {
    setLoading(true);
    
    // Fetch OTP codes with reflink info
    const { data: codesData, error: codesError } = await supabase
      .from('infolink_otp_codes')
      .select(`
        *,
        reflink:reflinks(title, slug, otp_max_sessions)
      `)
      .order('created_at', { ascending: false });

    if (codesError) {
      console.error('Error fetching OTP codes:', codesError);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać kodów OTP',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch partner profiles separately
    const partnerIds = [...new Set(codesData?.map(c => c.partner_id) || [])];
    
    let partnersMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null }> = {};
    
    if (partnerIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', partnerIds);
      
      if (profilesData) {
        partnersMap = profilesData.reduce((acc, p) => {
          acc[p.id] = { first_name: p.first_name, last_name: p.last_name, email: p.email };
          return acc;
        }, {} as typeof partnersMap);
      }
    }

    // Combine data
    const combinedData: OtpCode[] = (codesData || []).map(code => ({
      ...code,
      partner: partnersMap[code.partner_id] || null,
      reflink: code.reflink || undefined,
    }));

    setOtpCodes(combinedData);
    setLoading(false);
  };

  const handleInvalidateCode = async (codeId: string) => {
    const { error } = await supabase
      .from('infolink_otp_codes')
      .update({ is_invalidated: true })
      .eq('id', codeId);

    if (error) {
      console.error('Error invalidating code:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się unieważnić kodu',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sukces',
        description: 'Kod został unieważniony',
      });
      fetchOtpCodes();
    }
  };

  const getCodeStatus = (code: OtpCode): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (code.is_invalidated) {
      return { label: 'Unieważniony', variant: 'destructive' };
    }
    if (isPast(new Date(code.expires_at))) {
      return { label: 'Wygasł', variant: 'secondary' };
    }
    return { label: 'Aktywny', variant: 'default' };
  };

  const filteredCodes = otpCodes.filter(code => {
    // Filter by status
    if (filter === 'active' && (code.is_invalidated || isPast(new Date(code.expires_at)))) {
      return false;
    }
    if (filter === 'expired' && !isPast(new Date(code.expires_at))) {
      return false;
    }
    if (filter === 'invalidated' && !code.is_invalidated) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const partnerName = `${code.partner?.first_name || ''} ${code.partner?.last_name || ''}`.toLowerCase();
      const partnerEmail = (code.partner?.email || '').toLowerCase();
      const reflinkTitle = (code.reflink?.title || '').toLowerCase();
      const codeValue = code.code.toLowerCase();

      return (
        partnerName.includes(search) ||
        partnerEmail.includes(search) ||
        reflinkTitle.includes(search) ||
        codeValue.includes(search)
      );
    }

    return true;
  });

  const activeCodes = otpCodes.filter(c => !c.is_invalidated && !isPast(new Date(c.expires_at))).length;
  const expiredCodes = otpCodes.filter(c => isPast(new Date(c.expires_at)) && !c.is_invalidated).length;
  const invalidatedCodes = otpCodes.filter(c => c.is_invalidated).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Ładowanie kodów OTP...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Zarządzanie kodami OTP
            </CardTitle>
            <CardDescription>
              Przeglądaj i zarządzaj kodami dostępu do InfoLinków
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOtpCodes}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Odśwież
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div 
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${filter === 'all' ? 'bg-primary/10 border-primary' : 'bg-muted/30'}`}
            onClick={() => setFilter('all')}
          >
            <p className="text-2xl font-bold">{otpCodes.length}</p>
            <p className="text-sm text-muted-foreground">Wszystkie</p>
          </div>
          <div 
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${filter === 'active' ? 'bg-green-500/10 border-green-500' : 'bg-muted/30'}`}
            onClick={() => setFilter('active')}
          >
            <p className="text-2xl font-bold text-green-600">{activeCodes}</p>
            <p className="text-sm text-muted-foreground">Aktywne</p>
          </div>
          <div 
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${filter === 'expired' ? 'bg-yellow-500/10 border-yellow-500' : 'bg-muted/30'}`}
            onClick={() => setFilter('expired')}
          >
            <p className="text-2xl font-bold text-yellow-600">{expiredCodes}</p>
            <p className="text-sm text-muted-foreground">Wygasłe</p>
          </div>
          <div 
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${filter === 'invalidated' ? 'bg-red-500/10 border-red-500' : 'bg-muted/30'}`}
            onClick={() => setFilter('invalidated')}
          >
            <p className="text-2xl font-bold text-red-600">{invalidatedCodes}</p>
            <p className="text-sm text-muted-foreground">Unieważnione</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po kodzie, partnerze lub InfoLinku..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {filteredCodes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchTerm || filter !== 'all' 
              ? 'Brak kodów spełniających kryteria wyszukiwania' 
              : 'Brak wygenerowanych kodów OTP'}
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>InfoLink</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sesje</TableHead>
                  <TableHead>Wygasa</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.map((code) => {
                  const status = getCodeStatus(code);
                  const isExpired = isPast(new Date(code.expires_at));
                  
                  return (
                    <TableRow key={code.id} className={code.is_invalidated ? 'opacity-60' : ''}>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                          {code.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {code.partner?.first_name} {code.partner?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {code.partner?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {code.reflink?.title || code.reflink?.slug || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {code.used_sessions} / {code.reflink?.otp_max_sessions || 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {isExpired ? (
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(code.expires_at), { addSuffix: true, locale: pl })}
                            </span>
                          ) : (
                            <span>
                              {format(new Date(code.expires_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {!code.is_invalidated && !isExpired && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Unieważnić kod?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Czy na pewno chcesz unieważnić kod <strong>{code.code}</strong>? 
                                  Po unieważnieniu kod przestanie działać i nie będzie można go użyć.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleInvalidateCode(code.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Unieważnij
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OtpCodesManagement;
