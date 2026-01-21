import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Edit, Trash2, Eye, EyeOff, FileCode, ExternalLink, 
  Globe, Users, UserCheck, Sparkles, Menu, Code, FileText, MousePointer
} from 'lucide-react';
import { VisibilityEditor } from '@/components/cms/editors/VisibilityEditor';
import { HtmlVisualEditor } from './html-editor/HtmlVisualEditor';

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
};

export const HtmlPagesManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Partial<HtmlPage> | null>(null);
  const [activeTab, setActiveTab] = useState('editor');

  const { data: pages, isLoading } = useQuery({
    queryKey: ['html-pages-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('html_pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HtmlPage[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (page: Partial<HtmlPage>) => {
      if (page.id) {
        const { error } = await supabase
          .from('html_pages')
          .update({
            title: page.title,
            slug: page.slug,
            html_content: page.html_content,
            meta_title: page.meta_title,
            meta_description: page.meta_description,
            is_published: page.is_published,
            is_active: page.is_active,
            visible_to_everyone: page.visible_to_everyone,
            visible_to_clients: page.visible_to_clients,
            visible_to_partners: page.visible_to_partners,
            visible_to_specjalista: page.visible_to_specjalista,
            visible_to_anonymous: page.visible_to_anonymous,
            show_header: page.show_header,
            show_footer: page.show_footer,
            show_in_sidebar: page.show_in_sidebar,
            sidebar_icon: page.sidebar_icon,
            sidebar_position: page.sidebar_position,
            custom_css: page.custom_css,
          })
          .eq('id', page.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('html_pages')
          .insert({
            title: page.title,
            slug: page.slug,
            html_content: page.html_content || '',
            meta_title: page.meta_title,
            meta_description: page.meta_description,
            is_published: page.is_published,
            is_active: page.is_active,
            visible_to_everyone: page.visible_to_everyone,
            visible_to_clients: page.visible_to_clients,
            visible_to_partners: page.visible_to_partners,
            visible_to_specjalista: page.visible_to_specjalista,
            visible_to_anonymous: page.visible_to_anonymous,
            show_header: page.show_header,
            show_footer: page.show_footer,
            show_in_sidebar: page.show_in_sidebar,
            sidebar_icon: page.sidebar_icon,
            sidebar_position: page.sidebar_position,
            custom_css: page.custom_css,
            created_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['html-pages-admin'] });
      queryClient.invalidateQueries({ queryKey: ['html-pages-sidebar'] });
      toast({ title: 'Zapisano', description: 'Strona HTML została zapisana.' });
      setIsDialogOpen(false);
      setEditingPage(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Błąd', 
        description: error.message || 'Nie udało się zapisać strony.',
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('html_pages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['html-pages-admin'] });
      queryClient.invalidateQueries({ queryKey: ['html-pages-sidebar'] });
      toast({ title: 'Usunięto', description: 'Strona HTML została usunięta.' });
    },
  });

  const handleCreate = () => {
    setEditingPage({ ...emptyPage });
    setActiveTab('editor');
    setIsDialogOpen(true);
  };

  const handleEdit = (page: HtmlPage) => {
    setEditingPage({ ...page });
    setActiveTab('editor');
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingPage?.title || !editingPage?.slug) {
      toast({ title: 'Błąd', description: 'Tytuł i slug są wymagane.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(editingPage);
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

  const getVisibilityBadges = (page: HtmlPage) => {
    const badges = [];
    if (page.visible_to_everyone) badges.push({ label: 'Wszyscy', icon: Globe });
    if (page.visible_to_anonymous) badges.push({ label: 'Anonimowi', icon: Eye });
    if (page.visible_to_clients) badges.push({ label: 'Klienci', icon: Users });
    if (page.visible_to_partners) badges.push({ label: 'Partnerzy', icon: UserCheck });
    if (page.visible_to_specjalista) badges.push({ label: 'Specjaliści', icon: Sparkles });
    return badges;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Strony HTML</h2>
          <p className="text-muted-foreground">Zarządzaj stronami z własnym kodem HTML</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nowa strona
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tytuł</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Widoczność</TableHead>
                <TableHead>Sidebar</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Ładowanie...
                  </TableCell>
                </TableRow>
              ) : pages?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Brak stron HTML. Utwórz pierwszą!
                  </TableCell>
                </TableRow>
              ) : (
                pages?.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-muted-foreground" />
                        {page.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        /html/{page.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      {page.is_published ? (
                        <Badge variant="default" className="bg-green-500">
                          <Eye className="w-3 h-3 mr-1" />
                          Opublikowana
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Szkic
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getVisibilityBadges(page).slice(0, 2).map((b, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <b.icon className="w-3 h-3 mr-1" />
                            {b.label}
                          </Badge>
                        ))}
                        {getVisibilityBadges(page).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{getVisibilityBadges(page).length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {page.show_in_sidebar ? (
                        <Badge variant="outline">
                          <Menu className="w-3 h-3 mr-1" />
                          Tak
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Nie</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/html/${page.slug}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(page)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Czy na pewno chcesz usunąć tę stronę?')) {
                              deleteMutation.mutate(page.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              {editingPage?.id ? 'Edytuj stronę HTML' : 'Nowa strona HTML'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="editor">
                <Code className="w-4 h-4 mr-2" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="w-4 h-4 mr-2" />
                Podgląd
              </TabsTrigger>
              <TabsTrigger value="settings">
                <FileText className="w-4 h-4 mr-2" />
                Ustawienia
              </TabsTrigger>
              <TabsTrigger value="visibility">
                <Users className="w-4 h-4 mr-2" />
                Widoczność
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="editor" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tytuł strony *</Label>
                    <Input
                      value={editingPage?.title || ''}
                      onChange={(e) => {
                        const title = e.target.value;
                        setEditingPage(prev => ({
                          ...prev,
                          title,
                          slug: prev?.slug || generateSlug(title),
                        }));
                      }}
                      placeholder="Nazwa strony"
                    />
                  </div>
                  <div>
                    <Label>Slug (URL) *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">/html/</span>
                      <Input
                        value={editingPage?.slug || ''}
                        onChange={(e) => setEditingPage(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="nazwa-strony"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Kod HTML</Label>
                  <Textarea
                    value={editingPage?.html_content || ''}
                    onChange={(e) => setEditingPage(prev => ({ ...prev, html_content: e.target.value }))}
                    placeholder="<div>Twój kod HTML...</div>"
                    className="font-mono text-sm min-h-[400px]"
                  />
                </div>

                <div>
                  <Label>Własne style CSS (opcjonalne)</Label>
                  <Textarea
                    value={editingPage?.custom_css || ''}
                    onChange={(e) => setEditingPage(prev => ({ ...prev, custom_css: e.target.value }))}
                    placeholder=".my-class { color: red; }"
                    className="font-mono text-sm min-h-[100px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-0 h-[600px]">
                <Card className="h-full">
                  <CardContent className="p-0 h-full">
                    <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
                      <MousePointer className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Kliknij element, aby go edytować
                      </span>
                    </div>
                    <HtmlVisualEditor
                      htmlContent={editingPage?.html_content || ''}
                      customCss={editingPage?.custom_css || ''}
                      onChange={(html) => setEditingPage(prev => ({ ...prev, html_content: html }))}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Meta tytuł (SEO)</Label>
                    <Input
                      value={editingPage?.meta_title || ''}
                      onChange={(e) => setEditingPage(prev => ({ ...prev, meta_title: e.target.value }))}
                      placeholder="Tytuł dla wyszukiwarek"
                    />
                  </div>
                  <div>
                    <Label>Meta opis (SEO)</Label>
                    <Input
                      value={editingPage?.meta_description || ''}
                      onChange={(e) => setEditingPage(prev => ({ ...prev, meta_description: e.target.value }))}
                      placeholder="Opis dla wyszukiwarek"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Pokaż nagłówek</Label>
                      <p className="text-xs text-muted-foreground">Nawigacja PureLife na górze</p>
                    </div>
                    <Switch
                      checked={editingPage?.show_header ?? true}
                      onCheckedChange={(checked) => setEditingPage(prev => ({ ...prev, show_header: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Pokaż stopkę</Label>
                      <p className="text-xs text-muted-foreground">Stopka PureLife na dole</p>
                    </div>
                    <Switch
                      checked={editingPage?.show_footer ?? false}
                      onCheckedChange={(checked) => setEditingPage(prev => ({ ...prev, show_footer: checked }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Pokaż w sidebar</Label>
                    <p className="text-xs text-muted-foreground">Dodaj link w menu bocznym dashboardu</p>
                  </div>
                  <Switch
                    checked={editingPage?.show_in_sidebar ?? false}
                    onCheckedChange={(checked) => setEditingPage(prev => ({ ...prev, show_in_sidebar: checked }))}
                  />
                </div>

                {editingPage?.show_in_sidebar && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                    <div>
                      <Label>Ikona (Lucide)</Label>
                      <Input
                        value={editingPage?.sidebar_icon || 'FileText'}
                        onChange={(e) => setEditingPage(prev => ({ ...prev, sidebar_icon: e.target.value }))}
                        placeholder="FileText"
                      />
                    </div>
                    <div>
                      <Label>Pozycja w menu</Label>
                      <Input
                        type="number"
                        value={editingPage?.sidebar_position ?? 99}
                        onChange={(e) => setEditingPage(prev => ({ ...prev, sidebar_position: parseInt(e.target.value) || 99 }))}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 border rounded-lg bg-green-500/10 border-green-500/30">
                  <div>
                    <Label className="text-green-700 dark:text-green-400">Opublikowana</Label>
                    <p className="text-xs text-muted-foreground">Strona widoczna dla użytkowników</p>
                  </div>
                  <Switch
                    checked={editingPage?.is_published ?? false}
                    onCheckedChange={(checked) => setEditingPage(prev => ({ ...prev, is_published: checked }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="visibility" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Kto może zobaczyć tę stronę?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VisibilityEditor
                      value={{
                        visible_to_everyone: editingPage?.visible_to_everyone ?? false,
                        visible_to_clients: editingPage?.visible_to_clients ?? false,
                        visible_to_partners: editingPage?.visible_to_partners ?? false,
                        visible_to_specjalista: editingPage?.visible_to_specjalista ?? false,
                        visible_to_anonymous: editingPage?.visible_to_anonymous ?? false,
                      }}
                      onChange={(visibility) => setEditingPage(prev => ({ ...prev, ...visibility }))}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
