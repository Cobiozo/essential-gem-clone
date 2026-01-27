import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Save, Loader2, Eye, Megaphone, Video, Users, AlertCircle } from 'lucide-react';
import { NewsTicker } from '@/components/news-ticker';
import { Checkbox } from '@/components/ui/checkbox';

interface TickerSettings {
  id: string;
  is_enabled: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  source_webinars: boolean;
  source_team_meetings: boolean;
  source_announcements: boolean;
  source_important_banners: boolean;
  animation_mode: 'scroll' | 'rotate' | 'static';
  scroll_speed: number;
  rotate_interval: number;
  background_color: string | null;
  text_color: string | null;
}

interface TickerItem {
  id: string;
  content: string;
  short_description: string | null;
  icon: string;
  thumbnail_url: string | null;
  link_url: string | null;
  is_active: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  priority: number;
  is_important: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const ICON_OPTIONS = [
  { value: 'Megaphone', label: 'Megafon' },
  { value: 'Info', label: 'Info' },
  { value: 'AlertCircle', label: 'Alert' },
  { value: 'Star', label: 'Gwiazdka' },
  { value: 'Bell', label: 'Dzwonek' },
  { value: 'Gift', label: 'Prezent' },
  { value: 'Heart', label: 'Serce' },
  { value: 'Zap', label: 'Błyskawica' },
  { value: 'Trophy', label: 'Trofeum' },
  { value: 'Sparkles', label: 'Iskry' },
];

export const NewsTickerManagement: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TickerSettings | null>(null);
  const [items, setItems] = useState<TickerItem[]>([]);
  const [editingItem, setEditingItem] = useState<TickerItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    content: '',
    short_description: '',
    icon: 'Megaphone',
    thumbnail_url: '',
    link_url: '',
    visible_to_clients: true,
    visible_to_partners: true,
    visible_to_specjalista: true,
    priority: 0,
    is_important: false,
    start_date: '',
    end_date: '',
  });

  // Fetch settings and items
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('news_ticker_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsError) {
        console.error('Error fetching settings:', settingsError);
      } else {
        setSettings(settingsData as TickerSettings);
      }

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('news_ticker_items')
        .select('*')
        .order('priority', { ascending: false });

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
      } else {
        setItems(itemsData as TickerItem[]);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Save settings
  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('news_ticker_settings')
      .update({
        is_enabled: settings.is_enabled,
        visible_to_clients: settings.visible_to_clients,
        visible_to_partners: settings.visible_to_partners,
        visible_to_specjalista: settings.visible_to_specjalista,
        source_webinars: settings.source_webinars,
        source_team_meetings: settings.source_team_meetings,
        source_announcements: settings.source_announcements,
        source_important_banners: settings.source_important_banners,
        animation_mode: settings.animation_mode,
        scroll_speed: settings.scroll_speed,
        rotate_interval: settings.rotate_interval,
        background_color: settings.background_color || null,
        text_color: settings.text_color || null,
      })
      .eq('id', settings.id);

    setSaving(false);

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać ustawień',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Zapisano',
        description: 'Ustawienia zostały zaktualizowane',
      });
    }
  };

  // Add new item
  const addItem = async () => {
    const { data, error } = await supabase
      .from('news_ticker_items')
      .insert({
        content: newItem.content,
        short_description: newItem.short_description || null,
        icon: newItem.icon,
        thumbnail_url: newItem.thumbnail_url || null,
        link_url: newItem.link_url || null,
        visible_to_clients: newItem.visible_to_clients,
        visible_to_partners: newItem.visible_to_partners,
        visible_to_specjalista: newItem.visible_to_specjalista,
        priority: newItem.priority,
        is_important: newItem.is_important,
        start_date: newItem.start_date || null,
        end_date: newItem.end_date || null,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać komunikatu',
        variant: 'destructive',
      });
    } else {
      setItems([data as TickerItem, ...items]);
      setShowAddDialog(false);
      setNewItem({
        content: '',
        short_description: '',
        icon: 'Megaphone',
        thumbnail_url: '',
        link_url: '',
        visible_to_clients: true,
        visible_to_partners: true,
        visible_to_specjalista: true,
        priority: 0,
        is_important: false,
        start_date: '',
        end_date: '',
      });
      toast({
        title: 'Dodano',
        description: 'Komunikat został dodany',
      });
    }
  };

  // Update item
  const updateItem = async (item: TickerItem) => {
    const { error } = await supabase
      .from('news_ticker_items')
      .update({
        content: item.content,
        short_description: item.short_description,
        icon: item.icon,
        thumbnail_url: item.thumbnail_url,
        link_url: item.link_url,
        is_active: item.is_active,
        visible_to_clients: item.visible_to_clients,
        visible_to_partners: item.visible_to_partners,
        visible_to_specjalista: item.visible_to_specjalista,
        priority: item.priority,
        is_important: item.is_important,
        start_date: item.start_date,
        end_date: item.end_date,
      })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować komunikatu',
        variant: 'destructive',
      });
    } else {
      setItems(items.map(i => i.id === item.id ? item : i));
      setEditingItem(null);
      toast({
        title: 'Zapisano',
        description: 'Komunikat został zaktualizowany',
      });
    }
  };

  // Delete item
  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('news_ticker_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć komunikatu',
        variant: 'destructive',
      });
    } else {
      setItems(items.filter(i => i.id !== id));
      toast({
        title: 'Usunięto',
        description: 'Komunikat został usunięty',
      });
    }
  };

  // Toggle item active status
  const toggleItemActive = async (item: TickerItem) => {
    const updatedItem = { ...item, is_active: !item.is_active };
    await updateItem(updatedItem);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pasek Informacyjny (News Ticker)</h2>
          <p className="text-muted-foreground">
            Zarządzaj komunikatami wyświetlanymi w pasku informacyjnym na dashboardzie
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          <TabsTrigger value="items">Komunikaty ({items.length})</TabsTrigger>
          <TabsTrigger value="preview">Podgląd</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia główne</CardTitle>
              <CardDescription>Konfiguracja widoczności i źródeł danych</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Włączony</Label>
                  <p className="text-sm text-muted-foreground">Wyświetlaj pasek informacyjny na dashboardzie</p>
                </div>
                <Switch
                  checked={settings?.is_enabled ?? false}
                  onCheckedChange={(checked) => setSettings(s => s ? { ...s, is_enabled: checked } : null)}
                />
              </div>

              {/* Role visibility */}
              <div className="space-y-3">
                <Label>Widoczność dla ról</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visible_clients"
                      checked={settings?.visible_to_clients ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, visible_to_clients: !!checked } : null)}
                    />
                    <label htmlFor="visible_clients" className="text-sm">Klienci</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visible_partners"
                      checked={settings?.visible_to_partners ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, visible_to_partners: !!checked } : null)}
                    />
                    <label htmlFor="visible_partners" className="text-sm">Partnerzy</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visible_specjalista"
                      checked={settings?.visible_to_specjalista ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, visible_to_specjalista: !!checked } : null)}
                    />
                    <label htmlFor="visible_specjalista" className="text-sm">Specjaliści</label>
                  </div>
                </div>
              </div>

              {/* Data sources */}
              <div className="space-y-3">
                <Label>Źródła danych</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source_announcements"
                      checked={settings?.source_announcements ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, source_announcements: !!checked } : null)}
                    />
                    <label htmlFor="source_announcements" className="text-sm flex items-center gap-2">
                      <Megaphone className="h-4 w-4" />
                      Komunikaty admina
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source_webinars"
                      checked={settings?.source_webinars ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, source_webinars: !!checked } : null)}
                    />
                    <label htmlFor="source_webinars" className="text-sm flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Webinary (najbliższe 7 dni)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source_meetings"
                      checked={settings?.source_team_meetings ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, source_team_meetings: !!checked } : null)}
                    />
                    <label htmlFor="source_meetings" className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Spotkania zespołowe (najbliższe 7 dni)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source_banners"
                      checked={settings?.source_important_banners ?? false}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, source_important_banners: !!checked } : null)}
                    />
                    <label htmlFor="source_banners" className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Ważne informacje (bannery)
                    </label>
                  </div>
                </div>
              </div>

              {/* Animation settings */}
              <div className="space-y-4">
                <Label>Animacja</Label>
                <Select
                  value={settings?.animation_mode ?? 'scroll'}
                  onValueChange={(value) => setSettings(s => s ? { ...s, animation_mode: value as 'scroll' | 'rotate' | 'static' } : null)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scroll">Przewijanie (marquee)</SelectItem>
                    <SelectItem value="rotate">Rotacja (zmiana co X sekund)</SelectItem>
                    <SelectItem value="static">Statyczny</SelectItem>
                  </SelectContent>
                </Select>

                {settings?.animation_mode === 'scroll' && (
                  <div className="space-y-2">
                    <Label>Prędkość przewijania: {settings.scroll_speed} px/s</Label>
                    <Slider
                      value={[settings.scroll_speed]}
                      onValueChange={([value]) => setSettings(s => s ? { ...s, scroll_speed: value } : null)}
                      min={20}
                      max={150}
                      step={10}
                      className="w-[300px]"
                    />
                  </div>
                )}

                {settings?.animation_mode === 'rotate' && (
                  <div className="space-y-2">
                    <Label>Interwał rotacji: {settings.rotate_interval}s</Label>
                    <Slider
                      value={[settings.rotate_interval]}
                      onValueChange={([value]) => setSettings(s => s ? { ...s, rotate_interval: value } : null)}
                      min={2}
                      max={15}
                      step={1}
                      className="w-[300px]"
                    />
                  </div>
                )}
              </div>

              <Button onClick={saveSettings} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Zapisz ustawienia
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj komunikat
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nowy komunikat</DialogTitle>
                  <DialogDescription>Dodaj nowy komunikat do paska informacyjnego</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Treść *</Label>
                    <Textarea
                      value={newItem.content}
                      onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                      placeholder="Treść komunikatu..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Krótki opis (dla tickera, max 120 znaków)</Label>
                    <Input
                      value={newItem.short_description}
                      onChange={(e) => setNewItem({ ...newItem, short_description: e.target.value.slice(0, 120) })}
                      placeholder="Krótka wersja komunikatu..."
                    />
                    <p className="text-xs text-muted-foreground">{newItem.short_description.length}/120</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ikona</Label>
                      <Select
                        value={newItem.icon}
                        onValueChange={(value) => setNewItem({ ...newItem, icon: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priorytet</Label>
                      <Input
                        type="number"
                        value={newItem.priority}
                        onChange={(e) => setNewItem({ ...newItem, priority: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Link (opcjonalny)</Label>
                    <Input
                      value={newItem.link_url}
                      onChange={(e) => setNewItem({ ...newItem, link_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="new_important"
                      checked={newItem.is_important}
                      onCheckedChange={(checked) => setNewItem({ ...newItem, is_important: !!checked })}
                    />
                    <label htmlFor="new_important" className="text-sm">Oznacz jako ważny (wyróżnienie kolorem)</label>
                  </div>
                  <div className="space-y-2">
                    <Label>Widoczność dla ról</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={newItem.visible_to_clients}
                          onCheckedChange={(checked) => setNewItem({ ...newItem, visible_to_clients: !!checked })}
                        />
                        <span className="text-sm">Klienci</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={newItem.visible_to_partners}
                          onCheckedChange={(checked) => setNewItem({ ...newItem, visible_to_partners: !!checked })}
                        />
                        <span className="text-sm">Partnerzy</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={newItem.visible_to_specjalista}
                          onCheckedChange={(checked) => setNewItem({ ...newItem, visible_to_specjalista: !!checked })}
                        />
                        <span className="text-sm">Specjaliści</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data rozpoczęcia</Label>
                      <Input
                        type="datetime-local"
                        value={newItem.start_date}
                        onChange={(e) => setNewItem({ ...newItem, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data zakończenia</Label>
                      <Input
                        type="datetime-local"
                        value={newItem.end_date}
                        onChange={(e) => setNewItem({ ...newItem, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Anuluj</Button>
                  <Button onClick={addItem} disabled={!newItem.content}>Dodaj</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Brak komunikatów. Kliknij "Dodaj komunikat" aby utworzyć pierwszy.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <Card key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.is_important && (
                            <Badge variant="destructive" className="text-xs">Ważny</Badge>
                          )}
                          {!item.is_active && (
                            <Badge variant="secondary" className="text-xs">Nieaktywny</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">Priorytet: {item.priority}</Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{item.short_description || item.content}</p>
                        {item.short_description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                        )}
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                          {item.visible_to_clients && <span>Klienci</span>}
                          {item.visible_to_partners && <span>Partnerzy</span>}
                          {item.visible_to_specjalista && <span>Specjaliści</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => toggleItemActive(item)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edytuj komunikat</DialogTitle>
              </DialogHeader>
              {editingItem && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Treść *</Label>
                    <Textarea
                      value={editingItem.content}
                      onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Krótki opis</Label>
                    <Input
                      value={editingItem.short_description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, short_description: e.target.value.slice(0, 120) })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ikona</Label>
                      <Select
                        value={editingItem.icon}
                        onValueChange={(value) => setEditingItem({ ...editingItem, icon: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priorytet</Label>
                      <Input
                        type="number"
                        value={editingItem.priority}
                        onChange={(e) => setEditingItem({ ...editingItem, priority: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Link</Label>
                    <Input
                      value={editingItem.link_url || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, link_url: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={editingItem.is_important}
                      onCheckedChange={(checked) => setEditingItem({ ...editingItem, is_important: !!checked })}
                    />
                    <span className="text-sm">Oznacz jako ważny</span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingItem(null)}>Anuluj</Button>
                <Button onClick={() => editingItem && updateItem(editingItem)}>Zapisz</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Podgląd paska informacyjnego
              </CardTitle>
              <CardDescription>
                Tak będzie wyglądał pasek na dashboardzie (widok admina - wszystkie komunikaty)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-lg p-4">
                <NewsTicker />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewsTickerManagement;
