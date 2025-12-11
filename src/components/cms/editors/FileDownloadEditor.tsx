import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2, Download, Upload, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { StyleTab } from './StyleTab';
import { IconPicker } from '../IconPicker';
import * as icons from 'lucide-react';
import { toast } from 'sonner';

interface FileDownloadEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const FileDownloadEditor: React.FC<FileDownloadEditorProps> = ({ item, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save on debounced changes
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `downloads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cms-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cms-files')
        .getPublicUrl(filePath);

      // Update cells with file info
      const newCells = [{
        type: 'file-download',
        content: editedItem.cells?.[0]?.content || 'Pobierz plik',
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }];

      setEditedItem({
        ...editedItem,
        url: publicUrl,
        cells: newCells as any
      });

      toast.success('Plik został wgrany pomyślnie');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Błąd podczas wgrywania pliku');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileInfo = () => {
    const cell = (editedItem.cells as any[])?.[0];
    return {
      fileName: cell?.fileName || '',
      fileSize: cell?.fileSize || 0,
      fileType: cell?.fileType || '',
      url: cell?.url || editedItem.url || ''
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fileInfo = getFileInfo();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Przycisk pobierania</h3>
          {isSaving && <span className="text-xs text-muted-foreground">Zapisywanie...</span>}
          {justSaved && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3" />
              <span>Zapisano</span>
            </div>
          )}
        </div>
        <Button onClick={onCancel} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Plik do pobrania</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="*/*"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wgrywanie...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Wgraj plik
                    </>
                  )}
                </Button>
                
                {fileInfo.url && (
                  <div className="p-3 bg-muted rounded-lg mt-2">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {fileInfo.fileName || 'Plik'}
                        </p>
                        {fileInfo.fileSize > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(fileInfo.fileSize)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Button Text */}
              <div className="space-y-2">
                <Label>Tekst przycisku</Label>
                <Input
                  value={(editedItem.cells as any[])?.[0]?.content || editedItem.title || ''}
                  onChange={(e) => {
                    const existingCells = (editedItem.cells || [{ type: 'file-download', content: '', url: '' }]) as any[];
                    const newCells = [...existingCells];
                    newCells[0] = { 
                      ...(newCells[0] || {}), 
                      content: e.target.value, 
                      type: 'file-download'
                    };
                    setEditedItem({ ...editedItem, title: e.target.value, cells: newCells });
                  }}
                  placeholder="Pobierz PDF"
                />
              </div>

              {/* Icon */}
              <div className="space-y-2">
                <Label>Ikona</Label>
                <IconPicker
                  value={editedItem.icon || 'Download'}
                  onChange={(iconName) => setEditedItem({ ...editedItem, icon: iconName })}
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      {editedItem.icon ? (
                        <>
                          {(() => {
                            const IconComp = (icons as any)[editedItem.icon];
                            return IconComp ? <IconComp className="w-4 h-4 mr-2" /> : <Download className="w-4 h-4 mr-2" />;
                          })()}
                          <span>{editedItem.icon}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          <span>Download</span>
                        </>
                      )}
                    </Button>
                  }
                />
              </div>

              {/* Icon Position */}
              <div className="space-y-2">
                <Label>Pozycja ikony</Label>
                <div className="flex gap-2">
                  <Button
                    variant={(editedItem as any).icon_position !== 'after' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditedItem({ ...editedItem, icon_position: 'before' } as any)}
                  >
                    Przed tekstem
                  </Button>
                  <Button
                    variant={(editedItem as any).icon_position === 'after' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditedItem({ ...editedItem, icon_position: 'after' } as any)}
                  >
                    Po tekście
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="pb-4">
              <StyleTab 
                item={editedItem} 
                onUpdate={(updates) => setEditedItem({ ...editedItem, ...updates })} 
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
