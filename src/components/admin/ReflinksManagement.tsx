import React, { useState, useEffect } from 'react';
import { Link2, Plus, Pencil, Trash2, Save, X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Reflink {
  id: string;
  target_role: string;
  reflink_code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ReflinksManagement: React.FC = () => {
  const [reflinks, setReflinks] = useState<Reflink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReflink, setEditingReflink] = useState<Reflink | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newReflink, setNewReflink] = useState({
    target_role: 'klient',
    reflink_code: '',
    description: '',
  });
  const { toast } = useToast();

  const roleLabels: Record<string, string> = {
    klient: 'Klient',
    partner: 'Partner',
    specjalista: 'Specjalista',
  };

  useEffect(() => {
    fetchReflinks();
  }, []);

  const fetchReflinks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reflinks')
      .select('*')
      .order('target_role');

    if (error) {
      console.error('Error fetching reflinks:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać reflinków',
        variant: 'destructive',
      });
    } else {
      setReflinks(data || []);
    }
    setLoading(false);
  };

  const getFullReflink = (code: string) => {
    return `${window.location.origin}/auth?ref=${code}`;
  };

  const handleCopy = async (reflink: Reflink) => {
    const fullUrl = getFullReflink(reflink.reflink_code);
    await navigator.clipboard.writeText(fullUrl);
    setCopiedId(reflink.id);
    toast({
      title: 'Skopiowano!',
      description: fullUrl,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddReflink = async () => {
    if (!newReflink.reflink_code.trim()) {
      toast({
        title: 'Błąd',
        description: 'Kod reflinku jest wymagany',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('reflinks')
      .insert({
        target_role: newReflink.target_role,
        reflink_code: newReflink.reflink_code.trim(),
        description: newReflink.description.trim() || null,
        is_active: true,
      });

    if (error) {
      console.error('Error adding reflink:', error);
      toast({
        title: 'Błąd',
        description: error.message.includes('unique') 
          ? 'Kod reflinku już istnieje' 
          : 'Nie udało się dodać reflinku',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sukces',
        description: 'Reflink został dodany',
      });
      setShowAddDialog(false);
      setNewReflink({ target_role: 'klient', reflink_code: '', description: '' });
      fetchReflinks();
    }
  };

  const handleUpdateReflink = async () => {
    if (!editingReflink) return;

    const { error } = await supabase
      .from('reflinks')
      .update({
        target_role: editingReflink.target_role,
        reflink_code: editingReflink.reflink_code.trim(),
        description: editingReflink.description?.trim() || null,
        is_active: editingReflink.is_active,
      })
      .eq('id', editingReflink.id);

    if (error) {
      console.error('Error updating reflink:', error);
      toast({
        title: 'Błąd',
        description: error.message.includes('unique') 
          ? 'Kod reflinku już istnieje' 
          : 'Nie udało się zaktualizować reflinku',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sukces',
        description: 'Reflink został zaktualizowany',
      });
      setEditingReflink(null);
      fetchReflinks();
    }
  };

  const handleDeleteReflink = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten reflink?')) return;

    const { error } = await supabase
      .from('reflinks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reflink:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć reflinku',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sukces',
        description: 'Reflink został usunięty',
      });
      fetchReflinks();
    }
  };

  const handleToggleActive = async (reflink: Reflink) => {
    const { error } = await supabase
      .from('reflinks')
      .update({ is_active: !reflink.is_active })
      .eq('id', reflink.id);

    if (error) {
      console.error('Error toggling reflink:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zmienić statusu reflinku',
        variant: 'destructive',
      });
    } else {
      fetchReflinks();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Ładowanie...</p>
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
              <Link2 className="w-5 h-5" />
              Zarządzanie Reflinkami
            </CardTitle>
            <CardDescription>
              Twórz i zarządzaj reflinkami dla partnerów i specjalistów
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj Reflink
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj nowy reflink</DialogTitle>
                <DialogDescription>
                  Utwórz nowy reflink dla wybranej roli
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Rola docelowa</Label>
                  <Select
                    value={newReflink.target_role}
                    onValueChange={(value) => setNewReflink(prev => ({ ...prev, target_role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="klient">Klient</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="specjalista">Specjalista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kod reflinku (unikalny)</Label>
                  <Input
                    value={newReflink.reflink_code}
                    onChange={(e) => setNewReflink(prev => ({ ...prev, reflink_code: e.target.value }))}
                    placeholder="np. partner-jan-2024"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pełny link: {getFullReflink(newReflink.reflink_code || 'kod')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Opis (opcjonalny)</Label>
                  <Input
                    value={newReflink.description}
                    onChange={(e) => setNewReflink(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="np. Link dla Jana Kowalskiego"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleAddReflink}>
                  <Save className="w-4 h-4 mr-2" />
                  Zapisz
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {reflinks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Brak reflinków. Kliknij "Dodaj Reflink" aby utworzyć pierwszy.
          </p>
        ) : (
          <div className="space-y-3">
            {reflinks.map((reflink) => (
              <div
                key={reflink.id}
                className={`p-4 rounded-lg border ${
                  reflink.is_active 
                    ? 'border-border bg-card' 
                    : 'border-muted bg-muted/30 opacity-60'
                }`}
              >
                {editingReflink?.id === reflink.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Rola docelowa</Label>
                        <Select
                          value={editingReflink.target_role}
                          onValueChange={(value) => 
                            setEditingReflink(prev => prev ? { ...prev, target_role: value } : null)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="klient">Klient</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                            <SelectItem value="specjalista">Specjalista</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Kod reflinku</Label>
                        <Input
                          value={editingReflink.reflink_code}
                          onChange={(e) => 
                            setEditingReflink(prev => prev ? { ...prev, reflink_code: e.target.value } : null)
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Opis</Label>
                      <Input
                        value={editingReflink.description || ''}
                        onChange={(e) => 
                          setEditingReflink(prev => prev ? { ...prev, description: e.target.value } : null)
                        }
                        placeholder="Opis reflinku"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingReflink.is_active}
                        onCheckedChange={(checked) => 
                          setEditingReflink(prev => prev ? { ...prev, is_active: checked } : null)
                        }
                      />
                      <Label>Aktywny</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateReflink}>
                        <Save className="w-4 h-4 mr-2" />
                        Zapisz
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingReflink(null)}>
                        <X className="w-4 h-4 mr-2" />
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                          {roleLabels[reflink.target_role]}
                        </span>
                        {!reflink.is_active && (
                          <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground">
                            Nieaktywny
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                        {getFullReflink(reflink.reflink_code)}
                      </div>
                      {reflink.description && (
                        <p className="text-sm text-muted-foreground">{reflink.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(reflink)}
                      >
                        {copiedId === reflink.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Switch
                        checked={reflink.is_active}
                        onCheckedChange={() => handleToggleActive(reflink)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingReflink(reflink)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteReflink(reflink.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
