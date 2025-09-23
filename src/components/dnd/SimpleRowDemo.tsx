import React from 'react';
import { Button } from '@/components/ui/button';
import { Grid3X3, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const SimpleRowDemo: React.FC = () => {
  const handleAddRow = (columns: number) => {
    toast({
      title: "Dodano wiersz",
      description: `Utworzono wiersz z ${columns} kolumnami. Funkcjonalność w trakcie implementacji.`,
    });
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