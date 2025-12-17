import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface InfoBanner {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  display_frequency: string;
  priority: number;
  created_at: string;
}

interface Statistics {
  totalBanners: number;
  activeBanners: number;
  totalDismissals: number;
}

export const ImportantInfoManagement: React.FC = () => {
  const [banners, setBanners] = useState<InfoBanner[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({ totalBanners: 0, activeBanners: 0, totalDismissals: 0 });
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<InfoBanner | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: 'Ważna Informacja',
    content: '',
    visible_to_clients: true,
    visible_to_partners: true,
    visible_to_specjalista: true,
    display_frequency: 'once',
    priority: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: bannersData, error: bannersError } = await supabase
        .from('important_info_banners')
        .select('*')
        .order('priority', { ascending: false });

      if (bannersError) throw bannersError;
      setBanners(bannersData || []);

      // Get dismissal stats
      const { count: dismissalCount } = await supabase
        .from('user_dismissed_banners')
        .select('*', { count: 'exact', head: true });

      setStatistics({
        totalBanners: bannersData?.length || 0,
        activeBanners: bannersData?.filter(b => b.is_active).length || 0,
        totalDismissals: dismissalCount || 0
      });
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast.error('Błąd podczas pobierania danych');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.content.trim()) {
      toast.error('Treść banera jest wymagana');
      return;
    }

    try {
      if (editingBanner) {
        const { error } = await supabase
          .from('important_info_banners')
          .update({
            title: formData.title,
            content: formData.content,
            visible_to_clients: formData.visible_to_clients,
            visible_to_partners: formData.visible_to_partners,
            visible_to_specjalista: formData.visible_to_specjalista,
            display_frequency: formData.display_frequency,
            priority: formData.priority,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBanner.id);

        if (error) throw error;
        toast.success('Baner zaktualizowany');
      } else {
        const { error } = await supabase
          .from('important_info_banners')
          .insert({
            title: formData.title,
            content: formData.content,
            visible_to_clients: formData.visible_to_clients,
            visible_to_partners: formData.visible_to_partners,
            visible_to_specjalista: formData.visible_to_specjalista,
            display_frequency: formData.display_frequency,
            priority: formData.priority,
            is_active: true
          });

        if (error) throw error;
        toast.success('Baner utworzony');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Błąd podczas zapisywania');
    }
  };

  const handleEdit = (banner: InfoBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      content: banner.content,
      visible_to_clients: banner.visible_to_clients,
      visible_to_partners: banner.visible_to_partners,
      visible_to_specjalista: banner.visible_to_specjalista,
      display_frequency: banner.display_frequency,
      priority: banner.priority
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (banner: InfoBanner) => {
    try {
      const { error } = await supabase
        .from('important_info_banners')
        .update({ is_active: !banner.is_active, updated_at: new Date().toISOString() })
        .eq('id', banner.id);

      if (error) throw error;
      toast.success(banner.is_active ? 'Baner dezaktywowany' : 'Baner aktywowany');
      fetchData();
    } catch (error) {
      console.error('Error toggling banner:', error);
      toast.error('Błąd podczas zmiany statusu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten baner?')) return;

    try {
      const { error } = await supabase
        .from('important_info_banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Baner usunięty');
      fetchData();
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Błąd podczas usuwania');
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      title: 'Ważna Informacja',
      content: '',
      visible_to_clients: true,
      visible_to_partners: true,
      visible_to_specjalista: true,
      display_frequency: 'once',
      priority: 0
    });
  };

  const getRolesBadges = (banner: InfoBanner) => {
    const roles = [];
    if (banner.visible_to_clients) roles.push('Klient');
    if (banner.visible_to_partners) roles.push('Partner');
    if (banner.visible_to_specjalista) roles.push('Specjalista');
    return roles;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="banners" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="banners">Banery informacyjne</TabsTrigger>
          <TabsTrigger value="stats">Statystyki</TabsTrigger>
        </TabsList>

        <TabsContent value="banners" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Zarządzanie banerami</h3>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Dodaj baner
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingBanner ? 'Edytuj baner' : 'Nowy baner informacyjny'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tytuł</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ważna Informacja"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Treść komunikatu</Label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Wpisz treść komunikatu..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Częstotliwość wyświetlania</Label>
                    <Select
                      value={formData.display_frequency}
                      onValueChange={(v) => setFormData({ ...formData, display_frequency: v as 'once' | 'every_login' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Jednorazowo</SelectItem>
                        <SelectItem value="every_login">Przy każdym logowaniu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priorytet (wyższy = wyświetlany wcześniej)</Label>
                    <Input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Widoczność dla ról</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Klienci</span>
                        <Switch
                          checked={formData.visible_to_clients}
                          onCheckedChange={(c) => setFormData({ ...formData, visible_to_clients: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Partnerzy</span>
                        <Switch
                          checked={formData.visible_to_partners}
                          onCheckedChange={(c) => setFormData({ ...formData, visible_to_partners: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Specjaliści</span>
                        <Switch
                          checked={formData.visible_to_specjalista}
                          onCheckedChange={(c) => setFormData({ ...formData, visible_to_specjalista: c })}
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSave} className="w-full">
                    {editingBanner ? 'Zapisz zmiany' : 'Utwórz baner'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {banners.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak banerów informacyjnych</p>
                <p className="text-sm mt-2">Kliknij "Dodaj baner", aby utworzyć pierwszy komunikat</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {banners.map((banner) => (
                <Card key={banner.id} className={!banner.is_active ? 'opacity-60' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium truncate">{banner.title}</h4>
                          {banner.is_active ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Aktywny</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Nieaktywny</span>
                          )}
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {banner.display_frequency === 'once' ? 'Jednorazowo' : 'Każde logowanie'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{banner.content}</p>
                        <div className="flex gap-1 flex-wrap">
                          {getRolesBadges(banner).map((role) => (
                            <span key={role} className="text-xs bg-muted px-2 py-0.5 rounded">{role}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleActive(banner)} title={banner.is_active ? 'Dezaktywuj' : 'Aktywuj'}>
                          {banner.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Wszystkie banery</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statistics.totalBanners}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aktywne banery</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{statistics.activeBanners}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Potwierdzenia użytkowników</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statistics.totalDismissals}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
