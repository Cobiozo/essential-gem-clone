import React, { useState, useEffect, useMemo } from 'react';
import { Key, Search, XCircle, RefreshCw, Clock, User, Link2, ArrowUp, ArrowDown, Trash2, MoreHorizontal, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type SortField = 'code' | 'partner' | 'reflink' | 'status' | 'sessions' | 'expires_at' | 'created_at';
type SortDirection = 'asc' | 'desc';

export const OtpCodesManagement: React.FC = () => {
  const [otpCodes, setOtpCodes] = useState<OtpCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'invalidated'>('all');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCodeDetails, setSelectedCodeDetails] = useState<OtpCode | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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
    setSelectedCodes(new Set()); // Clear selection on refresh
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

  const handleDeleteSingle = async (codeId: string) => {
    const code = otpCodes.find(c => c.id === codeId);
    if (!code) return;
    
    const isExpired = isPast(new Date(code.expires_at));
    if (!code.is_invalidated && !isExpired) {
      toast({
        title: 'Uwaga',
        description: 'Można usuwać tylko unieważnione lub wygasłe kody',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('infolink_otp_codes')
      .delete()
      .eq('id', codeId);

    if (error) {
      console.error('Error deleting code:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć kodu',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sukces',
        description: 'Kod został usunięty',
      });
      fetchOtpCodes();
    }
  };

  const handleDeleteSelected = async () => {
    // Filter only those that can be deleted (expired OR invalidated)
    const codesToDelete = otpCodes.filter(c => 
      selectedCodes.has(c.id) && 
      (c.is_invalidated || isPast(new Date(c.expires_at)))
    );

    if (codesToDelete.length === 0) {
      toast({
        title: 'Uwaga',
        description: 'Zaznaczone kody są aktywne - można usuwać tylko unieważnione lub wygasłe kody',
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
      return;
    }

    const { error } = await supabase
      .from('infolink_otp_codes')
      .delete()
      .in('id', codesToDelete.map(c => c.id));

    if (error) {
      console.error('Error deleting codes:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć kodów',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sukces',
        description: `Usunięto ${codesToDelete.length} kodów`,
      });
      setSelectedCodes(new Set());
      fetchOtpCodes();
    }
    setDeleteDialogOpen(false);
  };

  const getCodeStatus = (code: OtpCode): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; order: number } => {
    if (code.is_invalidated) {
      return { label: 'Unieważniony', variant: 'destructive', order: 3 };
    }
    if (isPast(new Date(code.expires_at))) {
      return { label: 'Wygasł', variant: 'secondary', order: 2 };
    }
    return { label: 'Aktywny', variant: 'default', order: 1 };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const filteredAndSortedCodes = useMemo(() => {
    // First filter
    let result = otpCodes.filter(code => {
      // Filter by status
      if (filter === 'active' && (code.is_invalidated || isPast(new Date(code.expires_at)))) {
        return false;
      }
      if (filter === 'expired' && (!isPast(new Date(code.expires_at)) || code.is_invalidated)) {
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
        const reflinkSlug = (code.reflink?.slug || '').toLowerCase();
        const codeValue = code.code.toLowerCase();

        return (
          partnerName.includes(search) ||
          partnerEmail.includes(search) ||
          reflinkTitle.includes(search) ||
          reflinkSlug.includes(search) ||
          codeValue.includes(search)
        );
      }

      return true;
    });

    // Then sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'partner':
          const nameA = `${a.partner?.first_name || ''} ${a.partner?.last_name || ''}`.trim();
          const nameB = `${b.partner?.first_name || ''} ${b.partner?.last_name || ''}`.trim();
          comparison = nameA.localeCompare(nameB);
          break;
        case 'reflink':
          const titleA = a.reflink?.title || a.reflink?.slug || '';
          const titleB = b.reflink?.title || b.reflink?.slug || '';
          comparison = titleA.localeCompare(titleB);
          break;
        case 'status':
          comparison = getCodeStatus(a).order - getCodeStatus(b).order;
          break;
        case 'sessions':
          comparison = a.used_sessions - b.used_sessions;
          break;
        case 'expires_at':
          comparison = new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [otpCodes, filter, searchTerm, sortField, sortDirection]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCodes(new Set(filteredAndSortedCodes.map(c => c.id)));
    } else {
      setSelectedCodes(new Set());
    }
  };

  const handleSelectOne = (codeId: string, checked: boolean) => {
    const newSet = new Set(selectedCodes);
    if (checked) {
      newSet.add(codeId);
    } else {
      newSet.delete(codeId);
    }
    setSelectedCodes(newSet);
  };

  const viewCodeDetails = (code: OtpCode) => {
    setSelectedCodeDetails(code);
    setDetailsDialogOpen(true);
  };

  // Count deletable selected codes
  const deletableSelectedCount = useMemo(() => {
    return otpCodes.filter(c => 
      selectedCodes.has(c.id) && 
      (c.is_invalidated || isPast(new Date(c.expires_at)))
    ).length;
  }, [otpCodes, selectedCodes]);

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
    <>
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

          {/* Bulk actions panel */}
          {selectedCodes.size > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg border">
              <span className="text-sm font-medium">
                Zaznaczono: {selectedCodes.size}
                {deletableSelectedCount < selectedCodes.size && (
                  <span className="text-muted-foreground ml-1">
                    (do usunięcia: {deletableSelectedCount})
                  </span>
                )}
              </span>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deletableSelectedCount === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Usuń zaznaczone
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedCodes(new Set())}>
                Anuluj zaznaczenie
              </Button>
            </div>
          )}

          {/* Table */}
          {filteredAndSortedCodes.length === 0 ? (
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
                    <TableHead className="w-10">
                      <Checkbox 
                        checked={selectedCodes.size === filteredAndSortedCodes.length && filteredAndSortedCodes.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('code')}
                    >
                      <div className="flex items-center">
                        Kod
                        <SortIcon field="code" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('partner')}
                    >
                      <div className="flex items-center">
                        Partner
                        <SortIcon field="partner" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('reflink')}
                    >
                      <div className="flex items-center">
                        InfoLink
                        <SortIcon field="reflink" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('sessions')}
                    >
                      <div className="flex items-center">
                        Sesje
                        <SortIcon field="sessions" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('expires_at')}
                    >
                      <div className="flex items-center">
                        Wygasa
                        <SortIcon field="expires_at" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCodes.map((code) => {
                    const status = getCodeStatus(code);
                    const isExpired = isPast(new Date(code.expires_at));
                    const canDelete = code.is_invalidated || isExpired;
                    const canInvalidate = !code.is_invalidated && !isExpired;
                    
                    return (
                      <TableRow key={code.id} className={code.is_invalidated ? 'opacity-60' : ''}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedCodes.has(code.id)}
                            onCheckedChange={(checked) => handleSelectOne(code.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                            {code.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {code.partner?.first_name || code.partner?.last_name 
                                  ? `${code.partner?.first_name || ''} ${code.partner?.last_name || ''}`.trim()
                                  : code.partner_id
                                    ? <span className="text-muted-foreground italic text-xs font-mono" title={code.partner_id}>ID: {code.partner_id.slice(0, 8)}...</span>
                                    : <span className="text-muted-foreground italic">Brak danych</span>
                                }
                              </p>
                              {code.partner?.email && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {code.partner.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => viewCodeDetails(code)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Szczegóły
                              </DropdownMenuItem>
                              {canInvalidate && (
                                <DropdownMenuItem 
                                  onClick={() => handleInvalidateCode(code.id)}
                                  className="text-orange-600 focus:text-orange-600"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Unieważnij
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteSingle(code.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Usuń
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć zaznaczone kody?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletableSelectedCount === selectedCodes.size ? (
                <>
                  Czy na pewno chcesz usunąć <strong>{selectedCodes.size}</strong> zaznaczonych kodów? 
                  Ta operacja jest nieodwracalna.
                </>
              ) : (
                <>
                  Zaznaczono <strong>{selectedCodes.size}</strong> kodów, ale tylko{' '}
                  <strong>{deletableSelectedCount}</strong> można usunąć (unieważnione/wygasłe).
                  Aktywne kody zostaną pominięte. Ta operacja jest nieodwracalna.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń ({deletableSelectedCount})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Szczegóły kodu OTP</DialogTitle>
            <DialogDescription>
              Pełne informacje o kodzie dostępu
            </DialogDescription>
          </DialogHeader>
          {selectedCodeDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Kod</p>
                  <code className="text-lg font-mono">{selectedCodeDetails.code}</code>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={getCodeStatus(selectedCodeDetails).variant}>
                    {getCodeStatus(selectedCodeDetails).label}
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Partner</p>
                <p className="text-sm">
                  {selectedCodeDetails.partner?.first_name || selectedCodeDetails.partner?.last_name 
                    ? `${selectedCodeDetails.partner?.first_name || ''} ${selectedCodeDetails.partner?.last_name || ''}`.trim()
                    : 'Brak danych'
                  }
                </p>
                {selectedCodeDetails.partner?.email && (
                  <p className="text-xs text-muted-foreground">{selectedCodeDetails.partner.email}</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">InfoLink</p>
                <p className="text-sm">{selectedCodeDetails.reflink?.title || selectedCodeDetails.reflink?.slug || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Wykorzystane sesje</p>
                  <p className="text-sm">
                    {selectedCodeDetails.used_sessions} / {selectedCodeDetails.reflink?.otp_max_sessions || 1}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Wygasa</p>
                  <p className="text-sm">
                    {format(new Date(selectedCodeDetails.expires_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Utworzono</p>
                <p className="text-sm">
                  {format(new Date(selectedCodeDetails.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: pl })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OtpCodesManagement;
