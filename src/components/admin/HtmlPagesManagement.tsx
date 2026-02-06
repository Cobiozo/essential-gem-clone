import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Edit, Trash2, Eye, EyeOff, FileCode, ExternalLink, 
  Globe, Users, UserCheck, Sparkles, Menu
} from 'lucide-react';

interface HtmlPage {
  id: string;
  title: string;
  slug: string;
  html_content: string;
  is_published: boolean;
  is_active: boolean;
  visible_to_everyone: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_anonymous: boolean;
  show_in_sidebar: boolean;
  created_at: string;
}

export const HtmlPagesManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        <Button onClick={() => navigate('/admin/html-editor/new')}>
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
                        <Badge variant="default">
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
                          onClick={() => navigate(`/admin/html-editor/${page.id}`)}
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
    </div>
  );
};
