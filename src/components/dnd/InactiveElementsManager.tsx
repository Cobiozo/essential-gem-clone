import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Folder, 
  FileText,
  Loader2
} from 'lucide-react';
import { CMSSection, CMSItem } from '@/types/cms';
import { convertSupabaseSections } from '@/lib/typeUtils';

interface InactiveElementsManagerProps {
  onElementActivated: () => void;
  onElementDeleted: () => void;
}

export const InactiveElementsManager: React.FC<InactiveElementsManagerProps> = ({
  onElementActivated,
  onElementDeleted,
}) => {
  const { toast } = useToast();
  const [inactiveSections, setInactiveSections] = useState<CMSSection[]>([]);
  const [inactiveItems, setInactiveItems] = useState<CMSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchInactiveElements = async () => {
    try {
      setLoading(true);

      // Fetch inactive sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .is('page_id', null)
        .eq('is_active', false)
        .order('updated_at', { ascending: false });

      if (sectionsError) throw sectionsError;

      // Fetch inactive items
      const { data: itemsData, error: itemsError } = await supabase
        .from('cms_items')
        .select('*')
        .eq('is_active', false)
        .order('updated_at', { ascending: false });

      if (itemsError) throw itemsError;

      // Convert data to proper types
      const convertedItems: CMSItem[] = (itemsData || []).map(item => ({
        ...item,
        cells: Array.isArray(item.cells) ? item.cells as any[] : []
      }));

      setInactiveSections(convertSupabaseSections(sectionsData || []));
      setInactiveItems(convertedItems);
    } catch (error) {
      console.error('Error fetching inactive elements:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można pobrać nieaktywnych elementów',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const activateElement = async (type: 'section' | 'item', id: string) => {
    try {
      setActivating(id);

      const table = type === 'section' ? 'cms_sections' : 'cms_items';
      const { error } = await supabase
        .from(table)
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      if (type === 'section') {
        setInactiveSections(prev => prev.filter(s => s.id !== id));
      } else {
        setInactiveItems(prev => prev.filter(i => i.id !== id));
      }

      toast({
        title: 'Sukces',
        description: `${type === 'section' ? 'Sekcja' : 'Element'} został aktywowany`,
      });

      onElementActivated();
    } catch (error) {
      console.error('Error activating element:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można aktywować elementu',
        variant: 'destructive',
      });
    } finally {
      setActivating(null);
    }
  };

  const deleteElement = async (type: 'section' | 'item', id: string, title: string) => {
    if (!confirm(`Czy na pewno chcesz trwale usunąć "${title}"? Ta operacja jest nieodwracalna.`)) {
      return;
    }

    try {
      setDeleting(id);

      const table = type === 'section' ? 'cms_sections' : 'cms_items';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      if (type === 'section') {
        setInactiveSections(prev => prev.filter(s => s.id !== id));
      } else {
        setInactiveItems(prev => prev.filter(i => i.id !== id));
      }

      toast({
        title: 'Sukces',
        description: `${type === 'section' ? 'Sekcja' : 'Element'} został trwale usunięty`,
      });

      onElementDeleted();
    } catch (error) {
      console.error('Error deleting element:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można usunąć elementu',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchInactiveElements();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-5 h-5" />
            Nieaktywne elementy
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchInactiveElements}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Zarządzaj nieaktywnymi sekcjami i elementami. Możesz je aktywować ponownie lub usunąć trwale.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Ładowanie...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Inactive Sections */}
            {inactiveSections.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Folder className="w-4 h-4" />
                  <h3 className="text-sm font-medium">Nieaktywne sekcje</h3>
                  <Badge variant="secondary">{inactiveSections.length}</Badge>
                </div>
                <div className="space-y-2">
                  {inactiveSections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{section.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {section.description || 'Brak opisu'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activateElement('section', section.id)}
                          disabled={activating === section.id}
                        >
                          {activating === section.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteElement('section', section.id, section.title)}
                          disabled={deleting === section.id}
                        >
                          {deleting === section.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Separator if both sections and items exist */}
            {inactiveSections.length > 0 && inactiveItems.length > 0 && (
              <Separator />
            )}

            {/* Inactive Items */}
            {inactiveItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" />
                  <h3 className="text-sm font-medium">Nieaktywne elementy</h3>
                  <Badge variant="secondary">{inactiveItems.length}</Badge>
                </div>
                <div className="space-y-2">
                  {inactiveItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {item.title || `${item.type} element`}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Typ: {item.type} {item.description && `• ${item.description}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activateElement('item', item.id)}
                          disabled={activating === item.id}
                        >
                          {activating === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteElement('item', item.id, item.title || item.type)}
                          disabled={deleting === item.id}
                        >
                          {deleting === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {inactiveSections.length === 0 && inactiveItems.length === 0 && (
              <div className="text-center py-8">
                <EyeOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Brak nieaktywnych elementów
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};