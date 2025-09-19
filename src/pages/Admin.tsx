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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Pencil, Plus, Trash2, LogOut, Home, Save } from 'lucide-react';
import pureLifeDroplet from '@/assets/pure-life-droplet.png';

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
}

const Admin = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<CMSSection | null>(null);
  const [editingItem, setEditingItem] = useState<CMSItem | null>(null);
  const [newItem, setNewItem] = useState({
    type: 'button',
    title: '',
    description: '',
    url: '',
    icon: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!isAdmin) {
      toast({
        title: "Brak uprawnień",
        description: "Nie masz uprawnień administratora.",
        variant: "destructive",
      });
      navigate('/');
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
        .select('*')
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

  const updateSection = async (sectionId: string, updates: Partial<CMSSection>) => {
    try {
      const { error } = await supabase
        .from('cms_sections')
        .update(updates)
        .eq('id', sectionId);

      if (error) throw error;

      setSections(sections.map(s => s.id === sectionId ? { ...s, ...updates } : s));
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
      
      const { data, error } = await supabase
        .from('cms_items')
        .insert({
          section_id: sectionId,
          ...newItem,
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setItems([...items, data]);
      setNewItem({ type: 'button', title: '', description: '', url: '', icon: '' });
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
          <img src={pureLifeDroplet} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Ładowanie panelu administracyjnego...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src={pureLifeDroplet} alt="Pure Life" className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-foreground">Panel CMS - Pure Life</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Administrator</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" />
              Strona główna
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Wyloguj
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {sections.map((section) => {
            const sectionItems = items.filter(i => i.section_id === section.id);
            
            return (
              <Card key={section.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{section.title}</span>
                        <Badge variant={section.is_active ? "default" : "secondary"}>
                          {section.is_active ? "Aktywna" : "Nieaktywna"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Pozycja: {section.position} | Elementów: {sectionItems.length}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={section.is_active}
                        onCheckedChange={(checked) => updateSection(section.id, { is_active: checked })}
                      />
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Dodaj element
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Dodaj nowy element</DialogTitle>
                            <DialogDescription>
                              Dodaj nowy element do sekcji "{section.title}"
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="type">Typ</Label>
                              <Select value={newItem.type} onValueChange={(value) => setNewItem({...newItem, type: value})}>
                                <SelectTrigger>
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
                              <Label htmlFor="title">Tytuł</Label>
                              <Input
                                value={newItem.title}
                                onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                                placeholder="Nazwa elementu"
                              />
                            </div>
                            <div>
                              <Label htmlFor="description">Opis</Label>
                              <Textarea
                                value={newItem.description}
                                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                                placeholder="Opcjonalny opis"
                              />
                            </div>
                            <div>
                              <Label htmlFor="url">URL</Label>
                              <Input
                                value={newItem.url}
                                onChange={(e) => setNewItem({...newItem, url: e.target.value})}
                                placeholder="https://..."
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => createItem(section.id)}>
                              <Save className="w-4 h-4 mr-2" />
                              Zapisz
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sectionItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge 
                                variant="outline" 
                                className={
                                  item.type === 'button' ? 'bg-green-100 text-green-800' :
                                  item.type === 'header_text' ? 'bg-blue-100 text-blue-800' :
                                  item.type === 'info_text' ? 'bg-purple-100 text-purple-800' :
                                  item.type === 'tip' ? 'bg-yellow-100 text-yellow-800' :
                                  item.type === 'contact_info' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {item.type === 'header_text' ? 'Nagłówek' :
                                 item.type === 'info_text' ? 'Info' :
                                 item.type === 'contact_info' ? 'Kontakt' :
                                 item.type === 'support_info' ? 'Wsparcie' :
                                 item.type}
                              </Badge>
                              <Badge variant={item.is_active ? "default" : "secondary"}>
                                {item.is_active ? "Aktywny" : "Nieaktywny"}
                              </Badge>
                            </div>
                            <h4 className="font-medium">{item.title}</h4>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                            )}
                            {item.url && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">{item.url}</p>
                            )}
                          </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={(checked) => updateItem(item.id, { is_active: checked })}
                          />
                          <Button variant="outline" size="sm" onClick={() => setEditingItem(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteItem(item.id)}>
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj element</DialogTitle>
              <DialogDescription>
                Modyfikuj dane elementu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-type">Typ</Label>
                <Select 
                  value={editingItem.type} 
                  onValueChange={(value) => setEditingItem({...editingItem, type: value})}
                >
                  <SelectTrigger>
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
                <Label htmlFor="edit-title">Tytuł</Label>
                <Input
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                  placeholder="Nazwa elementu"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Opis</Label>
                <Textarea
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                  placeholder="Opcjonalny opis"
                />
              </div>
              <div>
                <Label htmlFor="edit-url">URL</Label>
                <Input
                  value={editingItem.url || ''}
                  onChange={(e) => setEditingItem({...editingItem, url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Anuluj
              </Button>
              <Button onClick={() => updateItem(editingItem.id, {
                type: editingItem.type,
                title: editingItem.title,
                description: editingItem.description,
                url: editingItem.url,
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