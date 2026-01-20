import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical, ExternalLink } from 'lucide-react';
import { icons as LucideIcons } from 'lucide-react';
import { IconPicker } from '@/components/cms/IconPicker';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SidebarFooterIcon {
  id: string;
  icon_name: string;
  title: string;
  url: string;
  icon_color: string | null;
  position: number;
  is_active: boolean;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_client: boolean;
  visible_to_specjalista: boolean;
}

interface SortableRowProps {
  icon: SidebarFooterIcon;
  onEdit: (icon: SidebarFooterIcon) => void;
  onDelete: (id: string) => void;
}

const SortableRow: React.FC<SortableRowProps> = ({ icon, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: icon.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Get icon component
  const IconComponent = (LucideIcons as Record<string, React.ElementType>)[icon.icon_name] || ExternalLink;

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <button {...attributes} {...listeners} className="cursor-grab p-1 hover:bg-muted rounded">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded flex items-center justify-center border"
            style={{ backgroundColor: icon.icon_color ? `${icon.icon_color}20` : undefined }}
          >
            <IconComponent 
              className="h-5 w-5" 
              style={{ color: icon.icon_color || 'currentColor' }} 
            />
          </div>
          <span className="font-medium">{icon.title}</span>
        </div>
      </TableCell>
      <TableCell className="max-w-[200px]">
        <span className="truncate block text-sm text-muted-foreground">{icon.url}</span>
      </TableCell>
      <TableCell>
        <div className="flex gap-1 flex-wrap">
          {icon.visible_to_admin && <Badge variant="outline" className="text-xs">Admin</Badge>}
          {icon.visible_to_partner && <Badge variant="outline" className="text-xs">Partner</Badge>}
          {icon.visible_to_client && <Badge variant="outline" className="text-xs">Klient</Badge>}
          {icon.visible_to_specjalista && <Badge variant="outline" className="text-xs">Spec.</Badge>}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={icon.is_active ? 'default' : 'secondary'}>
          {icon.is_active ? 'Aktywna' : 'Nieaktywna'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => onEdit(icon)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(icon.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const SidebarFooterIconsManagement: React.FC = () => {
  const { toast } = useToast();
  const [icons, setIcons] = useState<SidebarFooterIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIcon, setEditingIcon] = useState<SidebarFooterIcon | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    icon_name: 'ExternalLink',
    title: '',
    url: '',
    icon_color: '',
    is_active: true,
    visible_to_admin: true,
    visible_to_partner: true,
    visible_to_client: true,
    visible_to_specjalista: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchIcons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sidebar_footer_icons')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się pobrać ikon', variant: 'destructive' });
    } else {
      setIcons(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIcons();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = icons.findIndex(i => i.id === active.id);
    const newIndex = icons.findIndex(i => i.id === over.id);
    const newOrder = arrayMove(icons, oldIndex, newIndex);
    
    // Update local state optimistically
    setIcons(newOrder);

    // Update positions in database
    const updates = newOrder.map((icon, index) => ({
      id: icon.id,
      position: index,
    }));

    for (const update of updates) {
      await supabase
        .from('sidebar_footer_icons')
        .update({ position: update.position })
        .eq('id', update.id);
    }

    toast({ title: 'Kolejność zapisana' });
  };

  const openAddDialog = () => {
    setEditingIcon(null);
    setFormData({
      icon_name: 'ExternalLink',
      title: '',
      url: '',
      icon_color: '',
      is_active: true,
      visible_to_admin: true,
      visible_to_partner: true,
      visible_to_client: true,
      visible_to_specjalista: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (icon: SidebarFooterIcon) => {
    setEditingIcon(icon);
    setFormData({
      icon_name: icon.icon_name,
      title: icon.title,
      url: icon.url,
      icon_color: icon.icon_color || '',
      is_active: icon.is_active,
      visible_to_admin: icon.visible_to_admin,
      visible_to_partner: icon.visible_to_partner,
      visible_to_client: icon.visible_to_client,
      visible_to_specjalista: icon.visible_to_specjalista,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.url.trim()) {
      toast({ title: 'Błąd', description: 'Tytuł i URL są wymagane', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const payload = {
      icon_name: formData.icon_name,
      title: formData.title.trim(),
      url: formData.url.trim(),
      icon_color: formData.icon_color || null,
      is_active: formData.is_active,
      visible_to_admin: formData.visible_to_admin,
      visible_to_partner: formData.visible_to_partner,
      visible_to_client: formData.visible_to_client,
      visible_to_specjalista: formData.visible_to_specjalista,
    };

    if (editingIcon) {
      const { error } = await supabase
        .from('sidebar_footer_icons')
        .update(payload)
        .eq('id', editingIcon.id);

      if (error) {
        toast({ title: 'Błąd', description: 'Nie udało się zaktualizować ikony', variant: 'destructive' });
      } else {
        toast({ title: 'Zapisano' });
        setDialogOpen(false);
        fetchIcons();
      }
    } else {
      const position = icons.length;
      const { error } = await supabase
        .from('sidebar_footer_icons')
        .insert({ ...payload, position });

      if (error) {
        toast({ title: 'Błąd', description: 'Nie udało się dodać ikony', variant: 'destructive' });
      } else {
        toast({ title: 'Dodano ikonę' });
        setDialogOpen(false);
        fetchIcons();
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę ikonę?')) return;

    const { error } = await supabase
      .from('sidebar_footer_icons')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się usunąć ikony', variant: 'destructive' });
    } else {
      toast({ title: 'Usunięto' });
      fetchIcons();
    }
  };

  const SelectedIconPreview = (LucideIcons as Record<string, React.ElementType>)[formData.icon_name] || ExternalLink;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Ikony stopki paska bocznego</CardTitle>
          <CardDescription>
            Zarządzaj ikonami widocznymi w dolnej części paska bocznego dashboardu
          </CardDescription>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj ikonę
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
        ) : icons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Brak ikon. Kliknij "Dodaj ikonę" aby dodać pierwszą.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Ikona i tytuł</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Widoczność</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={icons.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {icons.map(icon => (
                    <SortableRow key={icon.id} icon={icon} onEdit={openEditDialog} onDelete={handleDelete} />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIcon ? 'Edytuj ikonę' : 'Dodaj nową ikonę'}</DialogTitle>
            <DialogDescription>
              Skonfiguruj ikonę, link i widoczność w pasku bocznym
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Icon picker */}
            <div className="space-y-2">
              <Label>Ikona</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded border flex items-center justify-center"
                  style={{ backgroundColor: formData.icon_color ? `${formData.icon_color}20` : undefined }}
                >
                  <SelectedIconPreview 
                    className="h-6 w-6" 
                    style={{ color: formData.icon_color || 'currentColor' }} 
                  />
                </div>
                <IconPicker
                  value={formData.icon_name}
                  onChange={(iconName) => setFormData(prev => ({ ...prev, icon_name: iconName || 'ExternalLink' }))}
                  trigger={
                    <Button variant="outline" size="sm">
                      Wybierz ikonę
                    </Button>
                  }
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Tytuł (tooltip)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="np. Facebook, WhatsApp, Instagram..."
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="color">Kolor ikony (opcjonalnie)</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.icon_color || '#000000'}
                  onChange={e => setFormData(prev => ({ ...prev, icon_color: e.target.value }))}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.icon_color}
                  onChange={e => setFormData(prev => ({ ...prev, icon_color: e.target.value }))}
                  placeholder="#1877F2"
                  className="flex-1"
                />
                {formData.icon_color && (
                  <Button variant="ghost" size="sm" onClick={() => setFormData(prev => ({ ...prev, icon_color: '' }))}>
                    Usuń
                  </Button>
                )}
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-3">
              <Label>Widoczność dla ról</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.visible_to_admin}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, visible_to_admin: checked }))}
                  />
                  <span className="text-sm">Admin</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.visible_to_partner}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, visible_to_partner: checked }))}
                  />
                  <span className="text-sm">Partner</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.visible_to_client}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, visible_to_client: checked }))}
                  />
                  <span className="text-sm">Klient</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.visible_to_specjalista}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, visible_to_specjalista: checked }))}
                  />
                  <span className="text-sm">Specjalista</span>
                </div>
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Aktywna</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SidebarFooterIconsManagement;
