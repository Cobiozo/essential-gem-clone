import React, { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useLeaderApprovals } from '@/hooks/useLeaderApprovals';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle,
  XCircle,
  Loader2,
  UserCheck,
  Clock,
  Users,
  Mail,
  User,
} from 'lucide-react';

export const LeaderApprovalView: React.FC = () => {
  const { pendingApprovals, isLoading, approveUser, rejectUser, isApproving, isRejecting } =
    useLeaderApprovals(true);

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    userId: string;
    name: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (userId: string) => {
    setProcessingId(userId);
    approveUser(userId);
    setProcessingId(null);
  };

  const handleRejectOpen = (userId: string, firstName: string | null, lastName: string | null) => {
    setRejectReason('');
    setRejectDialog({ open: true, userId, name: `${firstName || ''} ${lastName || ''}`.trim() });
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialog) return;
    setProcessingId(rejectDialog.userId);
    rejectUser(rejectDialog.userId, rejectReason || undefined);
    setRejectDialog(null);
    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Zatwierdzenia rejestracji
            {pendingApprovals.length > 0 && (
              <Badge variant="default" className="ml-2">
                {pendingApprovals.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Lista użytkowników oczekujących na Twoje zatwierdzenie. Jako Lider z uprawnieniami
            zatwierdzania, możesz nadać dostęp do platformy. Administrator również może zatwierdzić
            tych użytkowników.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Users className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">Brak oczekujących zatwierdzeń</p>
              <p className="text-sm text-muted-foreground/70">
                Gdy nowy użytkownik zostanie zatwierdzony przez opiekuna, pojawi się tutaj.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Użytkownik</TableHead>
                    <TableHead>Opiekun</TableHead>
                    <TableHead>Data rejestracji</TableHead>
                    <TableHead>Zatw. opiekuna</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.map((person) => {
                    const isProcessing = processingId === person.user_id;
                    return (
                      <TableRow key={person.user_id}>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium text-sm">
                                {person.first_name} {person.last_name}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {person.email}
                              </div>
                              {person.eq_id && (
                                <p className="text-xs text-muted-foreground">EQ: {person.eq_id}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {person.upline_first_name || person.upline_last_name ? (
                              <span>
                                {person.upline_first_name} {person.upline_last_name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {person.upline_eq_id || '—'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {person.created_at
                              ? format(new Date(person.created_at), 'd MMM yyyy', { locale: pl })
                              : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            {person.guardian_approved_at
                              ? format(new Date(person.guardian_approved_at), 'd MMM yyyy', {
                                  locale: pl,
                                })
                              : '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5"
                              disabled={isProcessing || isApproving || isRejecting}
                              onClick={() => handleApprove(person.user_id)}
                            >
                              {isProcessing && isApproving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5" />
                              )}
                              Zatwierdź
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                              disabled={isProcessing || isApproving || isRejecting}
                              onClick={() =>
                                handleRejectOpen(person.user_id, person.first_name, person.last_name)
                              }
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Odrzuć
                            </Button>
                          </div>
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

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog?.open} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odrzuć rejestrację</DialogTitle>
            <DialogDescription>
              Odrzucasz rejestrację użytkownika{' '}
              <span className="font-semibold">{rejectDialog?.name}</span>. Użytkownik zostanie
              powiadomiony.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Powód odrzucenia (opcjonalnie)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Wpisz powód odrzucenia..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Odrzuć rejestrację
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaderApprovalView;
