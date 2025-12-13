import React, { useState, useEffect } from 'react';
import { Link2, Plus, Pencil, Trash2, Save, X, Copy, Check, Image, ExternalLink, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MediaUpload } from '@/components/MediaUpload';

interface Reflink {
  id: string;
  target_role: string;
  reflink_code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  title: string | null;
  image_url: string | null;
  link_url: string | null;
  link_type: string;
  visible_to_roles: string[];
  position: number;
}

const availableRoles = [
  { value: 'partner', label: 'Partner' },
  { value: 'specjalista', label: 'Specjalista' },
  { value: 'client', label: 'Klient' },
];

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
    title: '',
    image_url: '',
    link_url: '',
    link_type: 'reflink',
    visible_to_roles: ['partner', 'specjalista'] as string[],
    position: 0,
  });
  const { toast } = useToast();

  const roleLabels: Record<string, string> = {
    klient: 'Klient',
    partner: 'Partner',
    specjalista: 'Specjalista',
  };

  const linkTypeLabels: Record<string, string> = {
    reflink: 'Reflink (rejestracja)',
    internal: 'Link wewnętrzny',
    external: 'Link zewnętrzny',
  };

  useEffect(() => {
    fetchReflinks();
  }, []);

  const fetchReflinks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reflinks')
      .select('*')
      .order('target_role')
      .order('position');

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

  const getLinkDisplay = (reflink: Reflink) => {
    if (reflink.link_type === 'reflink') {
      return getFullReflink(reflink.reflink_code);
    }
    return reflink.link_url || '';
  };

  const handleCopy = async (reflink: Reflink) => {
    const fullUrl = getLinkDisplay(reflink);
    await navigator.clipboard.writeText(fullUrl);
    setCopiedId(reflink.id);
    toast({
      title: 'Skopiowano!',
      description: fullUrl,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddReflink = async () => {
    if (newReflink.link_type === 'reflink' && !newReflink.reflink_code.trim()) {
      toast({
        title: 'Błąd',
        description: 'Kod reflinku jest wymagany',
        variant: 'destructive',
      });
      return;
    }

    if ((newReflink.link_type === 'internal' || newReflink.link_type === 'external') && !newReflink.link_url.trim()) {
      toast({
        title: 'Błąd',
        description: 'URL linku jest wymagany',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('reflinks')
      .insert({
        target_role: newReflink.target_role,
        reflink_code: newReflink.reflink_code.trim() || `link-${Date.now()}`,
        description: newReflink.description.trim() || null,
        title: newReflink.title.trim() || null,
        image_url: newReflink.image_url.trim() || null,
        link_url: newReflink.link_url.trim() || null,
        link_type: newReflink.link_type,
        visible_to_roles: newReflink.visible_to_roles,
        position: newReflink.position,
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
      setNewReflink({ 
        target_role: 'klient', 
        reflink_code: '', 
        description: '',
        title: '',
        image_url: '',
        link_url: '',
        link_type: 'reflink',
        visible_to_roles: ['partner', 'specjalista'],
        position: 0,
      });
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
        title: editingReflink.title?.trim() || null,
        image_url: editingReflink.image_url?.trim() || null,
        link_url: editingReflink.link_url?.trim() || null,
        link_type: editingReflink.link_type,
        visible_to_roles: editingReflink.visible_to_roles,
        position: editingReflink.position,
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

  const toggleVisibleRole = (roles: string[], role: string): string[] => {
    if (roles.includes(role)) {
      return roles.filter(r => r !== role);
    }
    return [...roles, role];
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

  const ReflinksForm = ({ 
    data, 
    onChange, 
    isEdit = false 
  }: { 
    data: typeof newReflink | Reflink; 
    onChange: (updates: Partial<typeof newReflink>) => void;
    isEdit?: boolean;
  }) => (
    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Przycisk (rola docelowa)</Label>
          <Select
            value={data.target_role}
            onValueChange={(value) => onChange({ target_role: value })}
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
          <Label>Typ linku</Label>
          <Select
            value={data.link_type}
            onValueChange={(value) => onChange({ link_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reflink">Reflink (rejestracja)</SelectItem>
              <SelectItem value="internal">Link wewnętrzny</SelectItem>
              <SelectItem value="external">Link zewnętrzny</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tytuł (wyświetlany)</Label>
        <Input
          value={data.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="np. Zarejestruj się jako partner"
        />
      </div>

      {data.link_type === 'reflink' && (
        <div className="space-y-2">
          <Label>Kod reflinku (unikalny)</Label>
          <Input
            value={data.reflink_code}
            onChange={(e) => onChange({ reflink_code: e.target.value })}
            placeholder="np. partner-jan-2024"
          />
          <p className="text-xs text-muted-foreground">
            Pełny link: {getFullReflink(data.reflink_code || 'kod')}
          </p>
        </div>
      )}

      {(data.link_type === 'internal' || data.link_type === 'external') && (
        <div className="space-y-2">
          <Label>URL linku</Label>
          <Input
            value={data.link_url || ''}
            onChange={(e) => onChange({ link_url: e.target.value })}
            placeholder={data.link_type === 'internal' ? '/strona' : 'https://example.com'}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Opis (opcjonalny)</Label>
        <Input
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="np. Link dla nowych partnerów"
        />
      </div>

      <div className="space-y-2">
        <Label>Grafika (opcjonalna)</Label>
        <MediaUpload
          onMediaUploaded={(url) => onChange({ image_url: url })}
          currentMediaUrl={data.image_url || ''}
          allowedTypes={['image']}
        />
      </div>

      <div className="space-y-2">
        <Label>Pozycja (kolejność)</Label>
        <Input
          type="number"
          value={data.position}
          onChange={(e) => onChange({ position: parseInt(e.target.value) || 0 })}
          min={0}
        />
      </div>

      <div className="space-y-2">
        <Label>Widoczny dla ról</Label>
        <div className="flex flex-wrap gap-3 pt-1">
          {availableRoles.map(role => (
            <div key={role.value} className="flex items-center gap-2">
              <Checkbox
                id={`role-${role.value}-${isEdit ? 'edit' : 'new'}`}
                checked={(data.visible_to_roles || []).includes(role.value)}
                onCheckedChange={() => 
                  onChange({ 
                    visible_to_roles: toggleVisibleRole(data.visible_to_roles || [], role.value) 
                  })
                }
              />
              <Label htmlFor={`role-${role.value}-${isEdit ? 'edit' : 'new'}`} className="cursor-pointer">
                {role.label}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Tylko zalogowani użytkownicy z wybranymi rolami zobaczą ten reflink
        </p>
      </div>
    </div>
  );

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
              Twórz i zarządzaj reflinkami z tytułami, grafikami i kontrolą widoczności
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj Reflink
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Dodaj nowy reflink</DialogTitle>
                <DialogDescription>
                  Utwórz nowy reflink z tytułem, grafiką i ustawieniami widoczności
                </DialogDescription>
              </DialogHeader>
              <ReflinksForm 
                data={newReflink} 
                onChange={(updates) => setNewReflink(prev => ({ ...prev, ...updates }))}
              />
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
                    <ReflinksForm 
                      data={editingReflink} 
                      onChange={(updates) => setEditingReflink(prev => prev ? { ...prev, ...updates } as Reflink : null)}
                      isEdit
                    />
                    <div className="flex items-center gap-2 pt-2 border-t">
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
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex gap-3 flex-1">
                      {reflink.image_url && (
                        <img 
                          src={reflink.image_url} 
                          alt="" 
                          className="w-12 h-12 rounded object-cover shrink-0"
                        />
                      )}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                            {roleLabels[reflink.target_role]}
                          </span>
                          <span className="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground">
                            {linkTypeLabels[reflink.link_type]}
                          </span>
                          {!reflink.is_active && (
                            <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground">
                              Nieaktywny
                            </span>
                          )}
                        </div>
                        {reflink.title && (
                          <p className="font-medium">{reflink.title}</p>
                        )}
                        <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                          {getLinkDisplay(reflink)}
                        </div>
                        {reflink.description && (
                          <p className="text-sm text-muted-foreground">{reflink.description}</p>
                        )}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Widoczny dla:</span>
                          {(reflink.visible_to_roles || []).map(role => (
                            <span key={role} className="text-xs px-1.5 py-0.5 rounded bg-muted">
                              {availableRoles.find(r => r.value === role)?.label || role}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
