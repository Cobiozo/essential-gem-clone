import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { FileText, X } from 'lucide-react';

interface ModuleResourcesSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

interface KnowledgeResource {
  id: string;
  title: string;
  resource_type: string;
  category: string | null;
}

export const ModuleResourcesSelector: React.FC<ModuleResourcesSelectorProps> = ({
  selectedIds,
  onChange
}) => {
  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    const { data } = await supabase
      .from('knowledge_resources')
      .select('id, title, resource_type, category')
      .eq('status', 'active')
      .order('category')
      .order('title');
    if (data) setResources(data);
    setLoading(false);
  };

  const toggleResource = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(r => r !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeResource = (id: string) => {
    onChange(selectedIds.filter(r => r !== id));
  };

  const selectedResources = resources.filter(r => selectedIds.includes(r.id));

  // Group resources by category
  const groupedResources = resources.reduce((acc, resource) => {
    const category = resource.category || 'Inne';
    if (!acc[category]) acc[category] = [];
    acc[category].push(resource);
    return acc;
  }, {} as Record<string, KnowledgeResource[]>);

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Powiązane zasoby z Biblioteki</Label>
      
      {/* Selected resources */}
      {selectedResources.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {selectedResources.map(resource => (
            <Badge key={resource.id} variant="secondary" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {resource.title}
              <button
                type="button"
                onClick={() => removeResource(resource.id)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Ładowanie zasobów...</p>
      ) : (
        <ScrollArea className="h-60 border rounded-lg p-3">
          <div className="space-y-4">
            {Object.entries(groupedResources).map(([category, categoryResources]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">{category}</h4>
                <div className="space-y-2">
                  {categoryResources.map(resource => (
                    <div key={resource.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`resource-${resource.id}`}
                        checked={selectedIds.includes(resource.id)}
                        onCheckedChange={() => toggleResource(resource.id)}
                      />
                      <label
                        htmlFor={`resource-${resource.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {resource.title}
                      </label>
                      <Badge variant="outline" className="text-[10px]">
                        {resource.resource_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <p className="text-xs text-muted-foreground">
        Wybrano: {selectedIds.length} zasobów
      </p>
    </div>
  );
};
