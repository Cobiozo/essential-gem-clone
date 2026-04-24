import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  submissionId: string;
  currentPartnerUserId: string | null;
  onAssigned: () => void;
}

const AssignPartnerDialog: React.FC<Props> = ({ open, onOpenChange, submissionId, currentPartnerUserId, onAssigned }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 250);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['assign-partner-search', debounced],
    enabled: open,
    queryFn: async () => {
      // Get partner role users
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'partner');
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) return [];
      let q = supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id')
        .in('user_id', ids)
        .limit(50);
      if (debounced && debounced.length >= 2) {
        const term = `%${debounced}%`;
        q = q.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},eq_id.ilike.${term}`);
      } else {
        q = q.order('first_name');
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const assign = useMutation({
    mutationFn: async (partnerUserId: string | null) => {
      const { data, error } = await supabase.functions.invoke('admin-assign-submission-partner', {
        body: { submissionId, partnerUserId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Błąd');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-form-submissions'] });
      onAssigned();
      onOpenChange(false);
      toast({ title: 'Partner zaktualizowany' });
    },
    onError: (e: Error) => toast({ title: 'Błąd', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Przypisz partnera zapraszającego</DialogTitle>
          <DialogDescription>
            Wybierz partnera, którego chcesz przypisać do tej rejestracji. Gość zostanie automatycznie dodany do jego prywatnych kontaktów (Z zaproszeń na Eventy).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Szukaj po imieniu, nazwisku, emailu, EQ ID..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Ładowanie...
              </div>
            ) : partners.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Brak partnerów</div>
            ) : (
              partners.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => assign.mutate(p.user_id)}
                  disabled={assign.isPending}
                  className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                    currentPartnerUserId === p.user_id ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="font-medium text-sm">
                    {p.first_name || '—'} {p.last_name || ''}
                    {p.eq_id && <span className="text-xs text-muted-foreground ml-2">EQ: {p.eq_id}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentPartnerUserId && (
            <Button
              variant="outline"
              onClick={() => assign.mutate(null)}
              disabled={assign.isPending}
              className="text-destructive hover:text-destructive"
            >
              <UserX className="w-4 h-4 mr-1" /> Odepnij partnera
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={assign.isPending}>
            Anuluj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignPartnerDialog;
