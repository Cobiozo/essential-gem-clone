import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  X, 
  Undo2, 
  Redo2, 
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeviceType } from './DevicePreview';
import { useLanguage } from '@/contexts/LanguageContext';

interface EditingToolbarProps {
  isVisible: boolean;
  onSave: () => void;
  onCancel: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onPreview?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  autoSaveStatus?: 'saved' | 'saving' | 'error';
  currentDevice?: DeviceType;
  onDeviceChange?: (device: DeviceType) => void;
  className?: string;
}

export const EditingToolbar: React.FC<EditingToolbarProps> = ({
  isVisible,
  onSave,
  onCancel,
  onUndo,
  onRedo,
  onPreview,
  canUndo = false,
  canRedo = false,
  isSaving = false,
  hasUnsavedChanges = false,
  autoSaveStatus = 'saved',
  currentDevice = 'desktop',
  onDeviceChange,
  className,
}) => {
  const { t } = useLanguage();
  
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
      "bg-white dark:bg-gray-800 border border-border rounded-lg shadow-xl",
      "flex items-center gap-2 px-4 py-2",
      "animate-fade-in",
      className
    )}>
      {/* Auto-save status */}
      <div className="flex items-center gap-2">
        {autoSaveStatus === 'saving' && (
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {t('toolbar.saving')}
          </Badge>
        )}
        {autoSaveStatus === 'saved' && !hasUnsavedChanges && (
          <Badge variant="outline" className="text-xs text-green-600">
            {t('toolbar.saved')}
          </Badge>
        )}
        {autoSaveStatus === 'error' && (
          <Badge variant="destructive" className="text-xs">
            {t('toolbar.errorSaving')}
          </Badge>
        )}
        {hasUnsavedChanges && autoSaveStatus === 'saved' && (
          <Badge variant="secondary" className="text-xs text-orange-600">
            {t('toolbar.unsavedChanges')}
          </Badge>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Undo/Redo */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="px-2"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="px-2"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Responsive preview buttons */}
      <div className="flex items-center gap-1">
        <Button 
          variant={currentDevice === 'desktop' ? 'default' : 'ghost'} 
          size="sm" 
          className="px-2" 
          onClick={() => onDeviceChange?.('desktop')}
          title={t('toolbar.desktopView')}
        >
          <Monitor className="w-4 h-4" />
        </Button>
        <Button 
          variant={currentDevice === 'tablet' ? 'default' : 'ghost'} 
          size="sm" 
          className="px-2" 
          onClick={() => onDeviceChange?.('tablet')}
          title={t('toolbar.tabletView')}
        >
          <Tablet className="w-4 h-4" />
        </Button>
        <Button 
          variant={currentDevice === 'mobile' ? 'default' : 'ghost'} 
          size="sm" 
          className="px-2" 
          onClick={() => onDeviceChange?.('mobile')}
          title={t('toolbar.mobileView')}
        >
          <Smartphone className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Preview mode */}
      {onPreview && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            {t('toolbar.preview')}
          </Button>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Save/Cancel */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          {t('toolbar.cancel')}
        </Button>
        <Button
          onClick={onSave}
          size="sm"
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('toolbar.save')}
        </Button>
      </div>
    </div>
  );
};