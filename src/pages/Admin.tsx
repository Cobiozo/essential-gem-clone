import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Pencil, Plus, Trash2, LogOut, Home, Save, ChevronUp, ChevronDown, Palette, Type, Settings2, Users, CheckCircle, Clock, Mail } from 'lucide-react';
import { MediaUpload } from '@/components/MediaUpload';
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
import { TextEditor } from '@/components/cms/TextEditor';
import { FontEditor } from '@/components/cms/FontEditor';
import { ColorSchemeEditor } from '@/components/cms/ColorSchemeEditor';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

interface CMSSection {
  id: string;
  title: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CMSItem {
  id: string;
  section_id: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  icon: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  media_url?: string | null;
  media_type?: string | null;
  media_alt_text?: string | null;
  text_formatting?: any;
  title_formatting?: any;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string | null;
  confirmation_sent_at?: string | null;
}

const Admin = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<CMSSection | null>(null);
  const [editingItem, setEditingItem] = useState<CMSItem | null>(null);
  const [editingSection, setEditingSection] = useState<CMSSection | null>(null);
  const [newItem, setNewItem] = useState({
    type: 'button',
    title: '',
    description: '',
    url: '',
    icon: '',
    media_url: '',
    media_type: '' as 'image' | 'video' | '',
    media_alt_text: '',
  });
  const [newSection, setNewSection] = useState({
    title: '',
    position: 0,
  });
  const [activeTab, setActiveTab] = useState("content");
  const [editingItemTextMode, setEditingItemTextMode] = useState(false);
  const [editingItemTitleMode, setEditingItemTitleMode] = useState(false);
  const [newItemTextMode, setNewItemTextMode] = useState(false);
  const [newItemTitleMode, setNewItemTitleMode] = useState(false);
  const [itemTextStyle, setItemTextStyle] = useState<any>(null);
  const [itemTitleStyle, setItemTitleStyle] = useState<any>(null);
  const [newItemTextStyle, setNewItemTextStyle] = useState<any>(null);
  const [newItemTitleStyle, setNewItemTitleStyle] = useState<any>(null);
  
  // Enable security preventions
  useSecurityPreventions();

  // User management functions
  const fetchUsers = async () => {
    if (activeTab !== 'users') return;
    
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_profiles_with_confirmation');

      if (error) throw error;
      console.log('fetchUsers RPC result:', { count: data?.length, sample: data?.[0] });
      setUsers((data as UserProfile[]) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować użytkowników.",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, role: newRole } : user
      ));
      
