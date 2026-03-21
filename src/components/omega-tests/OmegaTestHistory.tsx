import React from 'react';
import { OmegaTest } from '@/hooks/useOmegaTests';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OmegaTestHistoryProps {
  tests: OmegaTest[];
  onDelete?: (id: string) => void;
}

export const OmegaTestHistory: React.FC<OmegaTestHistoryProps> = ({ tests, onDelete }) => {
  const reversed = [...tests].reverse();

  return (
    <div className="p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">Historia Transformacji Omega</h3>
      {reversed.length === 0 ? (
        <p className="text-xs text-muted-foreground">Brak wpisów. Dodaj swój pierwszy test.</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {reversed.map((test) => (
            <div key={test.id} className="p-3 rounded-lg bg-background/50 border border-border/20 space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-foreground">
                  {format(parseISO(test.test_date), 'dd MMMM yyyy', { locale: pl })}
                </span>
                {onDelete && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(test.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                {test.omega3_index !== null && (
                  <span>Index: <strong className="text-blue-400">{test.omega3_index}%</strong></span>
                )}
                {test.omega6_3_ratio !== null && (
                  <span>Ratio: <strong className="text-orange-400">{test.omega6_3_ratio}:1</strong></span>
                )}
                {test.epa !== null && <span>EPA: {test.epa}%</span>}
                {test.dha !== null && <span>DHA: {test.dha}%</span>}
                {test.aa !== null && <span>AA: {test.aa}%</span>}
                {test.la !== null && <span>LA: {test.la}%</span>}
              </div>
              {test.notes && (
                <p className="text-[11px] text-muted-foreground/80 italic mt-1">„{test.notes}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
