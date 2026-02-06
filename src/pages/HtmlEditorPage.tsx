import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFormProtection } from '@/hooks/useFormProtection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { HtmlHybridEditor } from '@/components/admin/html-editor/HtmlHybridEditor';
import { VisibilityEditor } from '@/components/cms/editors/VisibilityEditor';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  ArrowLeft, Save, Settings, Eye, FileCode, Globe, Menu, 
  Loader2, Check, X
} from 'lucide-react';

interface HtmlPage {
  id: string;
  title: string;
  slug: string;
  html_content: string;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  is_active: boolean;
  visible_to_everyone: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_anonymous: boolean;
  show_header: boolean;
  show_footer: boolean;
  show_in_sidebar: boolean;
  sidebar_icon: string | null;
  sidebar_position: number | null;
  custom_css: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  created_at: string;
  updated_at: string;
}

const emptyPage: Partial<HtmlPage> = {
  title: '',
  slug: '',
  html_content: '',
  meta_title: '',
  meta_description: '',
  is_published: false,
  is_active: true,
  visible_to_everyone: false,
  visible_to_clients: true,
  visible_to_partners: true,
  visible_to_specjalista: true,
  visible_to_anonymous: false,
  show_header: true,
  show_footer: false,
  show_in_sidebar: false,
  sidebar_icon: 'FileText',
  sidebar_position: 99,
  custom_css: '',
  og_image: '',
  og_title: '',
  og_description: '',
};

const HtmlEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isNew = id === 'new';
  const [editingPage, setEditingPage] = useState<Partial<HtmlPage> | null>(null);
  const [activeView, setActiveView] = useState<'editor' | 'settings'>('editor');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Protect against accidental tab close
  useFormProtection(hasUnsavedChanges);
  
  // Fetch existing page
  const { data: page, isLoading } = useQuery({
    queryKey: ['html-page', id],
    queryFn: async () => {
      if (isNew) return null;
      
      const { data, error } = await supabase
        .from('html_pages')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as HtmlPage;
    },
    enabled: !isNew,
  });
  
  // Initialize editing state
  useEffect(() => {
    if (isNew) {
      setEditingPage({ ...emptyPage });
    } else if (page) {
      setEditingPage({ ...page });
    }
  }, [isNew, page]);
  
  // Track changes
  const handleChange = useCallback((updates: Partial<HtmlPage>) => {
    setEditingPage(prev => prev ? { ...prev, ...updates } : null);
    setHasUnsavedChanges(true);
  }, []);
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (pageData: Partial<HtmlPage>) => {
      if (pageData.id) {
        // Update existing
        const { error } = await supabase
          .from('html_pages')
          .update({
            title: pageData.title,
            slug: pageData.slug,
            html_content: pageData.html_content,
            meta_title: pageData.meta_title,
            meta_description: pageData.meta_description,
            is_published: pageData.is_published,
            is_active: pageData.is_active,
            visible_to_everyone: pageData.visible_to_everyone,
            visible_to_clients: pageData.visible_to_clients,
            visible_to_partners: pageData.visible_to_partners,
            visible_to_specjalista: pageData.visible_to_specjalista,
            visible_to_anonymous: pageData.visible_to_anonymous,
            show_header: pageData.show_header,
            show_footer: pageData.show_footer,
            show_in_sidebar: pageData.show_in_sidebar,
            sidebar_icon: pageData.sidebar_icon,
            sidebar_position: pageData.sidebar_position,
            custom_css: pageData.custom_css,
            og_image: pageData.og_image,
            og_title: pageData.og_title,
            og_description: pageData.og_description,
          })
          .eq('id', pageData.id);
        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('html_pages')
          .insert({
            title: pageData.title,
            slug: pageData.slug,
            html_content: pageData.html_content || '',
            meta_title: pageData.meta_title,
            meta_description: pageData.meta_description,
            is_published: pageData.is_published,
            is_active: pageData.is_active,
            visible_to_everyone: pageData.visible_to_everyone,
            visible_to_clients: pageData.visible_to_clients,
            visible_to_partners: pageData.visible_to_partners,
            visible_to_specjalista: pageData.visible_to_specjalista,
            visible_to_anonymous: pageData.visible_to_anonymous,
            show_header: pageData.show_header,
            show_footer: pageData.show_footer,
            show_in_sidebar: pageData.show_in_sidebar,
            sidebar_icon: pageData.sidebar_icon,
            sidebar_position: pageData.sidebar_position,
            custom_css: pageData.custom_css,
            og_image: pageData.og_image,
            og_title: pageData.og_title,
            og_description: pageData.og_description,
            created_by: user?.id,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['html-pages-admin'] });
      queryClient.invalidateQueries({ queryKey: ['html-pages-sidebar'] });
      setHasUnsavedChanges(false);
      
      toast({ title: 'Zapisano', description: 'Strona HTML została zapisana.' });
      
      // If created new, navigate to edit URL
      if (isNew && data?.id) {
        navigate(`/admin/html-editor/${data.id}`, { replace: true });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: 'Błąd', 
        description: error.message || 'Nie udało się zapisać strony.',
        variant: 'destructive'
      });
    },
  });
  
  const handleSave = () => {
    if (!editingPage?.title || !editingPage?.slug) {
      toast({ title: 'Błąd', description: 'Tytuł i slug są wymagane.', variant: 'destructive' });
      setActiveView('settings');
      return;
    }
    saveMutation.mutate(editingPage);
  };
  
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!confirm('Masz niezapisane zmiany. Czy na pewno chcesz wyjść?')) {
        return;
      }
    }
    navigate('/admin?tab=html-pages');
  };
  
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[ąàáâãäå]/g, 'a')
      .replace(/[ćçč]/g, 'c')
      .replace(/[ęèéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[łľ]/g, 'l')
      .replace(/[ńñň]/g, 'n')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[śš]/g, 's')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ýÿ]/g, 'y')
      .replace(/[źżž]/g, 'z')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (!editingPage) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Nie znaleziono strony</p>
          <Button onClick={() => navigate('/admin?tab=html-pages')}>
            Powrót do listy
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Minimalist Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancel}
            className="gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Powrót</span>
          </Button>
          
          <div className="w-px h-6 bg-border" />
          
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium truncate max-w-[200px]">
              {editingPage.title || 'Nowa strona'}
            </span>
            {editingPage.is_published ? (
              <Badge variant="default" className="text-xs">
                Opublikowana
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Szkic</Badge>
            )}
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-xs text-warning border-warning/50">
                Niezapisane
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/30">
            <Button 
              variant={activeView === 'editor' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveView('editor')}
              className="h-7 px-3 gap-1.5 text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Edytor
            </Button>
            <Button 
              variant={activeView === 'settings' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveView('settings')}
              className="h-7 px-3 gap-1.5 text-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              Ustawienia
            </Button>
          </div>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCancel}
            className="h-8 gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Anuluj</span>
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="h-8 gap-1"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </span>
          </Button>
        </div>
      </header>
      
      {/* Main Content - Full Height */}
      {activeView === 'editor' ? (
        <div className="flex-1 overflow-hidden">
          <HtmlHybridEditor
            htmlContent={editingPage.html_content || ''}
            customCss={editingPage.custom_css || ''}
            onChange={(html) => handleChange({ html_content: html })}
          />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                Podstawowe informacje
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tytuł strony *</Label>
                  <Input
                    value={editingPage.title || ''}
                    onChange={(e) => {
                      const title = e.target.value;
                      handleChange({
                        title,
                        slug: editingPage.slug || generateSlug(title),
                      });
                    }}
                    placeholder="Nazwa strony"
                  />
                </div>
                <div>
                  <Label>Slug (URL) *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">/html/</span>
                    <Input
                      value={editingPage.slug || ''}
                      onChange={(e) => handleChange({ slug: e.target.value })}
                      placeholder="nazwa-strony"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* SEO Settings */}
            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4" />
                SEO i Open Graph
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Meta tytuł</Label>
                  <Input
                    value={editingPage.meta_title || ''}
                    onChange={(e) => handleChange({ meta_title: e.target.value })}
                    placeholder="Tytuł dla wyszukiwarek"
                  />
                </div>
                <div>
                  <Label>Meta opis</Label>
                  <Input
                    value={editingPage.meta_description || ''}
                    onChange={(e) => handleChange({ meta_description: e.target.value })}
                    placeholder="Opis dla wyszukiwarek"
                  />
                </div>
                <div>
                  <Label>OG Tytuł</Label>
                  <Input
                    value={editingPage.og_title || ''}
                    onChange={(e) => handleChange({ og_title: e.target.value })}
                    placeholder="Tytuł przy udostępnianiu"
                  />
                </div>
                <div>
                  <Label>OG Obrazek (URL)</Label>
                  <Input
                    value={editingPage.og_image || ''}
                    onChange={(e) => handleChange({ og_image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
              <div>
                <Label>OG Opis</Label>
                <Input
                  value={editingPage.og_description || ''}
                  onChange={(e) => handleChange({ og_description: e.target.value })}
                  placeholder="Opis wyświetlany przy udostępnianiu"
                />
              </div>
            </div>
            
            {/* Display Settings */}
            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Menu className="w-4 h-4" />
                Wyświetlanie
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Pokaż nagłówek</Label>
                    <p className="text-xs text-muted-foreground">Nawigacja na górze</p>
                  </div>
                  <Switch
                    checked={editingPage.show_header ?? true}
                    onCheckedChange={(checked) => handleChange({ show_header: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Pokaż stopkę</Label>
                    <p className="text-xs text-muted-foreground">Stopka na dole</p>
                  </div>
                  <Switch
                    checked={editingPage.show_footer ?? false}
                    onCheckedChange={(checked) => handleChange({ show_footer: checked })}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Pokaż w sidebar</Label>
                  <p className="text-xs text-muted-foreground">Link w menu bocznym</p>
                </div>
                <Switch
                  checked={editingPage.show_in_sidebar ?? false}
                  onCheckedChange={(checked) => handleChange({ show_in_sidebar: checked })}
                />
              </div>
              
              {editingPage.show_in_sidebar && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                  <div>
                    <Label>Ikona (Lucide)</Label>
                    <Input
                      value={editingPage.sidebar_icon || 'FileText'}
                      onChange={(e) => handleChange({ sidebar_icon: e.target.value })}
                      placeholder="FileText"
                    />
                  </div>
                  <div>
                    <Label>Pozycja</Label>
                    <Input
                      type="number"
                      value={editingPage.sidebar_position ?? 99}
                      onChange={(e) => handleChange({ sidebar_position: parseInt(e.target.value) || 99 })}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Visibility */}
            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Widoczność
              </h3>
              
              <VisibilityEditor
                value={{
                  visible_to_everyone: editingPage.visible_to_everyone ?? false,
                  visible_to_clients: editingPage.visible_to_clients ?? false,
                  visible_to_partners: editingPage.visible_to_partners ?? false,
                  visible_to_specjalista: editingPage.visible_to_specjalista ?? false,
                  visible_to_anonymous: editingPage.visible_to_anonymous ?? false,
                }}
                onChange={(visibility) => handleChange(visibility)}
              />
            </div>
            
            {/* CSS */}
            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-semibold">Własne style CSS</h3>
              <Textarea
                value={editingPage.custom_css || ''}
                onChange={(e) => handleChange({ custom_css: e.target.value })}
                placeholder=".my-class { color: red; }"
                className="font-mono text-sm min-h-[100px]"
              />
            </div>
            
            {/* Publish Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/10 border-primary/30">
              <div>
                <Label className="text-primary text-base">
                  Opublikowana
                </Label>
                <p className="text-sm text-muted-foreground">
                  Strona widoczna dla użytkowników
                </p>
              </div>
              <Switch
                checked={editingPage.is_published ?? false}
                onCheckedChange={(checked) => handleChange({ is_published: checked })}
              />
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default HtmlEditorPage;
