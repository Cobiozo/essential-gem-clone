import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Grid3X3, Columns, Columns2, Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface RowControlsProps {
  isVisible: boolean;
  onAddRow: (columnCount: 1 | 2 | 3 | 4) => void;
  className?: string;
}

export const RowControls: React.FC<RowControlsProps> = ({
  isVisible,
  onAddRow,
  className,
}) => {
  const { t } = useLanguage();

  if (!isVisible) return null;

  return (
    <div className={cn("mb-4 p-4 bg-primary/10 rounded-lg border-2 border-dashed border-primary/30", className)}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {t('rows.addContainer')}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddRow(1)}
            className="gap-2"
          >
            <Columns className="w-3 h-3" />
            <span className="text-xs">{t('rows.oneColumn')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddRow(2)}
            className="gap-2"
          >
            <Columns2 className="w-3 h-3" />
            <span className="text-xs">{t('rows.twoColumns')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddRow(3)}
            className="gap-2"
          >
            <Columns3 className="w-3 h-3" />
            <span className="text-xs">{t('rows.threeColumns')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddRow(4)}
            className="gap-2"
          >
            <Grid3X3 className="w-3 h-3" />
            <span className="text-xs">{t('rows.fourColumns')}</span>
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        {t('rows.description')}
      </p>
    </div>
  );
};
