import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

interface SoundCloudEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const SoundCloudEditor: React.FC<SoundCloudEditorProps> = ({ item, onSave, onCancel }) => {
  const { t } = useLanguage();
  const soundcloudCell = (item.cells as any[])?.[0] || {};
  const [url, setUrl] = useState(soundcloudCell.url || '');
  const [height, setHeight] = useState(soundcloudCell.height || 166);
  
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const debouncedItemString = JSON.stringify(debouncedItem);
    if (debouncedItem && debouncedItemString !== prevItemRef.current) {
      setIsSaving(true);
      onSave(debouncedItem);
      prevItemRef.current = debouncedItemString;
      
      setTimeout(() => {
        setIsSaving(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }, 300);
    }
  }, [debouncedItem, onSave]);

  const updateCell = (updates: any) => {
    const updatedCells = [{
      type: 'soundcloud',
      url,
      height,
      position: 0,
      is_active: true,
      content: '',
      ...updates
    }] as any;
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
    });
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    updateCell({ url: value });
  };

  const handleHeightChange = (value: string) => {
    const numValue = parseInt(value) || 166;
    setHeight(numValue);
    updateCell({ height: numValue });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          SoundCloud
          {isSaving && <span className="text-xs text-muted-foreground">({t('cms.saving')})</span>}
          {justSaved && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </h3>
        <div className="flex gap-2">
          <Button onClick={() => onSave(editedItem)} size="sm">
            {t('common.save')}
          </Button>
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <Label>{t('cms.soundcloudUrl')}</Label>
            <Input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://soundcloud.com/..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('cms.soundcloudUrlHint')}
            </p>
          </div>

          <div>
            <Label>{t('cms.heightPx')}</Label>
            <Input
              type="number"
              value={height}
              onChange={(e) => handleHeightChange(e.target.value)}
              placeholder="166"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('cms.heightHintSingle')}
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
