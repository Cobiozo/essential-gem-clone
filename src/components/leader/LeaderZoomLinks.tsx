import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Video, Plus, Trash2, Pencil, Loader2, Save, X, Star } from 'lucide-react';
import { useMyLeaderZoomLinks, type LeaderZoomLink } from '@/hooks/useLeaderZoomLinks';
import { useToast } from '@/hooks/use-toast';

const LeaderZoomLinks: React.FC = () => {
  const { links, loading, createLink, updateLink, deleteLink } = useMyLeaderZoomLinks();
  const { toast } = useToast();

  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDefault, setNewDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editDefault, setEditDefault] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startEdit = (link: LeaderZoomLink) => {
    setEditingId(link.id);
    setEditLabel(link.label);
    setEditUrl(link.zoom_url);
    setEditDefault(link.is_default);
  };
  const cancelEdit = () => setEditingId(null);

  const handleCreate = async () => {
    if (!newLabel.trim() || !newUrl.trim()) {
      toast({ title: 'Uzupełnij etykietę i URL', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await createLink({
      label: newLabel.trim(),
      zoom_url: newUrl.trim(),
      is_default: newDefault,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Błąd zapisu', description: error.message, variant: 'destructive' });
      return;
    }
    setNewLabel('');
    setNewUrl('');
    setNewDefault(false);
    toast({ title: 'Link Zoom dodany' });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editLabel.trim() || !editUrl.trim()) {
      toast({ title: 'Uzupełnij etykietę i URL', variant: 'destructive' });
      return;
    }
    const { error } = await updateLink(editingId, {
      label: editLabel.trim(),
      zoom_url: editUrl.trim(),
      is_default: editDefault,
    });
    if (error) {
      toast({ title: 'Błąd zapisu', description: error.message, variant: 'destructive' });
      return;
    }
    setEditingId(null);
    toast({ title: 'Zaktualizowano' });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteLink(deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: 'Błąd usuwania', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Usunięto link' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Moje linki Zoom
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Zapisz swoje linki spotkań Zoom. Administrator może wybrać jeden z nich
            przy przypisywaniu konkretnego terminu wydarzenia.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nie masz jeszcze żadnych linków Zoom.
            </p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => {
                const isEditing = editingId === link.id;
                if (isEditing) {
                  return (
                    <div key={link.id} className="p-3 rounded-lg border bg-card space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Etykieta</Label>
                          <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">URL Zoom</Label>
                          <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} type="url" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch checked={editDefault} onCheckedChange={setEditDefault} />
                          <Label className="text-sm">Ustaw jako domyślny</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={cancelEdit}>
                            <X className="h-4 w-4 mr-1" /> Anuluj
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Save className="h-4 w-4 mr-1" /> Zapisz
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={link.id} className="p-3 rounded-lg border bg-card flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{link.label}</span>
                        {link.is_default && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-3 w-3" /> Domyślny
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{link.zoom_url}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(link)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <Label className="text-sm font-medium">Dodaj nowy link Zoom</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Etykieta (np. „Główny pokój")</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Główny pokój"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">URL Zoom</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  type="url"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newDefault} onCheckedChange={setNewDefault} />
              <Label className="text-sm">Ustaw jako domyślny</Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreate}
              disabled={saving || !newLabel.trim() || !newUrl.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {saving ? 'Zapisywanie…' : 'Dodaj link'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć link Zoom?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Jeśli link jest używany w terminach wydarzeń,
              administrator będzie musiał przypisać inny.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeaderZoomLinks;