      toast({
        title: "Sukces",
        description: `Rola użytkownika została zmieniona na ${newRole === 'admin' ? 'Administrator' : 'Użytkownik'}.`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić roli użytkownika.",
        variant: "destructive",
      });
    }
  };

  const confirmUserEmail = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_confirm_user_email', {
        target_user_id: userId
      });

      if (error) {
        throw error;
      }

      if (data) {
        toast({
          title: "Sukces",
          description: "Email użytkownika został potwierdzony.",
        });
        // Refresh users list to show updated status
        fetchUsers();
      } else {
        toast({
          title: "Informacja",
          description: "Email był już wcześniej potwierdzony.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error confirming user email:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się potwierdzić emaila użytkownika.",
        variant: "destructive",
      });
    }
  };

  // Load users when switching to users tab
  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      fetchUsers();
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!isAdmin) {
      toast({
        title: "Przekierowanie",
        description: "Zostaniesz przekierowany na stronę Moje konto.",
        variant: "default",
      });
      navigate('/my-account');
      return;
    }

    fetchData();
  }, [user, isAdmin, navigate, toast]);

  const fetchData = async () => {
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .order('position');

      if (sectionsError) throw sectionsError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('cms_items')
        .select('*, text_formatting, title_formatting')
        .order('position');

      if (itemsError) throw itemsError;

      setSections(sectionsData || []);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching CMS data:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych CMS.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSection = async () => {
    try {
      const maxPosition = Math.max(...sections.map(s => s.position), 0);
      
      const { data, error } = await supabase
        .from('cms_sections')
        .insert({
          title: newSection.title,
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setSections([...sections, data]);
      setNewSection({ title: '', position: 0 });
      toast({
        title: "Sukces",
        description: "Nowa sekcja została utworzona.",
      });
    } catch (error) {
      console.error('Error creating section:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć sekcji.",
        variant: "destructive",
      });
    }
  };

  const deleteSection = async (sectionId: string) => {
    try {
      // First delete all items in the section
      const { error: itemsError } = await supabase
        .from('cms_items')
        .delete()
        .eq('section_id', sectionId);

      if (itemsError) throw itemsError;

      // Then delete the section
      const { error: sectionError } = await supabase
        .from('cms_sections')
        .delete()
        .eq('id', sectionId);

      if (sectionError) throw sectionError;

      setSections(sections.filter(s => s.id !== sectionId));
      setItems(items.filter(i => i.section_id !== sectionId));
      toast({
        title: "Sukces",
        description: "Sekcja została usunięta.",
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć sekcji.",
        variant: "destructive",
      });
    }
  };

  const moveSectionUp = async (sectionId: string) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex <= 0) return;

    const currentSection = sections[sectionIndex];
    const previousSection = sections[sectionIndex - 1];

    try {
      // Swap positions in database
      await Promise.all([
        supabase
          .from('cms_sections')
          .update({ position: previousSection.position })
          .eq('id', currentSection.id),
        supabase
          .from('cms_sections')
          .update({ position: currentSection.position })
          .eq('id', previousSection.id)
      ]);

      // Re-fetch data to ensure consistency
      await fetchData();
      
      toast({
        title: "Pozycja zmieniona",
        description: "Sekcja została przesunięta w górę.",
      });
    } catch (error) {
      console.error('Error moving section up:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić pozycji sekcji.",
        variant: "destructive",
      });
    }
  };

  const moveSectionDown = async (sectionId: string) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex >= sections.length - 1) return;

    const currentSection = sections[sectionIndex];
    const nextSection = sections[sectionIndex + 1];

    try {
      // Swap positions in database
      await Promise.all([
        supabase
          .from('cms_sections')
          .update({ position: nextSection.position })
          .eq('id', currentSection.id),
        supabase
          .from('cms_sections')
          .update({ position: currentSection.position })
          .eq('id', nextSection.id)
      ]);

      // Re-fetch data to ensure consistency
      await fetchData();
      
      toast({
        title: "Pozycja zmieniona", 
        description: "Sekcja została przesunięta w dół.",
      });
    } catch (error) {
      console.error('Error moving section down:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić pozycji sekcji.",
        variant: "destructive",
      });
    }
  };

  const updateSection = async (sectionId: string, updates: Partial<CMSSection>) => {
    try {
      const { error } = await supabase
        .from('cms_sections')
        .update(updates)
        .eq('id', sectionId);

      if (error) throw error;

      setSections(sections.map(s => s.id === sectionId ? { ...s, ...updates } : s));
      setEditingSection(null);
      toast({
        title: "Sukces",
        description: "Sekcja została zaktualizowana.",
      });
    } catch (error) {
      console.error('Error updating section:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować sekcji.",
        variant: "destructive",
      });
    }
  };

  const createItem = async (sectionId: string) => {
    try {
      const maxPosition = Math.max(...items.filter(i => i.section_id === sectionId).map(i => i.position), 0);
      
      console.log('Creating item with formatting:', {
        title_formatting: newItemTitleStyle,
        text_formatting: newItemTextStyle,
        item: newItem
      });

      const { data, error } = await supabase
        .from('cms_items')
        .insert({
          section_id: sectionId,
          ...newItem,
          position: maxPosition + 1,
          title_formatting: newItemTitleStyle,
          text_formatting: newItemTextStyle,
        })
        .select()
        .single();

      if (error) throw error;

      setItems([...items, data]);
      setNewItem({ 
        type: 'button', 
        title: '', 
        description: '', 
        url: '', 
        icon: '',
        media_url: '',
        media_type: '' as 'image' | 'video' | '',
        media_alt_text: '',
      });
      setNewItemTitleStyle(null);
      setNewItemTextStyle(null);
      setNewItemTitleMode(false);
      setNewItemTextMode(false);
      toast({
        title: "Sukces",
        description: "Element został dodany.",
      });
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać elementu.",
        variant: "destructive",
      });
    }
  };

  const updateItem = async (itemId: string, updates: Partial<CMSItem>) => {
    try {
      console.log('Updating item with data:', updates);
      
      const { error } = await supabase
        .from('cms_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.map(i => i.id === itemId ? { ...i, ...updates } : i));
      setEditingItem(null);
      toast({
        title: "Sukces",
        description: "Element został zaktualizowany.",
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować elementu.",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cms_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter(i => i.id !== itemId));
      toast({
        title: "Sukces",
        description: "Element został usunięty.",
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć elementu.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src={newPureLifeLogo} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Ładowanie panelu administracyjnego...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <img src={newPureLifeLogo} alt="Pure Life" className="w-6 h-6 sm:w-8 sm:h-8" />
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Panel CMS - Pure Life</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Badge variant="secondary" className="text-xs">Administrator</Badge>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => navigate('/')} className="flex-1 sm:flex-none">
                <Home className="w-4 h-4 mr-2" />
                Strona główna
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="flex-1 sm:flex-none">
                <LogOut className="w-4 h-4 mr-2" />
                Wyloguj
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* CMS Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Zawartość</span>
            </TabsTrigger>
            <TabsTrigger value="fonts" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Czcionki</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Kolory</span>
            </TabsTrigger>
            <TabsTrigger value="text-editor" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Edytor</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Użytkownicy</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            {/* Section Management */}
            <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Zarządzanie sekcjami</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj sekcję
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Dodaj nową sekcję</DialogTitle>
                  <DialogDescription className="text-sm">
                    Utwórz nową sekcję CMS
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label htmlFor="section-title" className="text-sm font-medium">Tytuł sekcji</Label>
                    <Input
                      id="section-title"
                      value={newSection.title}
                      onChange={(e) => setNewSection({...newSection, title: e.target.value})}
                      placeholder="Nazwa sekcji"
                      className="mt-1 h-10"
                    />
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={createSection} 
                    disabled={!newSection.title.trim()}
                    className="w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Utwórz sekcję
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:gap-8">
          {sections.map((section) => {
            const sectionItems = items.filter(i => i.section_id === section.id);
            
            return (
              <Card key={section.id}>
                <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <CardTitle className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 text-base sm:text-lg">
                            <span className="break-words">{section.title}</span>
                            <Badge variant={section.is_active ? "default" : "secondary"} className="w-fit">
                              {section.is_active ? "Aktywna" : "Nieaktywna"}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-1">
                            Pozycja: {section.position} | Elementów: {sectionItems.length}
                          </CardDescription>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => moveSectionUp(section.id)}
                              disabled={sections.findIndex(s => s.id === section.id) === 0}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => moveSectionDown(section.id)}
                              disabled={sections.findIndex(s => s.id === section.id) === sections.length - 1}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <Switch
                            checked={section.is_active}
                            onCheckedChange={(checked) => updateSection(section.id, { is_active: checked })}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={() => setEditingSection(section)} className="flex-1 sm:flex-none">
                          <Pencil className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Edytuj</span>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteSection(section.id)} className="flex-1 sm:flex-none">
                          <Trash2 className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Usuń</span>
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                              <Plus className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Dodaj element</span>
                              <span className="sm:hidden">Dodaj</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">Dodaj nowy element</DialogTitle>
                              <DialogDescription className="text-sm">
                                Dodaj nowy element do sekcji "{section.title}"
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                              <div>
                                <Label htmlFor="type" className="text-sm font-medium">Typ</Label>
                                <Select value={newItem.type} onValueChange={(value) => setNewItem({...newItem, type: value})}>
                                  <SelectTrigger className="mt-1 h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="button">Przycisk</SelectItem>
                                    <SelectItem value="info_text">Informacja</SelectItem>
                                    <SelectItem value="tip">Wskazówka</SelectItem>
                                    <SelectItem value="description">Opis</SelectItem>
                                    <SelectItem value="contact_info">Info kontaktowe</SelectItem>
                                    <SelectItem value="support_info">Info wsparcia</SelectItem>
                                    <SelectItem value="header_text">Tekst nagłówka</SelectItem>
                                    <SelectItem value="author">Autor</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                               <div>
                                 <div className="flex items-center justify-between mb-2">
                                   <Label htmlFor="title" className="text-sm font-medium">Tytuł</Label>
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => setNewItemTitleMode(!newItemTitleMode)}
                                     className="h-7"
                                   >
                                     <Type className="w-3 h-3 mr-1" />
                                     {newItemTitleMode ? 'Prosty' : 'Zaawansowany'}
                                   </Button>
                                 </div>
                                 
                                 {newItemTitleMode ? (
                                   <TextEditor
                                     initialText={newItem.title}
                                     initialStyle={newItemTitleStyle}
                                     onSave={(text, style) => {
                                       setNewItem({...newItem, title: text});
                                       setNewItemTitleStyle(style);
                                       setNewItemTitleMode(false);
                                     }}
                                     placeholder="Sformatuj tytuł za pomocą edytora..."
                                   />
                                 ) : (
                                   <Input
                                     id="title"
                                     value={newItem.title}
                                     onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                                     placeholder="Nazwa elementu"
                                     className="mt-1 h-10"
                                   />
                                 )}
                               </div>
                               <div>
                                 <div className="flex items-center justify-between mb-2">
                                   <Label htmlFor="description" className="text-sm font-medium">Opis</Label>
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => setNewItemTextMode(!newItemTextMode)}
                                     className="h-7"
                                   >
                                     <Type className="w-3 h-3 mr-1" />
                                     {newItemTextMode ? 'Prosty' : 'Zaawansowany'}
                                   </Button>
                                 </div>
                                 
                                 {newItemTextMode ? (
                                    <TextEditor
                                      initialText={newItem.description}
                                      initialStyle={newItemTextStyle}
                                      onSave={(text, style) => {
                                        console.log('New item text save:', { text, style });
                                        setNewItem({...newItem, description: text});
                                        setNewItemTextStyle(style);
                                        setNewItemTextMode(false);
                                        toast({
                                          title: "Tekst sformatowany",
                                          description: "Kliknij 'Zapisz zmiany' aby zapisać element",
                                        });
                                      }}
                                      placeholder="Sformatuj tekst za pomocą edytora..."
                                    />
                                 ) : (
                                   <Textarea
                                     id="description"
                                     value={newItem.description}
                                     onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                                     placeholder="Aby zaprosić nową osobę, kliknij przycisk udostępnij i podziel się materiałami."
                                     className="mt-1 min-h-[80px] resize-none"
                                     rows={3}
                                   />
                                 )}
                               </div>
                              <div>
                                <Label htmlFor="url" className="text-sm font-medium">URL</Label>
                                <Input
                                  id="url"
                                  value={newItem.url}
                                  onChange={(e) => setNewItem({...newItem, url: e.target.value})}
                                  placeholder="https://..."
                                  className="mt-1 h-10"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Plik multimedialny</Label>
                                <div className="mt-1">
                                  <MediaUpload
                                    onMediaUploaded={(url, type, altText) => setNewItem({
                                      ...newItem, 
                                      media_url: url, 
                                      media_type: type, 
                                      media_alt_text: altText || ''
                                    })}
                                    currentMediaUrl={newItem.media_url}
                                    currentMediaType={newItem.media_type as 'image' | 'video' | undefined}
                                    currentAltText={newItem.media_alt_text}
                                  />
                                </div>
                              </div>
                            </div>
                            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                              <Button onClick={() => createItem(section.id)} className="w-full sm:w-auto">
                                <Save className="w-4 h-4 mr-2" />
                                Zapisz zmiany
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {sectionItems.map((item) => (
                       <div key={item.id} className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg bg-gray-50/50">
                           <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                             <div className="flex-1 min-w-0">
                               <div className="flex flex-wrap items-center gap-2 mb-2">
                                 <Badge variant="outline" className="text-xs">{item.type}</Badge>
                                 <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                                   {item.is_active ? "Aktywny" : "Nieaktywny"}
                                 </Badge>
                               </div>
                               <h4 className="font-medium text-sm sm:text-base text-gray-900 mb-1 break-words">
                                 {item.title || 'Bez tytułu'}
                               </h4>
                               {item.description && (
                                 <p className="text-xs sm:text-sm text-gray-600 break-words line-clamp-3">
                                   {item.description.length > 100 
                                     ? `${item.description.substring(0, 100)}...` 
                                     : item.description
                                   }
                                 </p>
                               )}
                               {item.url && (
                                 <p className="text-xs text-blue-600 mt-1 break-all">
                                   {item.url.length > 50 ? `${item.url.substring(0, 50)}...` : item.url}
                                 </p>
                               )}
                             </div>
                           </div>
                           <div className="flex flex-wrap gap-2">
                             <Switch
                               checked={item.is_active}
                               onCheckedChange={(checked) => updateItem(item.id, { is_active: checked })}
                               className="mr-2"
                             />
                             <Button 
                               variant="outline" 
                               size="sm" 
                onClick={() => {
                  console.log('Setting editing item:', item);
                  console.log('Item formatting:', {
                    text_formatting: item.text_formatting,
                    title_formatting: item.title_formatting
                  });
                  setEditingItem(item);
                  setItemTextStyle(item.text_formatting);
                  setItemTitleStyle(item.title_formatting);
                  setEditingItemTextMode(false);
                  setEditingItemTitleMode(false);
                }}
                               className="flex-1 sm:flex-none"
                             >
                               <Pencil className="w-4 h-4 sm:mr-2" />
                               <span className="hidden sm:inline">Edytuj</span>
                             </Button>
                             <Button 
                               variant="destructive" 
                               size="sm" 
                               onClick={() => deleteItem(item.id)}
                               className="flex-1 sm:flex-none"
                             >
                               <Trash2 className="w-4 h-4 sm:mr-2" />
                               <span className="hidden sm:inline">Usuń</span>
                             </Button>
                           </div>
                       </div>
                     ))}
                     {sectionItems.length === 0 && (
                       <p className="text-center text-muted-foreground py-8">
                         Brak elementów w tej sekcji
                       </p>
                     )}
                   </div>
                </CardContent>
              </Card>
            );
          })}
            </div>
          </TabsContent>

          <TabsContent value="fonts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Type className="w-5 h-5" />
                  <span>Zarządzanie czcionkami</span>
                </CardTitle>
                <CardDescription>
                  Dostosuj czcionki używane w aplikacji
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FontEditor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Schemat kolorów</span>
                </CardTitle>
                <CardDescription>
                  Personalizuj kolorystykę aplikacji
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ColorSchemeEditor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text-editor">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Type className="w-5 h-5" />
                  <span>Edytor tekstu</span>
                </CardTitle>
                <CardDescription>
                  Zaawansowany edytor do formatowania treści
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TextEditor 
                  placeholder="Używaj tego edytora do formatowania zawartości..."
                  onSave={(text, style) => {
                    toast({
                      title: "Tekst sformatowany",
                      description: "Skopiuj sformatowany tekst do elementów CMS",
                    });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Zarządzanie użytkownikami</span>
                </CardTitle>
                <CardDescription>
                  Zarządzaj użytkownikami i ich rolami w systemie
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        Łączna liczba użytkowników: {users.length}
                      </p>
                      <Button variant="outline" size="sm" onClick={fetchUsers}>
                        Odśwież listę
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {users.map((userProfile) => (
                        <Card key={userProfile.id} className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                             <div className="space-y-1">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <span className="font-medium text-sm">{userProfile.email}</span>
                                 <Badge variant={userProfile.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                   {userProfile.role === 'admin' ? 'Administrator' : 'Użytkownik'}
                                 </Badge>
                                 {userProfile.email_confirmed_at ? (
                                   <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                                     <CheckCircle className="w-3 h-3 mr-1" />
                                     Email potwierdzony
                                   </Badge>
                                 ) : (
                                   <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                                     <Clock className="w-3 h-3 mr-1" />
                                     Oczekuje potwierdzenia
                                   </Badge>
                                 )}
                               </div>
                               <p className="text-xs text-muted-foreground">
                                 Utworzono: {new Date(userProfile.created_at).toLocaleDateString('pl-PL')}
                               </p>
                               {userProfile.email_confirmed_at && (
                                 <p className="text-xs text-muted-foreground">
                                   Email potwierdzony: {new Date(userProfile.email_confirmed_at).toLocaleDateString('pl-PL')}
                                 </p>
                               )}
                               <p className="text-xs text-muted-foreground">
                                 ID: {userProfile.user_id.slice(0, 8)}...
                               </p>
                             </div>
                            
                             <div className="flex flex-col sm:flex-row gap-2">
                               {!userProfile.email_confirmed_at && (
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => confirmUserEmail(userProfile.user_id)}
                                   className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                                 >
                                   <Mail className="w-3 h-3 mr-1" />
                                   Potwierdź email
                                 </Button>
                               )}
                               
                               {userProfile.role !== 'admin' ? (
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => updateUserRole(userProfile.user_id, 'admin')}
                                   className="text-xs"
                                 >
                                   <Users className="w-3 h-3 mr-1" />
                                   Awansuj na Admin
                                 </Button>
                               ) : userProfile.user_id === user?.id ? (
                                 <Badge variant="default" className="text-xs">
                                   Twoje konto
                                 </Badge>
                               ) : (
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => updateUserRole(userProfile.user_id, 'user')}
                                   className="text-xs"
                                 >
                                   <Users className="w-3 h-3 mr-1" />
                                   Zmień na Użytkownika
                                 </Button>
                               )}
                             </div>
                          </div>
                        </Card>
                      ))}
                      
                      {users.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Brak użytkowników w systemie</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => {
          console.log('Closing edit dialog');
          setEditingItem(null);
          setItemTextStyle(null);
          setItemTitleStyle(null);
          setEditingItemTextMode(false);
          setEditingItemTitleMode(false);
        }}>
          <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Edytuj element</DialogTitle>
              <DialogDescription className="text-sm">
                Modyfikuj dane elementu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="edit-type" className="text-sm font-medium">Typ</Label>
                <Select 
                  value={editingItem.type} 
                  onValueChange={(value) => setEditingItem({...editingItem, type: value})}
                >
                  <SelectTrigger className="mt-1 h-10">
                    <SelectValue />
                  </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="button">Przycisk</SelectItem>
                     <SelectItem value="info_text">Informacja</SelectItem>
                     <SelectItem value="tip">Wskazówka</SelectItem>
                     <SelectItem value="description">Opis</SelectItem>
                     <SelectItem value="contact_info">Info kontaktowe</SelectItem>
                     <SelectItem value="support_info">Info wsparcia</SelectItem>
                     <SelectItem value="header_text">Tekst nagłówka</SelectItem>
                     <SelectItem value="author">Autor</SelectItem>
                   </SelectContent>
                </Select>
              </div>
               <div>
                 <div className="flex items-center justify-between mb-2">
                   <Label htmlFor="edit-title" className="text-sm font-medium">Tytuł</Label>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setEditingItemTitleMode(!editingItemTitleMode)}
                     className="h-7"
                   >
                     <Type className="w-3 h-3 mr-1" />
                     {editingItemTitleMode ? 'Prosty' : 'Zaawansowany'}
                   </Button>
                 </div>
                 
                 {editingItemTitleMode ? (
                   <TextEditor
                     initialText={editingItem.title || ''}
                     initialStyle={itemTitleStyle}
                     onSave={(text, style) => {
                       setEditingItem({...editingItem, title: text});
                       setItemTitleStyle(style);
                       setEditingItemTitleMode(false);
                     }}
                     placeholder="Sformatuj tytuł za pomocą edytora..."
                   />
                 ) : (
                   <Input
                     id="edit-title"
                     value={editingItem.title || ''}
                     onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                     placeholder="Wskazówka"
                     className="mt-1 h-10"
                   />
                 )}
               </div>
               <div>
                 <div className="flex items-center justify-between mb-2">
                   <Label htmlFor="edit-description" className="text-sm font-medium">Opis</Label>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setEditingItemTextMode(!editingItemTextMode)}
                     className="h-7"
                   >
                     <Type className="w-3 h-3 mr-1" />
                     {editingItemTextMode ? 'Prosty' : 'Zaawansowany'}
                   </Button>
                 </div>
                 
                 {editingItemTextMode ? (
                   <TextEditor
                     initialText={editingItem.description || ''}
                     initialStyle={itemTextStyle}
                     onSave={(text, style) => {
                       console.log('Edit item text save:', { text, style });
                       setEditingItem({...editingItem, description: text});
                       setItemTextStyle(style);
                       setEditingItemTextMode(false);
                       toast({
                         title: "Tekst sformatowany",
                         description: "Kliknij 'Zapisz zmiany' aby zapisać element",
                       });
                     }}
                     placeholder="Sformatuj tekst za pomocą edytora..."
                   />
                 ) : (
                   <Textarea
                     id="edit-description"
                     value={editingItem.description || ''}
                     onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                     placeholder="Aby zaprosić nową osobę, kliknij przycisk udostępnij i podziel się materiałami."
                     className="mt-1 min-h-[80px] resize-none"
                     rows={3}
                   />
                 )}
               </div>
              <div>
                <Label htmlFor="edit-url" className="text-sm font-medium">URL</Label>
                <Input
                  id="edit-url"
                  value={editingItem.url || ''}
                  onChange={(e) => setEditingItem({...editingItem, url: e.target.value})}
                  placeholder="https://..."
                  className="mt-1 h-10"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Plik multimedialny</Label>
                <div className="mt-1">
                  <MediaUpload
                    onMediaUploaded={(url, type, altText) => setEditingItem({
                      ...editingItem, 
                      media_url: url, 
                      media_type: type, 
                      media_alt_text: altText || ''
                    })}
                    currentMediaUrl={editingItem.media_url || ''}
                    currentMediaType={editingItem.media_type as 'image' | 'video' | undefined}
                    currentAltText={editingItem.media_alt_text || ''}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              <Button 
                onClick={() => updateItem(editingItem.id, {
                  ...editingItem,
                  title_formatting: itemTitleStyle,
                  text_formatting: itemTextStyle,
                })} 
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Zapisz zmiany
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Section Dialog */}
      {editingSection && (
        <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj sekcję</DialogTitle>
              <DialogDescription>
                Modyfikuj dane sekcji
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-section-title">Tytuł sekcji</Label>
                <Input
                  value={editingSection.title || ''}
                  onChange={(e) => setEditingSection({...editingSection, title: e.target.value})}
                  placeholder="Nazwa sekcji"
                />
              </div>
              <div>
                <Label htmlFor="edit-section-position">Pozycja</Label>
                <Input
                  type="number"
                  value={editingSection.position}
                  onChange={(e) => setEditingSection({...editingSection, position: parseInt(e.target.value) || 0})}
                  placeholder="Pozycja sekcji"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSection(null)}>
                Anuluj
              </Button>
              <Button onClick={() => updateSection(editingSection.id, {
                title: editingSection.title,
                position: editingSection.position,
              })}>
                <Save className="w-4 h-4 mr-2" />
                Zapisz zmiany
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Admin;