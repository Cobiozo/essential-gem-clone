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
  refreshKey?: number;
}

export const InactiveElementsManager: React.FC<InactiveElementsManagerProps> = ({
  onElementActivated,
  onElementDeleted,
  refreshKey,
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

      // Fetch inactive sections - without page_id filter to show all inactive sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
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

  const activateAllItemsInSections = async () => {
    try {
      console.log('Starting to activate all items in sections...');
      
      // Get all active sections
      const { data: activeSections, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('id, title')
        .eq('is_active', true);

      console.log('Active sections found:', activeSections);

      if (sectionsError) {
        console.error('Error fetching active sections:', sectionsError);
        throw sectionsError;
      }

      if (!activeSections || activeSections.length === 0) {
        toast({
          title: 'Info',
          description: 'Brak aktywnych sekcji do przetworzenia',
        });
        return;
      }

      const sectionIds = activeSections.map(s => s.id);
      console.log('Section IDs to process:', sectionIds);

      // Check how many inactive items exist in these sections
      const { data: inactiveItemsCheck, error: checkError } = await supabase
        .from('cms_items')
        .select('id, title, section_id')
        .in('section_id', sectionIds)
        .eq('is_active', false);

      console.log('Inactive items found:', inactiveItemsCheck);

      if (checkError) {
        console.error('Error checking inactive items:', checkError);
        throw checkError;
      }

      if (!inactiveItemsCheck || inactiveItemsCheck.length === 0) {
        toast({
          title: 'Info',
          description: 'Wszystkie elementy w aktywnych sekcjach są już aktywne',
        });
        return;
      }

      // Activate all inactive items in these sections
      const { data: updatedItems, error } = await supabase
        .from('cms_items')
        .update({ 
          is_active: true, 
          updated_at: new Date().toISOString() 
        })
        .in('section_id', sectionIds)
        .eq('is_active', false)
        .select();

      console.log('Updated items:', updatedItems);

      if (error) {
        console.error('Error updating items:', error);
        throw error;
      }

      // Remove activated items from local state
      if (updatedItems && updatedItems.length > 0) {
        const activatedItemIds = updatedItems.map(item => item.id);
        setInactiveItems(prev => prev.filter(item => !activatedItemIds.includes(item.id)));
        
        toast({
          title: 'Sukces',
          description: `Aktywowano ${updatedItems.length} elementów w przywróconych sekcjach`,
        });
        
        onElementActivated();
      } else {
        toast({
          title: 'Info',
          description: 'Brak elementów do aktywacji',
        });
      }
    } catch (error) {
      console.error('Error activating all items:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można aktywować elementów: ' + (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const activateElement = async (type: 'section' | 'item', id: string) => {
    try {
      setActivating(id);

      const table = type === 'section' ? 'cms_sections' : 'cms_items';
      
      // For sections, we need to set a proper position when activating
      let updateData: any = { 
        is_active: true, 
        updated_at: new Date().toISOString(),
        page_id: null  // Ensure it's on the main page
      };
      
      if (type === 'section') {
        // Get the highest position for top-level sections to append at the end
        const { data: maxPositionData } = await supabase
          .from('cms_sections')
          .select('position')
          .is('page_id', null)
          .is('parent_id', null)
          .eq('is_active', true)
          .order('position', { ascending: false })
          .limit(1);
          
        const maxPosition = maxPositionData && maxPositionData[0] ? maxPositionData[0].position : -1;
        updateData.position = maxPosition + 1;
        updateData.parent_id = null; // Ensure it's a top-level section
        console.log(`Activating section ${id} with position ${updateData.position}`);
      } else {
        // For items, ensure page_id is null and get proper position within section
        const { data: itemData } = await supabase
          .from('cms_items')
          .select('section_id')
          .eq('id', id)
          .single();
          
        if (itemData) {
          const { data: maxItemPositionData } = await supabase
            .from('cms_items')
            .select('position')
            .eq('section_id', itemData.section_id)
            .eq('is_active', true)
            .order('position', { ascending: false })
            .limit(1);
            
          const maxItemPosition = maxItemPositionData && maxItemPositionData[0] ? maxItemPositionData[0].position : -1;
          updateData.position = maxItemPosition + 1;
        }
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // If we're activating a section, also activate all its inactive items
      if (type === 'section') {
        const { error: itemsError } = await supabase
          .from('cms_items')
          .update({ 
            is_active: true, 
            updated_at: new Date().toISOString() 
          })
          .eq('section_id', id)
          .eq('is_active', false);

        if (itemsError) {
          console.error('Error activating section items:', itemsError);
        }
      }

      // Remove from local state
      if (type === 'section') {
        setInactiveSections(prev => prev.filter(s => s.id !== id));
      } else {
        setInactiveItems(prev => prev.filter(i => i.id !== id));
      }

      toast({
        title: 'Sukces',
        description: `${type === 'section' ? 'Sekcja' : 'Element'} został aktywowany i dodany na końcu listy`,
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
  }, [refreshKey]);

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
        
        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={activateAllItemsInSections}
            disabled={loading}
            className="text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            Aktywuj wszystkie elementy w sekcjach
          </Button>
        </div>
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