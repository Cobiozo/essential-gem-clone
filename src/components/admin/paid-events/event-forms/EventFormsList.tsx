import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Copy, Eye, ListChecks, Power, PowerOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EventFormEditor } from './EventFormEditor';
import { EventFormSubmissions } from './EventFormSubmissions';
import { useAdminActivityLog } from '@/hooks/useAdminActivityLog';

export const EventFormsList: React.FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { logAction } = useAdminActivityLog();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewSubmissionsFor, setViewSubmissionsFor] = useState<any | null>(null);

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['event-registration-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_registration_forms')
        .select('*, events(title, start_time)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: countMap = {} } = useQuery({
    queryKey: ['event-form-submission-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_form_submissions')
        .select('form_id, payment_status')
        .neq('status', 'cancelled');
      if (error) throw error;
      const map: Record<string, { total: number; paid: number }> = {};
      (data as any[]).forEach(r => {
        if (!map[r.form_id]) map[r.form_id] = { total: 0, paid: 0 };
        map[r.form_id].total++;
        if (r.payment_status === 'paid') map[r.form_id].paid++;
      });
      return map;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('event_registration_forms').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-registration-forms'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('event_registration_forms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['event-registration-forms'] });
      toast({ title: 'Formularz usunięty' });
      logAction({ actionType: 'event_form_delete', actionDescription: 'Usunięto formularz rejestracji', targetTable: 'event_registration_forms', targetId: id });
    },
    onError: (e: Error) => toast({ title: 'Błąd', description: e.message, variant: 'destructive' }),
  });

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/event-form/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link skopiowany', description: url });
  };

  if (viewSubmissionsFor) {
    return (
      <EventFormSubmissions
        form={viewSubmissionsFor}
        onBack={() => setViewSubmissionsFor(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Formularze rejestracyjne</h3>
          <p className="text-sm text-muted-foreground">Twórz dedykowane formularze zgłoszeniowe dla wydarzeń z polami zdefiniowanymi przez admina.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nowy formularz
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Ładowanie...</p>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Brak formularzy. Kliknij „Nowy formularz", aby utworzyć pierwszy.
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tytuł</TableHead>
                <TableHead>Wydarzenie</TableHead>
                <TableHead>Zgłoszenia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map(f => {
                const counts = countMap[f.id] || { total: 0, paid: 0 };
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.title}</TableCell>
                    <TableCell className="text-sm">
                      {f.events?.title || '—'}
                      {f.events?.start_time && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(f.events.start_time).toLocaleDateString('pl-PL')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{counts.total} zapisanych</Badge>
                      {counts.paid > 0 && <Badge className="ml-1 bg-green-600 text-white">{counts.paid} opłaconych</Badge>}
                    </TableCell>
                    <TableCell>
                      {f.is_active ? <Badge className="bg-green-600 text-white">Aktywny</Badge> : <Badge variant="outline">Wyłączony</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => copyLink(f.slug)} title="Kopiuj link">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => window.open(`/event-form/${f.slug}`, '_blank')} title="Podgląd">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setViewSubmissionsFor(f)} title="Zgłoszenia">
                        <ListChecks className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate({ id: f.id, is_active: !f.is_active })} title={f.is_active ? 'Wyłącz' : 'Włącz'}>
                        {f.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(f)} title="Edytuj">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm(`Usunąć formularz „${f.title}"? Wszystkie zgłoszenia zostaną zachowane jeśli zaznaczysz CASCADE w bazie.`)) {
                          deleteMutation.mutate(f.id);
                        }
                      }} title="Usuń">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {(creating || editing) && (
        <EventFormEditor
          open={creating || !!editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          initial={editing}
        />
      )}
    </div>
  );
};
