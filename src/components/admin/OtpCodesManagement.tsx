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
import { useLanguage } from '@/contexts/LanguageContext';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';

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
    eq_id: string | null;
    _noProfile?: boolean;
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
  const { t, language } = useLanguage();
  
  const dateLocale = language === 'pl' ? pl : enUS;

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
        title: t('toast.error'),
        description: t('admin.otp.fetchError'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch partner profiles separately
    const partnerIds = [...new Set(codesData?.map(c => c.partner_id) || [])];
    
    let partnersMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null; eq_id: string | null; _noProfile?: boolean }> = {};
    
    if (partnerIds.length > 0) {
      // First fetch from profiles table
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, eq_id')
        .in('id', partnerIds);
      
      if (profilesData) {
        partnersMap = profilesData.reduce((acc, p) => {
          acc[p.id] = { first_name: p.first_name, last_name: p.last_name, email: p.email, eq_id: p.eq_id };
          return acc;
        }, {} as typeof partnersMap);
      }

      // Find partners without profiles and fetch their emails from auth.users
      const missingPartnerIds = partnerIds.filter(id => !partnersMap[id]);
      
      if (missingPartnerIds.length > 0) {
        try {
          const { data: authEmailsData, error: authError } = await supabase.functions.invoke('get-user-emails', {
            body: { userIds: missingPartnerIds }
          });
          
          if (!authError && authEmailsData) {
            authEmailsData.forEach((u: { id: string; email: string }) => {
              partnersMap[u.id] = { 
                first_name: null, 
                last_name: null, 
                email: u.email, 
                eq_id: null,
                _noProfile: true 
              };
            });
          }
        } catch (err) {
          console.error('Error fetching auth emails:', err);
        }
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
        title: t('toast.error'),
        description: t('admin.otp.invalidateError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toast.success'),
        description: t('admin.otp.invalidateSuccess'),
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
        title: t('toast.warning'),
        description: t('admin.otp.canOnlyDeleteInvalidated'),
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
        title: t('toast.error'),
        description: t('admin.otp.deleteError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toast.success'),
        description: t('admin.otp.deleteSuccess'),
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
        title: t('toast.warning'),
        description: t('admin.otp.selectedCodesActive'),
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
        title: t('toast.error'),
        description: t('admin.otp.deleteMultipleError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toast.success'),
        description: `${t('admin.otp.deleted')} ${codesToDelete.length}`,
      });
      setSelectedCodes(new Set());
      fetchOtpCodes();
    }
    setDeleteDialogOpen(false);
  };

  const getCodeStatus = (code: OtpCode): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; order: number } => {
    if (code.is_invalidated) {
      return { label: t('admin.otp.statusInvalidated'), variant: 'destructive', order: 3 };
    }
    if (isPast(new Date(code.expires_at))) {
      return { label: t('admin.otp.statusExpired'), variant: 'secondary', order: 2 };
    }
    return { label: t('admin.otp.statusActive'), variant: 'default', order: 1 };
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
          <p className="text-muted-foreground text-center">{t('admin.otp.loading')}</p>
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
                {t('admin.otp.title')}
              </CardTitle>
              <CardDescription>
                {t('admin.otp.description')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchOtpCodes}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('common.refresh')}
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
              <p className="text-sm text-muted-foreground">{t('admin.otp.filterAll')}</p>
            </div>
            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${filter === 'active' ? 'bg-green-500/10 border-green-500' : 'bg-muted/30'}`}
              onClick={() => setFilter('active')}
            >
              <p className="text-2xl font-bold text-green-600">{activeCodes}</p>
              <p className="text-sm text-muted-foreground">{t('admin.otp.filterActive')}</p>
            </div>
            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${filter === 'expired' ? 'bg-yellow-500/10 border-yellow-500' : 'bg-muted/30'}`}
              onClick={() => setFilter('expired')}
            >
              <p className="text-2xl font-bold text-yellow-600">{expiredCodes}</p>
              <p className="text-sm text-muted-foreground">{t('admin.otp.filterExpired')}</p>
            </div>
            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${filter === 'invalidated' ? 'bg-red-500/10 border-red-500' : 'bg-muted/30'}`}
              onClick={() => setFilter('invalidated')}
            >
              <p className="text-2xl font-bold text-red-600">{invalidatedCodes}</p>
              <p className="text-sm text-muted-foreground">{t('admin.otp.filterInvalidated')}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.otp.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bulk actions panel */}
          {selectedCodes.size > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg border">
              <span className="text-sm font-medium">
                {t('admin.otp.selected')}: {selectedCodes.size}
                {deletableSelectedCount < selectedCodes.size && (
                  <span className="text-muted-foreground ml-1">
                    ({t('admin.otp.toDelete')}: {deletableSelectedCount})
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
                {t('admin.otp.deleteSelected')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedCodes(new Set())}>
                {t('common.cancelSelection')}
              </Button>
            </div>
          )}

          {/* Table */}
          {filteredAndSortedCodes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm || filter !== 'all' 
                ? t('admin.otp.noCodesMatchingCriteria') 
                : t('admin.otp.noCodes')}
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
                        {t('admin.otp.code')}
                        <SortIcon field="code" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('partner')}
                    >
                      <div className="flex items-center">
                        {t('common.partner')}
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
                        {t('common.status')}
                        <SortIcon field="status" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('sessions')}
                    >
                      <div className="flex items-center">
                        {t('admin.otp.sessions')}
                        <SortIcon field="sessions" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('expires_at')}
                    >
                      <div className="flex items-center">
                        {t('admin.otp.expires')}
                        <SortIcon field="expires_at" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
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
                              {code.partner?.first_name || code.partner?.last_name ? (
                                <>
                                  <p className="font-medium text-sm truncate">
                                    {`${code.partner?.first_name || ''} ${code.partner?.last_name || ''}`.trim()}
                                  </p>
                                  {code.partner?.eq_id && (
                                    <p className="text-xs text-primary font-medium">
                                      EQ: {code.partner.eq_id}
                                    </p>
                                  )}
                                  {code.partner?.email && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {code.partner.email}
                                    </p>
                                  )}
                                </>
                              ) : code.partner?.email ? (
                              <>
                                  <p className="font-medium text-sm truncate">
                                    {code.partner.email}
                                  </p>
                                  {code.partner._noProfile && (
                                    <p className="text-xs text-amber-600 italic">
                                      ({t('admin.otp.noProfile')})
                                    </p>
                                  )}
                                </>
                              ) : code.partner_id ? (
                                <p className="text-muted-foreground italic text-xs font-mono" title={code.partner_id}>
                                  ID: {code.partner_id.slice(0, 8)}...
                                </p>
                              ) : (
                                <span className="text-muted-foreground italic">{t('admin.otp.noData')}</span>
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
                                {formatDistanceToNow(new Date(code.expires_at), { addSuffix: true, locale: dateLocale })}
                              </span>
                            ) : (
                              <span>
                                {format(new Date(code.expires_at), 'dd.MM.yyyy HH:mm', { locale: dateLocale })}
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
                                {t('common.details')}
                              </DropdownMenuItem>
                              {canInvalidate && (
                                <DropdownMenuItem 
                                  onClick={() => handleInvalidateCode(code.id)}
                                  className="text-orange-600 focus:text-orange-600"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  {t('admin.otp.invalidate')}
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteSingle(code.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {t('common.delete')}
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
            <AlertDialogTitle>{t('admin.otp.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletableSelectedCount === selectedCodes.size ? (
                <>
                  {t('admin.otp.deleteConfirmText')} <strong>{selectedCodes.size}</strong>
                </>
              ) : (
                <>
                  {t('admin.otp.deleteConfirmPartialText')} <strong>{selectedCodes.size}</strong> → <strong>{deletableSelectedCount}</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')} ({deletableSelectedCount})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.otp.detailsTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.otp.detailsDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedCodeDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.otp.code')}</p>
                  <code className="text-lg font-mono">{selectedCodeDetails.code}</code>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('common.status')}</p>
                  <Badge variant={getCodeStatus(selectedCodeDetails).variant}>
                    {getCodeStatus(selectedCodeDetails).label}
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('common.partner')}</p>
                <p className="text-sm">
                  {selectedCodeDetails.partner?.first_name || selectedCodeDetails.partner?.last_name 
                    ? `${selectedCodeDetails.partner?.first_name || ''} ${selectedCodeDetails.partner?.last_name || ''}`.trim()
                    : t('admin.otp.noData')
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
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.otp.usedSessions')}</p>
                  <p className="text-sm">
                    {selectedCodeDetails.used_sessions} / {selectedCodeDetails.reflink?.otp_max_sessions || 1}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.otp.expires')}</p>
                  <p className="text-sm">
                    {format(new Date(selectedCodeDetails.expires_at), 'dd.MM.yyyy HH:mm', { locale: dateLocale })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('admin.otp.createdAt')}</p>
                <p className="text-sm">
                  {format(new Date(selectedCodeDetails.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: dateLocale })}
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
