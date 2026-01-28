import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical, ExternalLink, Upload, Image as ImageIcon, X } from 'lucide-react';
import { icons as LucideIcons } from 'lucide-react';
import { IconPicker } from '@/components/cms/IconPicker';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFormProtection } from '@/hooks/useFormProtection';

interface SidebarFooterIcon {
  id: string;
  icon_name: string;
  title: string;
  url: string;
  icon_color: string | null;
  image_url: string | null;
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

  // Get icon component or show image
  const IconComponent = (LucideIcons as Record<string, React.ElementType>)[icon.icon_name] || ExternalLink;
  const hasCustomImage = !!icon.image_url;

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
            className="w-8 h-8 rounded flex items-center justify-center border overflow-hidden"
            style={{ backgroundColor: !hasCustomImage && icon.icon_color ? `${icon.icon_color}20` : undefined }}
          >
            {hasCustomImage ? (
              <img src={icon.image_url!} alt={icon.title} className="w-full h-full object-contain" />
            ) : (
              <IconComponent 
                className="h-5 w-5" 
                style={{ color: icon.icon_color || 'currentColor' }} 
              />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{icon.title}</span>
            {hasCustomImage && <Badge variant="outline" className="text-xs w-fit">Własny obrazek</Badge>}
          </div>
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    icon_name: 'ExternalLink',
    title: '',
    url: '',
    icon_color: '',
    image_url: '',
    icon_type: 'lucide' as 'lucide' | 'custom',
    is_active: true,
    visible_to_admin: true,
    visible_to_partner: true,
    visible_to_client: true,
    visible_to_specjalista: true,
  });

  // Protect form from page refresh on tab switch
  useFormProtection(dialogOpen);

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
    
    setIcons(newOrder);

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
      image_url: '',
      icon_type: 'lucide',
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
      image_url: icon.image_url || '',
      icon_type: icon.image_url ? 'custom' : 'lucide',
      is_active: icon.is_active,
      visible_to_admin: icon.visible_to_admin,
      visible_to_partner: icon.visible_to_partner,
      visible_to_client: icon.visible_to_client,
      visible_to_specjalista: icon.visible_to_specjalista,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Błąd', description: 'Wybierz plik obrazu', variant: 'destructive' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Błąd', description: 'Maksymalny rozmiar pliku to 2MB', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('sidebar-icons')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('sidebar-icons')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }));
      toast({ title: 'Obrazek przesłany' });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message || 'Nie udało się przesłać obrazka', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (formData.image_url) {
      // Extract filename from URL
      const url = new URL(formData.image_url);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];

      // Try to delete from storage (ignore errors as file might not exist)
      await supabase.storage.from('sidebar-icons').remove([fileName]);
    }
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.url.trim()) {
      toast({ title: 'Błąd', description: 'Tytuł i URL są wymagane', variant: 'destructive' });
      return;
    }

    if (formData.icon_type === 'custom' && !formData.image_url) {
      toast({ title: 'Błąd', description: 'Prześlij własny obrazek lub wybierz ikonę Lucide', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const payload = {
      icon_name: formData.icon_name,
      title: formData.title.trim(),
      url: formData.url.trim(),
      icon_color: formData.icon_type === 'lucide' ? (formData.icon_color || null) : null,
      image_url: formData.icon_type === 'custom' ? formData.image_url : null,
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

    // Get icon to check for image
    const iconToDelete = icons.find(i => i.id === id);
    if (iconToDelete?.image_url) {
      const url = new URL(iconToDelete.image_url);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      await supabase.storage.from('sidebar-icons').remove([fileName]);
    }

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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIcon ? 'Edytuj ikonę' : 'Dodaj nową ikonę'}</DialogTitle>
            <DialogDescription>
              Skonfiguruj ikonę lub własny obrazek, link i widoczność w pasku bocznym
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Icon Type Selector */}
            <div className="space-y-3">
              <Label>Typ ikony</Label>
              <RadioGroup
                value={formData.icon_type}
                onValueChange={(value: 'lucide' | 'custom') => setFormData(prev => ({ ...prev, icon_type: value }))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lucide" id="lucide" />
                  <Label htmlFor="lucide" className="font-normal cursor-pointer">Ikona Lucide</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="font-normal cursor-pointer">Własny obrazek</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Lucide Icon Picker */}
            {formData.icon_type === 'lucide' && (
              <>
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
              </>
            )}

            {/* Custom Image Upload */}
            {formData.icon_type === 'custom' && (
              <div className="space-y-2">
                <Label>Własny obrazek/logo</Label>
                <div className="flex items-center gap-3">
                  {formData.image_url ? (
                    <div className="relative">
                      <div className="w-16 h-16 rounded border overflow-hidden bg-muted">
                        <img 
                          src={formData.image_url} 
                          alt="Preview" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded border border-dashed flex items-center justify-center bg-muted">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? 'Przesyłanie...' : 'Prześlij obrazek'}
                    </Button>
                    <span className="text-xs text-muted-foreground">Max 2MB, PNG/JPG/SVG</span>
                  </div>
                </div>
              </div>
            )}

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
