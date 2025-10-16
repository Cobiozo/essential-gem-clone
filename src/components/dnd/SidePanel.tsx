import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import { ElementsPanel } from './ElementsPanel';
import { ItemEditor } from '../cms/ItemEditor';
import { CMSItem } from '@/types/cms';
import { cn } from '@/lib/utils';

type PanelMode = 'elements' | 'edit';

interface SidePanelProps {
  mode: PanelMode;
  editingItem?: CMSItem | null;
  sectionId?: string;
  onModeChange: (mode: PanelMode) => void;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
  className?: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  mode,
  editingItem,
  sectionId = '',
  onModeChange,
  onSave,
  onCancel,
  className
}) => {
  if (mode === 'elements') {
    return (
      <ElementsPanel 
        className={className}
      />
    );
  }

  // Edit mode - inline editor
  return (
    <Card className={cn("w-80 h-full border-r rounded-none flex flex-col", className)}>
      <div className="p-4 border-b flex items-center justify-between bg-muted/50">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onModeChange('elements')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold">Edycja elementu</h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        {editingItem && (
          <ItemEditor
            item={editingItem}
            sectionId={sectionId}
            onSave={(item) => {
              onSave(item);
              onModeChange('elements');
            }}
            onCancel={() => {
              onCancel();
              onModeChange('elements');
            }}
            isNew={!editingItem.id}
            inline={true}
          />
        )}
      </CardContent>
    </Card>
  );
};
