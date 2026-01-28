import React, { useState, useEffect } from 'react';
import { useFormProtection } from '@/hooks/useFormProtection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, EyeOff, AlertTriangle, Calendar, CalendarX, Image, ChevronDown, Link, Type, Palette } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { MediaUpload } from '@/components/MediaUpload';
import { IconPicker } from '@/components/cms/IconPicker';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

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
  scheduled_date: string | null;
  expiration_date: string | null;
  image_url: string | null;
  animation_type: string;
  animation_intensity: string;
  title_bold: boolean;
  title_large: boolean;
  title_accent_color: boolean;
  title_underline: boolean;
  title_shadow: boolean;
  title_custom_color: string | null;
  button_enabled: boolean;
  button_text: string | null;
  button_url: string | null;
  button_color: string | null;
  button_icon: string | null;
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
  const [titleStyleOpen, setTitleStyleOpen] = useState(false);
  const [buttonConfigOpen, setButtonConfigOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: 'Ważna Informacja',
    content: '',
    visible_to_clients: true,
    visible_to_partners: true,
    visible_to_specjalista: true,
    display_frequency: 'once',
    priority: 0,
    scheduled_date: '',
    expiration_date: '',
    image_url: '',
    animation_type: 'fade-in',
    animation_intensity: 'subtle',
    title_bold: true,
    title_large: false,
    title_accent_color: false,
    title_underline: false,
    title_shadow: false,
    title_custom_color: '',
    button_enabled: false,
    button_text: '',
    button_url: '',
    button_color: '#10b981',
    button_icon: '',
  });

  // Protect form from page refresh on tab switch
  useFormProtection(isDialogOpen);

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
      const bannerData = {
        title: formData.title,
        content: formData.content,
        visible_to_clients: formData.visible_to_clients,
        visible_to_partners: formData.visible_to_partners,
        visible_to_specjalista: formData.visible_to_specjalista,
        display_frequency: formData.display_frequency,
        priority: formData.priority,
        scheduled_date: formData.scheduled_date ? new Date(formData.scheduled_date).toISOString() : null,
        expiration_date: formData.expiration_date ? new Date(formData.expiration_date).toISOString() : null,
        image_url: formData.image_url || null,
        animation_type: formData.animation_type,
        animation_intensity: formData.animation_intensity,
        title_bold: formData.title_bold,
        title_large: formData.title_large,
        title_accent_color: formData.title_accent_color,
        title_underline: formData.title_underline,
        title_shadow: formData.title_shadow,
        title_custom_color: formData.title_custom_color || null,
        button_enabled: formData.button_enabled,
        button_text: formData.button_text || null,
        button_url: formData.button_url || null,
        button_color: formData.button_color || null,
        button_icon: formData.button_icon || null,
        updated_at: new Date().toISOString()
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('important_info_banners')
          .update(bannerData)
          .eq('id', editingBanner.id);

        if (error) throw error;
        toast.success('Baner zaktualizowany');
      } else {
        const { error } = await supabase
          .from('important_info_banners')
          .insert({
            ...bannerData,
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
      priority: banner.priority,
      scheduled_date: banner.scheduled_date ? banner.scheduled_date.slice(0, 16) : '',
      expiration_date: banner.expiration_date ? banner.expiration_date.slice(0, 16) : '',
      image_url: banner.image_url || '',
      animation_type: banner.animation_type || 'fade-in',
      animation_intensity: banner.animation_intensity || 'subtle',
      title_bold: banner.title_bold ?? true,
      title_large: banner.title_large ?? false,
      title_accent_color: banner.title_accent_color ?? false,
      title_underline: banner.title_underline ?? false,
      title_shadow: banner.title_shadow ?? false,
      title_custom_color: banner.title_custom_color || '',
      button_enabled: banner.button_enabled ?? false,
      button_text: banner.button_text || '',
      button_url: banner.button_url || '',
      button_color: banner.button_color || '#10b981',
      button_icon: banner.button_icon || '',
    });
    setTitleStyleOpen(false);
    setButtonConfigOpen(banner.button_enabled ?? false);
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
      priority: 0,
      scheduled_date: '',
      expiration_date: '',
      image_url: '',
      animation_type: 'fade-in',
      animation_intensity: 'subtle',
      title_bold: true,
      title_large: false,
      title_accent_color: false,
      title_underline: false,
      title_shadow: false,
      title_custom_color: '',
      button_enabled: false,
      button_text: '',
      button_url: '',
      button_color: '#10b981',
      button_icon: '',
    });
    setTitleStyleOpen(false);
    setButtonConfigOpen(false);
  };

  const isScheduled = (banner: InfoBanner) => {
    if (!banner.scheduled_date) return false;
    return new Date(banner.scheduled_date) > new Date();
  };

  const isExpired = (banner: InfoBanner) => {
    if (!banner.expiration_date) return false;
    return new Date(banner.expiration_date) < new Date();
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingBanner ? 'Edytuj baner' : 'Nowy baner informacyjny'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Title with styling */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tytuł</Label>
                      <Collapsible open={titleStyleOpen} onOpenChange={setTitleStyleOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                            <Type className="h-3 w-3" />
                            Stylizacja
                            <ChevronDown className={`h-3 w-3 transition-transform ${titleStyleOpen ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    </div>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ważna Informacja"
                    />
                    <Collapsible open={titleStyleOpen} onOpenChange={setTitleStyleOpen}>
                      <CollapsibleContent className="space-y-3 pt-3 border-t mt-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={formData.title_bold}
                              onCheckedChange={(c) => setFormData({ ...formData, title_bold: c })}
                            />
                            <span className="text-sm">Pogrubiony</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={formData.title_large}
                              onCheckedChange={(c) => setFormData({ ...formData, title_large: c })}
                            />
                            <span className="text-sm">Duży rozmiar</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={formData.title_underline}
                              onCheckedChange={(c) => setFormData({ ...formData, title_underline: c })}
                            />
                            <span className="text-sm">Podkreślenie</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={formData.title_shadow}
                              onCheckedChange={(c) => setFormData({ ...formData, title_shadow: c })}
                            />
                            <span className="text-sm">Cień</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={formData.title_accent_color}
                              onCheckedChange={(c) => setFormData({ ...formData, title_accent_color: c, title_custom_color: c ? '' : formData.title_custom_color })}
                            />
                            <span className="text-sm">Kolor akcentu</span>
                          </div>
                        </div>
                        {!formData.title_accent_color && (
                          <div className="space-y-2">
                            <Label className="text-xs">Własny kolor tytułu</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={formData.title_custom_color || '#000000'}
                                onChange={(e) => setFormData({ ...formData, title_custom_color: e.target.value })}
                                className="w-12 h-8 p-1 cursor-pointer"
                              />
                              <Input
                                value={formData.title_custom_color}
                                onChange={(e) => setFormData({ ...formData, title_custom_color: e.target.value })}
                                placeholder="#000000"
                                className="flex-1"
                              />
                              {formData.title_custom_color && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFormData({ ...formData, title_custom_color: '' })}
                                >
                                  Resetuj
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  <div className="space-y-2">
                    <Label>Treść komunikatu (edytor tekstowy)</Label>
                    <div className="border rounded-md">
                      <RichTextEditor
                        value={formData.content}
                        onChange={(value) => setFormData({ ...formData, content: value })}
                        compact
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Obrazek (opcjonalnie)
                    </Label>
                    <MediaUpload
                      onMediaUploaded={(url) => setFormData({ ...formData, image_url: url })}
                      currentMediaUrl={formData.image_url}
                      currentMediaType="image"
                      allowedTypes={['image']}
                      compact
                    />
                  </div>

                  {/* Button configuration */}
                  <Collapsible open={buttonConfigOpen} onOpenChange={setButtonConfigOpen}>
                    <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.button_enabled}
                          onCheckedChange={(c) => {
                            setFormData({ ...formData, button_enabled: c });
                            if (c) setButtonConfigOpen(true);
                          }}
                        />
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <Link className="h-4 w-4" />
                          Dodaj przycisk z linkiem
                        </Label>
                      </div>
                      {formData.button_enabled && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 h-7">
                            <Palette className="h-3 w-3" />
                            Edytuj
                            <ChevronDown className={`h-3 w-3 transition-transform ${buttonConfigOpen ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    <CollapsibleContent className="space-y-3 pt-3">
                      {formData.button_enabled && (
                        <div className="space-y-4 p-3 border rounded-lg bg-background">
                          <div className="space-y-2">
                            <Label>Tekst przycisku</Label>
                            <Input
                              value={formData.button_text}
                              onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                              placeholder="Dowiedz się więcej"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>URL (link docelowy)</Label>
                            <Input
                              value={formData.button_url}
                              onChange={(e) => setFormData({ ...formData, button_url: e.target.value })}
                              placeholder="https://example.com lub /strona"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Kolor przycisku</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  value={formData.button_color || '#10b981'}
                                  onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                                  className="w-12 h-9 p-1 cursor-pointer"
                                />
                                <Input
                                  value={formData.button_color}
                                  onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                                  placeholder="#10b981"
                                  className="flex-1"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Ikona (opcjonalnie)</Label>
                              <IconPicker
                                value={formData.button_icon}
                                onChange={(icon) => setFormData({ ...formData, button_icon: icon })}
                              />
                            </div>
                          </div>
                          {/* Preview */}
                          {formData.button_text && (
                            <div className="pt-2 border-t">
                              <Label className="text-xs text-muted-foreground mb-2 block">Podgląd przycisku:</Label>
                              <Button
                                style={{ backgroundColor: formData.button_color || '#10b981' }}
                                className="text-white"
                                disabled
                              >
                                {formData.button_icon && (
                                  <span className="mr-2">
                                    {(() => {
                                      const iconName = formData.button_icon;
                                      const LucideIcons = require('lucide-react');
                                      const IconComponent = LucideIcons[iconName];
                                      return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
                                    })()}
                                  </span>
                                )}
                                {formData.button_text}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data publikacji
                      </Label>
                      <Input
                        type="datetime-local"
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pozostaw puste = aktywny od razu
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CalendarX className="h-4 w-4" />
                        Data wygaśnięcia
                      </Label>
                      <Input
                        type="datetime-local"
                        value={formData.expiration_date}
                        onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pozostaw puste = bez wygaśnięcia
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Częstotliwość wyświetlania</Label>
                      <Select
                        value={formData.display_frequency}
                        onValueChange={(v) => setFormData({ ...formData, display_frequency: v })}
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
                      <Label>Priorytet</Label>
                      <Input
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Widoczność dla ról</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.visible_to_clients}
                          onCheckedChange={(c) => setFormData({ ...formData, visible_to_clients: c })}
                        />
                        <span className="text-sm">Klienci</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.visible_to_partners}
                          onCheckedChange={(c) => setFormData({ ...formData, visible_to_partners: c })}
                        />
                        <span className="text-sm">Partnerzy</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.visible_to_specjalista}
                          onCheckedChange={(c) => setFormData({ ...formData, visible_to_specjalista: c })}
                        />
                        <span className="text-sm">Specjaliści</span>
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
                      {banner.image_url && (
                        <img 
                          src={banner.image_url} 
                          alt="" 
                          className="w-16 h-16 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-medium truncate">{banner.title}</h4>
                          {banner.is_active ? (
                            isExpired(banner) ? (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded flex items-center gap-1">
                                <CalendarX className="h-3 w-3" />
                                Wygasły
                              </span>
                            ) : isScheduled(banner) ? (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Zaplanowany
                              </span>
                            ) : (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Aktywny</span>
                            )
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Nieaktywny</span>
                          )}
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {banner.display_frequency === 'once' ? 'Jednorazowo' : 'Każde logowanie'}
                          </span>
                        </div>
                        {banner.scheduled_date && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Publikacja: {format(new Date(banner.scheduled_date), 'dd MMM yyyy, HH:mm', { locale: pl })}
                          </p>
                        )}
                        {banner.expiration_date && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Wygasa: {format(new Date(banner.expiration_date), 'dd MMM yyyy, HH:mm', { locale: pl })}
                          </p>
                        )}
                        <div 
                          className="text-sm text-muted-foreground line-clamp-2 mb-2"
                          dangerouslySetInnerHTML={{ __html: banner.content }}
                        />
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
