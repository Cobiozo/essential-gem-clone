import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Info, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface BannerForm { title: string; content: string; visible_to_partners: boolean; visible_to_specjalista: boolean; visible_to_clients: boolean; }
const emptyBanner: BannerForm = { title: '', content: '', visible_to_partners: true, visible_to_specjalista: true, visible_to_clients: true };

const LeaderImportantInfoView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyBanner);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['leader-banners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('important_info_banners').select('*').order('priority', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { title: form.title, content: form.content, visible_to_partners: form.visible_to_partners, visible_to_specjalista: form.visible_to_specjalista, visible_to_clients: form.visible_to_clients, is_active: true, display_frequency: 'always' };
      if (editingId) { const { error } = await supabase.from('important_info_banners').update(payload).eq('id', editingId); if (error) throw error; }
      else { const { error } = await supabase.from('important_info_banners').insert(payload); if (error) throw error; }
      await supabase.from('platform_team_actions').insert({ leader_user_id: user!.id, action_type: editingId ? 'edit_banner' : 'create_banner', new_value: form.title });
    },
    onSuccess: () => { toast({ title: 'Zapisano' }); queryClient.invalidateQueries({ queryKey: ['leader-banners'] }); setFormOpen(false); setEditingId(null); setForm(emptyBanner); },
    onError: (err: any) => { toast({ title: 'Błąd', description: err.message, variant: 'destructive' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('important_info_banners').update({ is_active: false }).eq('id', id); if (error) throw error; },
    onSuccess: () => { toast({ title: 'Usunięto' }); queryClient.invalidateQueries({ queryKey: ['leader-banners'] }); },
  });

  const openEdit = (b: any) => { setEditingId(b.id); setForm({ title: b.title, content: b.content, visible_to_partners: b.visible_to_partners, visible_to_specjalista: b.visible_to_specjalista, visible_to_clients: b.visible_to_clients }); setFormOpen(true); };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" />Ważne informacje</CardTitle><CardDescription>Twórz banery z ważnymi informacjami.</CardDescription></div>
          <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyBanner); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nowy baner</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : banners.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">Brak banerów</p> : (
          <div className="space-y-3">{banners.map(b => (
            <div key={b.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="font-medium text-sm">{b.title}</span>{!b.is_active && <Badge variant="outline" className="text-xs">Nieaktywny</Badge>}</div>
                <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.content}</p>
            </div>
          ))}</div>
        )}
      </CardContent>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Edytuj baner' : 'Nowy baner'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Tytuł</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Treść</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} /></div>
            <div className="space-y-2"><Label>Widoczność</Label><div className="flex gap-4">
              <label className="flex items-center gap-1 text-sm"><Checkbox checked={form.visible_to_partners} onCheckedChange={v => setForm(f => ({ ...f, visible_to_partners: !!v }))} />Partnerzy</label>
              <label className="flex items-center gap-1 text-sm"><Checkbox checked={form.visible_to_specjalista} onCheckedChange={v => setForm(f => ({ ...f, visible_to_specjalista: !!v }))} />Specjaliści</label>
              <label className="flex items-center gap-1 text-sm"><Checkbox checked={form.visible_to_clients} onCheckedChange={v => setForm(f => ({ ...f, visible_to_clients: !!v }))} />Klienci</label>
            </div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Anuluj</Button><Button onClick={() => saveMutation.mutate()} disabled={!form.title || !form.content || saveMutation.isPending}>{editingId ? 'Zapisz' : 'Utwórz'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LeaderImportantInfoView;
