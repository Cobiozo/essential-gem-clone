import React from 'react';
import { Button } from '@/components/ui/button';
import { Grid3X3, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SimpleRowDemoProps {
  pageId: string;
  onRowCreated?: () => void;
}

export const SimpleRowDemo: React.FC<SimpleRowDemoProps> = ({
  pageId,
  onRowCreated
}) => {
  const handleAddRow = async (columns: number) => {
    try {
      const { data, error } = await supabase
        .from('cms_sections')
        .insert({
          page_id: pageId,
          title: `Wiersz ${columns}-kolumnowy`,
          description: `Wiersz z ${columns} kolumnami`,
          position: 999, // Will be reordered later
          is_active: true,
          visible_to_everyone: true,
          section_type: 'row',
          row_column_count: columns,
          row_layout_type: 'equal'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Wiersz utworzony!",
        description: `Utworzono wiersz z ${columns} kolumnami. Możesz teraz przeciągać do niego sekcje.`,
      });

      // Callback to refresh data
      onRowCreated?.();
    } catch (error) {
      console.error('Error creating row:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć wiersza. Spróbuj ponownie.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-dashed border-blue-300 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Grid3X3 className="w-5 h-5 text-blue-600" />
        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
          System Wierszy (Row Containers) - Demo
        </span>
      </div>
      
      <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">
        Tutaj będziesz mógł tworzyć wiersze z różną liczbą kolumn i przeciągać do nich sekcje.
      </p>
      
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddRow(1)}
          className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          <Plus className="w-3 h-3" />
          <span className="text-xs">1 Kolumna</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddRow(2)}
          className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          <Plus className="w-3 h-3" />
          <span className="text-xs">2 Kolumny</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddRow(3)}
          className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          <Plus className="w-3 h-3" />
          <span className="text-xs">3 Kolumny</span>
        </Button>
      </div>
    </div>
  );
};