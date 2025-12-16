import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, GripVertical, Save, Eye } from 'lucide-react';
import type { 
  CookieConsentSettings, 
  CookieBannerSettings, 
  CookieCategory,
  CookieBannerColors 
} from '@/types/cookies';
import {
  LAYOUT_TYPES,
  POSITIONS,
  PREFERENCE_CENTER_TYPES,
  THEMES,
  CONSENT_TEMPLATES,
  DEFAULT_COLORS,
  DARK_COLORS,
} from '@/types/cookies';

export function CookieConsentManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<CookieConsentSettings | null>(null);
  const [bannerSettings, setBannerSettings] = useState<CookieBannerSettings | null>(null);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [consentStats, setConsentStats] = useState({ total: 0, accepted: 0, rejected: 0 });
  
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [settingsRes, bannerRes, categoriesRes, statsRes] = await Promise.all([
        supabase.from('cookie_consent_settings').select('*').single(),
        supabase.from('cookie_banner_settings').select('*').single(),
        supabase.from('cookie_categories').select('*').order('position'),
        supabase.from('user_cookie_consents').select('consents'),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data as CookieConsentSettings);
      }
      
      if (bannerRes.data) {
        const data = bannerRes.data;
        setBannerSettings({
          ...data,
          colors: (typeof data.colors === 'string' ? JSON.parse(data.colors) : data.colors) as CookieBannerColors,
        } as CookieBannerSettings);
      }
      
      if (categoriesRes.data) {
        setCategories(categoriesRes.data as CookieCategory[]);
      }

      // Calculate stats
      if (statsRes.data) {
        const total = statsRes.data.length;
        let accepted = 0;
        let rejected = 0;
        
        statsRes.data.forEach((record: { consents: Record<string, boolean> }) => {
          const consents = record.consents;
          const values = Object.values(consents);
          const hasNonNecessary = values.some(v => v === true);
          if (hasNonNecessary) accepted++;
          else rejected++;
        });
        
        setConsentStats({ total, accepted, rejected });
      }
    } catch (error) {
      console.error('Error loading cookie settings:', error);
      toast({ title: 'Błąd', description: 'Nie udało się załadować ustawień', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings || !bannerSettings) return;
    
    setIsSaving(true);
    try {
      await Promise.all([
        supabase.from('cookie_consent_settings').update(settings).eq('id', settings.id),
        supabase.from('cookie_banner_settings').update({
          ...bannerSettings,
          colors: JSON.parse(JSON.stringify(bannerSettings.colors)),
        }).eq('id', bannerSettings.id),
      ]);
      
      toast({ title: 'Zapisano', description: 'Ustawienia zostały zapisane' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zapisać ustawień', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveCategory(category: CookieCategory) {
    try {
      await supabase.from('cookie_categories').update(category).eq('id', category.id);
      toast({ title: 'Zapisano', description: 'Kategoria została zapisana' });
    } catch (error) {
      console.error('Error saving category:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zapisać kategorii', variant: 'destructive' });
    }
  }

  async function addCategory() {
    try {
      const newPosition = categories.length;
      const { data, error } = await supabase
        .from('cookie_categories')
        .insert({ 
          name: 'Nowa kategoria', 
          description: 'Opis kategorii',
          position: newPosition 
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setCategories([...categories, data as CookieCategory]);
        toast({ title: 'Dodano', description: 'Nowa kategoria została dodana' });
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast({ title: 'Błąd', description: 'Nie udało się dodać kategorii', variant: 'destructive' });
    }
  }

  async function deleteCategory(id: string) {
    try {
      await supabase.from('cookie_categories').delete().eq('id', id);
      setCategories(categories.filter(c => c.id !== id));
      toast({ title: 'Usunięto', description: 'Kategoria została usunięta' });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć kategorii', variant: 'destructive' });
    }
  }

  function updateCategory(id: string, updates: Partial<CookieCategory>) {
    setCategories(categories.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  function updateColors(key: keyof CookieBannerColors, value: string) {
    if (!bannerSettings) return;
    setBannerSettings({
      ...bannerSettings,
      colors: { ...bannerSettings.colors, [key]: value }
    });
  }

  function applyTheme(theme: string) {
    if (!bannerSettings) return;
    
    let colors = bannerSettings.colors;
    if (theme === 'light') colors = DEFAULT_COLORS;
    else if (theme === 'dark') colors = DARK_COLORS;
    
    setBannerSettings({
      ...bannerSettings,
      theme: theme as CookieBannerSettings['theme'],
      colors,
    });
  }

  if (isLoading) {
    return <div className="p-4">Ładowanie...</div>;
  }

  if (!settings || !bannerSettings) {
    return <div className="p-4">Błąd ładowania ustawień</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Zarządzanie Cookies</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Ukryj podgląd' : 'Podgląd'}
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="general">Ogólne</TabsTrigger>
          <TabsTrigger value="layout">Układ</TabsTrigger>
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="colors">Kolory</TabsTrigger>
          <TabsTrigger value="categories">Kategorie</TabsTrigger>
          <TabsTrigger value="stats">Statystyki</TabsTrigger>
        </TabsList>

        {/* GENERAL TAB */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia ogólne</CardTitle>
              <CardDescription>Podstawowe ustawienia modułu cookie consent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Włącz moduł Cookie Consent</Label>
                  <p className="text-sm text-muted-foreground">Banner będzie wyświetlany użytkownikom</p>
                </div>
                <Switch
                  checked={settings.is_active}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Szablon zgody</Label>
                <Select
                  value={settings.consent_template}
                  onValueChange={(value) => setSettings({ ...settings, consent_template: value as CookieConsentSettings['consent_template'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSENT_TEMPLATES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Czas wygaśnięcia zgody (dni)</Label>
                <Input
                  type="number"
                  value={settings.consent_expiration_days}
                  onChange={(e) => setSettings({ ...settings, consent_expiration_days: parseInt(e.target.value) || 365 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Przeładuj stronę po zgodzie</Label>
                  <p className="text-sm text-muted-foreground">Odświeża stronę po zapisaniu preferencji</p>
                </div>
                <Switch
                  checked={settings.reload_on_consent}
                  onCheckedChange={(checked) => setSettings({ ...settings, reload_on_consent: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Geo-targeting</Label>
                  <p className="text-sm text-muted-foreground">Wyświetlaj tylko w wybranych krajach</p>
                </div>
                <Switch
                  checked={settings.geo_targeting_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, geo_targeting_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LAYOUT TAB */}
        <TabsContent value="layout">
          <Card>
            <CardHeader>
              <CardTitle>Układ bannera</CardTitle>
              <CardDescription>Wybierz typ i pozycję bannera</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Typ bannera</Label>
                <Select
                  value={bannerSettings.layout_type}
                  onValueChange={(value) => setBannerSettings({ ...bannerSettings, layout_type: value as CookieBannerSettings['layout_type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pozycja</Label>
                <Select
                  value={bannerSettings.position}
                  onValueChange={(value) => setBannerSettings({ ...bannerSettings, position: value as CookieBannerSettings['position'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Typ Preference Center</Label>
                <Select
                  value={bannerSettings.preference_center_type}
                  onValueChange={(value) => setBannerSettings({ ...bannerSettings, preference_center_type: value as CookieBannerSettings['preference_center_type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREFERENCE_CENTER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Przycisk zamknięcia</Label>
                  <p className="text-sm text-muted-foreground">Pokaż przycisk X</p>
                </div>
                <Switch
                  checked={bannerSettings.show_close_button}
                  onCheckedChange={(checked) => setBannerSettings({ ...bannerSettings, show_close_button: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Kategorie na pierwszej warstwie</Label>
                  <p className="text-sm text-muted-foreground">Pokaż checkboxy kategorii od razu</p>
                </div>
                <Switch
                  checked={bannerSettings.categories_on_first_layer}
                  onCheckedChange={(checked) => setBannerSettings({ ...bannerSettings, categories_on_first_layer: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Przycisk powrotu (Revisit)</Label>
                  <p className="text-sm text-muted-foreground">Pływający przycisk po udzieleniu zgody</p>
                </div>
                <Switch
                  checked={bannerSettings.revisit_button_enabled}
                  onCheckedChange={(checked) => setBannerSettings({ ...bannerSettings, revisit_button_enabled: checked })}
                />
              </div>

              {bannerSettings.revisit_button_enabled && (
                <div className="space-y-2">
                  <Label>Pozycja przycisku Revisit</Label>
                  <Select
                    value={bannerSettings.revisit_button_position}
                    onValueChange={(value) => setBannerSettings({ ...bannerSettings, revisit_button_position: value as CookieBannerSettings['revisit_button_position'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-left">Dół-lewo</SelectItem>
                      <SelectItem value="bottom-right">Dół-prawo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTENT TAB */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Treść bannera</CardTitle>
              <CardDescription>Edytuj teksty i przyciski</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tytuł</Label>
                <Input
                  value={bannerSettings.title || ''}
                  onChange={(e) => setBannerSettings({ ...bannerSettings, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Wiadomość</Label>
                <Textarea
                  value={bannerSettings.message || ''}
                  onChange={(e) => setBannerSettings({ ...bannerSettings, message: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>URL Polityki Prywatności</Label>
                <Input
                  value={bannerSettings.privacy_policy_url || ''}
                  onChange={(e) => setBannerSettings({ ...bannerSettings, privacy_policy_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>URL własnego logo</Label>
                <Input
                  value={bannerSettings.custom_logo_url || ''}
                  onChange={(e) => setBannerSettings({ ...bannerSettings, custom_logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tekst "Akceptuj wszystkie"</Label>
                  <Input
                    value={bannerSettings.accept_all_text || ''}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, accept_all_text: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tekst "Odrzuć wszystkie"</Label>
                  <Input
                    value={bannerSettings.reject_all_text || ''}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, reject_all_text: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tekst "Dostosuj"</Label>
                  <Input
                    value={bannerSettings.customize_text || ''}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, customize_text: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tekst "Zapisz preferencje"</Label>
                  <Input
                    value={bannerSettings.save_preferences_text || ''}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, save_preferences_text: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tekst "Polityka prywatności"</Label>
                  <Input
                    value={bannerSettings.read_more_text || ''}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, read_more_text: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tekst przycisku Revisit</Label>
                  <Input
                    value={bannerSettings.revisit_button_text || ''}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, revisit_button_text: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={bannerSettings.show_accept_all}
                    onCheckedChange={(checked) => setBannerSettings({ ...bannerSettings, show_accept_all: checked })}
                  />
                  <Label>Pokaż "Akceptuj"</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={bannerSettings.show_reject_all}
                    onCheckedChange={(checked) => setBannerSettings({ ...bannerSettings, show_reject_all: checked })}
                  />
                  <Label>Pokaż "Odrzuć"</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={bannerSettings.show_customize}
                    onCheckedChange={(checked) => setBannerSettings({ ...bannerSettings, show_customize: checked })}
                  />
                  <Label>Pokaż "Dostosuj"</Label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Pokaż branding</Label>
                  <p className="text-sm text-muted-foreground">"Powered by Pure Life CMS"</p>
                </div>
                <Switch
                  checked={bannerSettings.show_branding}
                  onCheckedChange={(checked) => setBannerSettings({ ...bannerSettings, show_branding: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COLORS TAB */}
        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>Kolory i motyw</CardTitle>
              <CardDescription>Personalizuj wygląd bannera</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Motyw</Label>
                <Select
                  value={bannerSettings.theme}
                  onValueChange={applyTheme}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tło</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bannerSettings.colors.background}
                      onChange={(e) => updateColors('background', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={bannerSettings.colors.background}
                      onChange={(e) => updateColors('background', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Obramowanie</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bannerSettings.colors.border}
                      onChange={(e) => updateColors('border', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={bannerSettings.colors.border}
                      onChange={(e) => updateColors('border', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tytuł</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bannerSettings.colors.title}
                      onChange={(e) => updateColors('title', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={bannerSettings.colors.title}
                      onChange={(e) => updateColors('title', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tekst</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bannerSettings.colors.text}
                      onChange={(e) => updateColors('text', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={bannerSettings.colors.text}
                      onChange={(e) => updateColors('text', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Przycisk główny (tło)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bannerSettings.colors.buttonPrimaryBg}
                      onChange={(e) => updateColors('buttonPrimaryBg', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={bannerSettings.colors.buttonPrimaryBg}
                      onChange={(e) => updateColors('buttonPrimaryBg', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Przycisk główny (tekst)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bannerSettings.colors.buttonPrimaryText}
                      onChange={(e) => updateColors('buttonPrimaryText', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={bannerSettings.colors.buttonPrimaryText}
                      onChange={(e) => updateColors('buttonPrimaryText', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Przycisk dodatkowy (tło)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bannerSettings.colors.buttonSecondaryBg}
                      onChange={(e) => updateColors('buttonSecondaryBg', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={bannerSettings.colors.buttonSecondaryBg}
                      onChange={(e) => updateColors('buttonSecondaryBg', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Przycisk dodatkowy (tekst)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bannerSettings.colors.buttonSecondaryText}
                      onChange={(e) => updateColors('buttonSecondaryText', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={bannerSettings.colors.buttonSecondaryText}
                      onChange={(e) => updateColors('buttonSecondaryText', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Toggle włączony</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bannerSettings.colors.toggleOn}
                      onChange={(e) => updateColors('toggleOn', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={bannerSettings.colors.toggleOn}
                      onChange={(e) => updateColors('toggleOn', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Toggle wyłączony</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bannerSettings.colors.toggleOff}
                      onChange={(e) => updateColors('toggleOff', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={bannerSettings.colors.toggleOff}
                      onChange={(e) => updateColors('toggleOff', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kolor linków</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={bannerSettings.colors.link}
                    onChange={(e) => updateColors('link', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={bannerSettings.colors.link}
                    onChange={(e) => updateColors('link', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Własny CSS</Label>
                <Textarea
                  value={bannerSettings.custom_css || ''}
                  onChange={(e) => setBannerSettings({ ...bannerSettings, custom_css: e.target.value })}
                  placeholder=".cookie-banner { ... }"
                  rows={5}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Kategorie cookies</CardTitle>
              <CardDescription>Zarządzaj kategoriami plików cookie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={addCategory} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Dodaj kategorię
              </Button>

              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {categories.map((category, index) => (
                    <Card key={category.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="cursor-grab">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Nazwa</Label>
                              <Input
                                value={category.name}
                                onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                                onBlur={() => saveCategory(categories.find(c => c.id === category.id)!)}
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={category.is_necessary}
                                  onCheckedChange={(checked) => {
                                    updateCategory(category.id, { is_necessary: checked });
                                    saveCategory({ ...category, is_necessary: checked });
                                  }}
                                />
                                <Label className="text-xs">Wymagana</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={category.is_hidden}
                                  onCheckedChange={(checked) => {
                                    updateCategory(category.id, { is_hidden: checked });
                                    saveCategory({ ...category, is_hidden: checked });
                                  }}
                                />
                                <Label className="text-xs">Ukryta</Label>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Opis</Label>
                            <Textarea
                              value={category.description || ''}
                              onChange={(e) => updateCategory(category.id, { description: e.target.value })}
                              onBlur={() => saveCategory(categories.find(c => c.id === category.id)!)}
                              rows={2}
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCategory(category.id)}
                          disabled={category.is_necessary}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Statystyki zgód</CardTitle>
              <CardDescription>Analiza udzielonych zgód cookie</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold">{consentStats.total}</p>
                  <p className="text-sm text-muted-foreground">Wszystkie zgody</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{consentStats.accepted}</p>
                  <p className="text-sm text-muted-foreground">Zaakceptowane</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold text-red-600">{consentStats.rejected}</p>
                  <p className="text-sm text-muted-foreground">Odrzucone</p>
                </Card>
              </div>

              {consentStats.total > 0 && (
                <div className="mt-6">
                  <Label>Procent akceptacji</Label>
                  <div className="w-full bg-muted rounded-full h-4 mt-2">
                    <div 
                      className="bg-green-600 h-4 rounded-full transition-all"
                      style={{ width: `${(consentStats.accepted / consentStats.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {((consentStats.accepted / consentStats.total) * 100).toFixed(1)}% użytkowników zaakceptowało cookies
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Live Preview */}
      {showPreview && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Podgląd na żywo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-muted rounded-lg p-8 min-h-[300px]">
              <div 
                className={`
                  ${bannerSettings.layout_type === 'box' ? 'max-w-md' : 'w-full'}
                  ${bannerSettings.layout_type === 'popup' ? 'max-w-lg mx-auto' : ''}
                  p-4 rounded-lg shadow-lg border
                `}
                style={{
                  backgroundColor: bannerSettings.colors.background,
                  borderColor: bannerSettings.colors.border,
                }}
              >
                {bannerSettings.custom_logo_url && (
                  <img src={bannerSettings.custom_logo_url} alt="Logo" className="h-8 mb-3" />
                )}
                <h3 className="font-semibold text-lg mb-2" style={{ color: bannerSettings.colors.title }}>
                  {bannerSettings.title}
                </h3>
                <p className="text-sm mb-4" style={{ color: bannerSettings.colors.text }}>
                  {bannerSettings.message}
                </p>
                <div className="flex flex-wrap gap-2">
                  {bannerSettings.show_accept_all && (
                    <Button
                      size="sm"
                      style={{ 
                        backgroundColor: bannerSettings.colors.buttonPrimaryBg,
                        color: bannerSettings.colors.buttonPrimaryText,
                      }}
                    >
                      {bannerSettings.accept_all_text}
                    </Button>
                  )}
                  {bannerSettings.show_reject_all && (
                    <Button
                      size="sm"
                      variant="outline"
                      style={{ 
                        backgroundColor: bannerSettings.colors.buttonSecondaryBg,
                        color: bannerSettings.colors.buttonSecondaryText,
                        borderColor: bannerSettings.colors.border,
                      }}
                    >
                      {bannerSettings.reject_all_text}
                    </Button>
                  )}
                  {bannerSettings.show_customize && (
                    <Button
                      size="sm"
                      variant="outline"
                      style={{ 
                        backgroundColor: bannerSettings.colors.buttonSecondaryBg,
                        color: bannerSettings.colors.buttonSecondaryText,
                        borderColor: bannerSettings.colors.border,
                      }}
                    >
                      {bannerSettings.customize_text}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
