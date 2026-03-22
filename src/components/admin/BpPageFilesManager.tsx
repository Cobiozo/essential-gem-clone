import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/storageConfig';
import { copyToClipboard } from '@/lib/clipboardUtils';
import {
  FolderPlus, Upload, Trash2, Copy, Eye, Loader2,
  FolderOpen, Plus, X, Image as ImageIcon, FileText, Wand2
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import BpFileMappingEditor from './BpFileMappingEditor';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface BpFolder {
  id: string;
  name: string;
  description: string | null;
}

interface BpFile {
  id: string;
  file_name: string;
  original_name: string;
  file_url: string;
  file_size: number;
  mime_type: string | null;
  folder: string;
  description: string | null;
  position: number;
  created_at: string;
}

export const BpPageFilesManager: React.FC = () => {
  const [folders, setFolders] = useState<BpFolder[]>([]);
  const [files, setFiles] = useState<BpFile[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('default');
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BpFile | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<BpFolder | null>(null);
  const [mappingFile, setMappingFile] = useState<BpFile | null>(null);
  const [mappedFileIds, setMappedFileIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, uploadProgress } = useLocalStorage();

  const fetchFolders = useCallback(async () => {
    const { data } = await supabase
      .from('bp_page_folders')
      .select('*')
      .order('name');
    if (data) setFolders(data);
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bp_page_files')
      .select('*')
      .eq('folder', selectedFolder)
      .order('position', { ascending: true });
    if (data) setFiles(data as BpFile[]);
    setLoading(false);
  }, [selectedFolder]);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);
  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Fetch which files have mappings
  useEffect(() => {
    const fetchMapped = async () => {
      const fileIds = files.map(f => f.id);
      if (!fileIds.length) { setMappedFileIds(new Set()); return; }
      const { data } = await supabase
        .from('bp_file_mappings')
        .select('file_id')
        .in('file_id', fileIds);
      if (data) setMappedFileIds(new Set(data.map(d => d.file_id)));
    };
    fetchMapped();
  }, [files]);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const { error } = await supabase.from('bp_page_folders').insert({ name });
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    setNewFolderName('');
    setShowNewFolder(false);
    fetchFolders();
    toast({ title: 'Folder utworzony' });
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    if (deleteFolderTarget.name === 'default') {
      toast({ title: 'Nie można usunąć domyślnego folderu', variant: 'destructive' });
      return;
    }
    // Delete files in folder first
    await supabase.from('bp_page_files').delete().eq('folder', deleteFolderTarget.name);
    await supabase.from('bp_page_folders').delete().eq('id', deleteFolderTarget.id);
    setDeleteFolderTarget(null);
    if (selectedFolder === deleteFolderTarget.name) setSelectedFolder('default');
    fetchFolders();
    fetchFiles();
    toast({ title: 'Folder usunięty' });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    const { data: { user } } = await supabase.auth.getUser();

    for (const file of Array.from(fileList)) {
      try {
        const result = await uploadFile(file, { folder: `bp-page-files/${selectedFolder}` });
        const maxPos = files.length > 0 ? Math.max(...files.map(f => f.position)) + 1 : 0;

        await supabase.from('bp_page_files').insert({
          file_name: result.fileName,
          original_name: file.name,
          file_url: result.url,
          file_size: result.fileSize,
          mime_type: result.fileType,
          folder: selectedFolder,
          position: maxPos,
          uploaded_by: user?.id || null,
        });

        toast({ title: `Przesłano: ${file.name}` });
      } catch (err: any) {
        toast({ title: 'Błąd uploadu', description: err.message, variant: 'destructive' });
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchFiles();
  };

  const handleDeleteFile = async () => {
    if (!deleteTarget) return;
    await supabase.from('bp_page_files').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchFiles();
    toast({ title: 'Plik usunięty' });
  };

  const handleCopyUrl = async (url: string) => {
    const ok = await copyToClipboard(url);
    toast({ title: ok ? 'URL skopiowany' : 'Nie udało się skopiować' });
  };

  const isImage = (mime: string | null) => mime?.startsWith('image/');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-foreground">Pliki na stronę BP</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {folders.map(f => (
                <SelectItem key={f.id} value={f.name}>
                  <span className="flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" /> {f.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="w-4 h-4 mr-1" /> Nowy folder
          </Button>

          {selectedFolder !== 'default' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                const f = folders.find(fo => fo.name === selectedFolder);
                if (f) setDeleteFolderTarget(f);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          <Button
            size="sm"
            variant="action"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* New folder inline form */}
      {showNewFolder && (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <Input
            placeholder="Nazwa folderu"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            className="max-w-xs"
          />
          <Button size="sm" onClick={handleCreateFolder}><Plus className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Files grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Brak plików w tym folderze</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {files.map((file, idx) => (
            <div
              key={file.id}
              className="group relative border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {isImage(file.mime_type) ? (
                  <img
                    src={file.file_url}
                    alt={file.original_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <FileText className="w-10 h-10 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-medium truncate text-foreground" title={file.original_name}>
                  {file.original_name}
                </p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
              </div>

              {/* Actions overlay */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setMappingFile(file)} title="Mapuj dane">
                  <Wand2 className="w-3 h-3" />
                </Button>
                {isImage(file.mime_type) && (
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setPreviewUrl(file.file_url)}>
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
                <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => handleCopyUrl(file.file_url)}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => setDeleteTarget(file)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Position badge */}
              <div className="absolute top-1 left-1 bg-background/80 text-xs px-1.5 py-0.5 rounded text-foreground">
                #{idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Podgląd</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete file confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń plik</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć "{deleteTarget?.original_name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete folder confirm */}
      <AlertDialog open={!!deleteFolderTarget} onOpenChange={() => setDeleteFolderTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń folder</AlertDialogTitle>
            <AlertDialogDescription>
              Usunięcie folderu "{deleteFolderTarget?.name}" spowoduje usunięcie wszystkich plików w nim. Kontynuować?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder}>Usuń folder</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BpPageFilesManager;
