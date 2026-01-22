import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, Search, Grid3X3, List, Download, Copy, Trash2, 
  Image, Video, FileText, Music, File, X, Check, Plus,
  FolderOpen, ExternalLink, MoreVertical, Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MediaFile {
  id: string;
  file_name: string;
  original_name: string;
  file_url: string;
  file_size: number;
  file_type: 'image' | 'video' | 'document' | 'audio' | 'other';
  mime_type: string | null;
  storage_bucket: string;
  folder: string;
  description: string | null;
  tags: string[];
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminMediaLibraryProps {
  mode?: 'standalone' | 'picker';
  onSelect?: (file: MediaFile) => void;
  allowedTypes?: ('image' | 'video' | 'document' | 'audio' | 'other')[];
}

const FILE_TYPE_ICONS: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
  document: FileText,
  audio: Music,
  other: File,
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const detectFileType = (fileName: string): 'image' | 'video' | 'document' | 'audio' | 'other' => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(ext)) return 'document';
  return 'other';
};

const getBucketForFileType = (fileType: string): string => {
  switch (fileType) {
    case 'image': return 'cms-images';
    case 'video': return 'cms-videos';
    default: return 'cms-files';
  }
};

export const AdminMediaLibrary: React.FC<AdminMediaLibraryProps> = ({
  mode = 'standalone',
  onSelect,
  allowedTypes,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadFile, deleteFile, isUploading, uploadProgress } = useLocalStorage();
  
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  
  // Fetch files from database
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_media_library')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFiles((data || []) as MediaFile[]);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać plików z biblioteki.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);
  
  // Filter files
  const filteredFiles = files.filter(file => {
    const matchesSearch = 
      file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || file.file_type === filterType;
    const matchesAllowed = !allowedTypes || allowedTypes.includes(file.file_type);
    
    return matchesSearch && matchesType && matchesAllowed;
  });
  
  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    
    for (const file of Array.from(fileList)) {
      try {
        const fileType = detectFileType(file.name);
        const bucket = getBucketForFileType(fileType);
        
        const result = await uploadFile(file, { folder: 'admin-library' });
        
        if (!result.success || !result.url) {
          throw new Error('Upload failed');
        }
        
        // Save metadata to database
        const { error: dbError } = await supabase
          .from('admin_media_library')
          .insert({
            file_name: result.fileName || file.name,
            original_name: file.name,
            file_url: result.url,
            file_size: result.fileSize || file.size,
            file_type: fileType,
            mime_type: file.type,
            storage_bucket: bucket,
            folder: 'admin-library',
            uploaded_by: user?.id,
            tags: [],
          });
        
        if (dbError) throw dbError;
        
        toast({
          title: 'Sukces',
          description: `Plik "${file.name}" został przesłany.`,
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Błąd przesyłania',
          description: `Nie udało się przesłać pliku "${file.name}".`,
          variant: 'destructive',
        });
      }
    }
    
    // Reset input and refresh
    e.target.value = '';
    fetchFiles();
  };
  
  // Delete handler
  const handleDelete = async (file: MediaFile) => {
    if (!confirm(`Czy na pewno chcesz usunąć plik "${file.original_name}"?`)) return;
    
    try {
      // Delete from storage
      await deleteFile(file.file_url);
      
      // Delete from database
      const { error } = await supabase
        .from('admin_media_library')
        .delete()
        .eq('id', file.id);
      
      if (error) throw error;
      
      toast({ title: 'Usunięto', description: 'Plik został usunięty.' });
      setDetailsOpen(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć pliku.',
        variant: 'destructive',
      });
    }
  };
  
  // Copy URL to clipboard
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Skopiowano', description: 'URL skopiowany do schowka.' });
  };
  
  // Copy Markdown
  const copyMarkdown = (file: MediaFile) => {
    const markdown = file.file_type === 'image' 
      ? `![${file.original_name}](${file.file_url})`
      : `[${file.original_name}](${file.file_url})`;
    navigator.clipboard.writeText(markdown);
    toast({ title: 'Skopiowano', description: 'Markdown skopiowany do schowka.' });
  };
  
  // Download file
  const downloadFile = (file: MediaFile) => {
    const link = document.createElement('a');
    link.href = file.file_url;
    link.download = file.original_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Update file metadata
  const updateFileMetadata = async () => {
    if (!selectedFile) return;
    
    try {
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from('admin_media_library')
        .update({
          description: editDescription,
          tags: tagsArray,
        })
        .eq('id', selectedFile.id);
      
      if (error) throw error;
      
      toast({ title: 'Zaktualizowano', description: 'Metadane pliku zostały zapisane.' });
      fetchFiles();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować metadanych.',
        variant: 'destructive',
      });
    }
  };
  
  // Open file details
  const openDetails = (file: MediaFile) => {
    setSelectedFile(file);
    setEditDescription(file.description || '');
    setEditTags(file.tags.join(', '));
    setDetailsOpen(true);
  };
  
  // Handle file selection in picker mode
  const handleSelect = (file: MediaFile) => {
    if (mode === 'picker' && onSelect) {
      onSelect(file);
    } else {
      openDetails(file);
    }
  };
  
  // Render file card
  const renderFileCard = (file: MediaFile) => {
    const IconComponent = FILE_TYPE_ICONS[file.file_type] || File;
    
    return (
      <Card 
        key={file.id}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
          mode === 'picker' && "hover:ring-2 hover:ring-primary"
        )}
        onClick={() => handleSelect(file)}
      >
        <CardContent className="p-3">
          {/* Thumbnail / Icon */}
          <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center overflow-hidden">
            {file.file_type === 'image' ? (
              <img 
                src={file.file_url} 
                alt={file.original_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : file.file_type === 'video' ? (
              <video 
                src={file.file_url}
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              <IconComponent className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          
          {/* File info */}
          <div className="space-y-1">
            <p className="text-sm font-medium truncate" title={file.original_name}>
              {file.original_name}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatFileSize(file.file_size)}</span>
              <Badge variant="outline" className="text-xs">
                {file.file_type}
              </Badge>
            </div>
          </div>
          
          {/* Quick actions */}
          {mode === 'standalone' && (
            <div className="flex gap-1 mt-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); copyUrl(file.file_url); }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); downloadFile(file); }}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-destructive"
                onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
          {/* Select button in picker mode */}
          {mode === 'picker' && (
            <Button 
              size="sm" 
              className="w-full mt-2"
              onClick={(e) => { e.stopPropagation(); handleSelect(file); }}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Wybierz
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };
  
  // Render list item
  const renderListItem = (file: MediaFile) => {
    const IconComponent = FILE_TYPE_ICONS[file.file_type] || File;
    
    return (
      <div 
        key={file.id}
        className={cn(
          "flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-all hover:bg-muted/50",
          mode === 'picker' && "hover:ring-2 hover:ring-primary"
        )}
        onClick={() => handleSelect(file)}
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden shrink-0">
          {file.file_type === 'image' ? (
            <img 
              src={file.file_url} 
              alt={file.original_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <IconComponent className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.original_name}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatFileSize(file.file_size)}</span>
            <span>•</span>
            <span>{new Date(file.created_at).toLocaleDateString('pl-PL')}</span>
          </div>
        </div>
        
        {/* Tags */}
        {file.tags.length > 0 && (
          <div className="hidden md:flex gap-1">
            {file.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {file.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{file.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {/* Actions */}
        {mode === 'standalone' ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => copyUrl(file.file_url)}>
                <Copy className="h-4 w-4 mr-2" /> Kopiuj URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyMarkdown(file)}>
                <FileText className="h-4 w-4 mr-2" /> Kopiuj Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadFile(file)}>
                <Download className="h-4 w-4 mr-2" /> Pobierz
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" /> Otwórz w nowej karcie
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => handleDelete(file)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSelect(file); }}>
            Wybierz
          </Button>
        )}
      </div>
    );
  };
  
  return (
    <div className={cn(
      "flex flex-col",
      mode === 'standalone' ? "h-full" : "h-[70vh]"
    )}>
      {/* Header */}
      <div className="flex flex-col gap-4 p-4 border-b bg-card shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Biblioteka mediów</h2>
            <Badge variant="secondary">{files.length} plików</Badge>
          </div>
          
          {/* Upload button */}
          <div className="flex items-center gap-2">
            <Input
              type="file"
              id="media-upload"
              className="hidden"
              multiple
              onChange={handleFileUpload}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />
            <Label htmlFor="media-upload" asChild>
              <Button disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Prześlij pliki
                  </>
                )}
              </Button>
            </Label>
          </div>
        </div>
        
        {/* Search and filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj plików..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          
          {/* Type filter tabs */}
          <Tabs value={filterType} onValueChange={setFilterType} className="shrink-0">
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-3">Wszystkie</TabsTrigger>
              <TabsTrigger value="image" className="text-xs px-3">
                <Image className="h-3.5 w-3.5 mr-1" />Obrazy
              </TabsTrigger>
              <TabsTrigger value="video" className="text-xs px-3">
                <Video className="h-3.5 w-3.5 mr-1" />Wideo
              </TabsTrigger>
              <TabsTrigger value="document" className="text-xs px-3">
                <FileText className="h-3.5 w-3.5 mr-1" />Dokumenty
              </TabsTrigger>
              <TabsTrigger value="audio" className="text-xs px-3">
                <Music className="h-3.5 w-3.5 mr-1" />Audio
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* View mode toggle */}
          <div className="flex border rounded-md shrink-0">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Brak plików</p>
              <p className="text-sm">
                {searchQuery || filterType !== 'all' 
                  ? 'Zmień kryteria wyszukiwania'
                  : 'Prześlij pliki, aby zacząć'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredFiles.map(renderFileCard)}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map(renderListItem)}
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* File details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Szczegóły pliku</DialogTitle>
          </DialogHeader>
          
          {selectedFile && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="bg-muted rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                {selectedFile.file_type === 'image' ? (
                  <img 
                    src={selectedFile.file_url} 
                    alt={selectedFile.original_name}
                    className="max-h-[300px] max-w-full object-contain rounded"
                  />
                ) : selectedFile.file_type === 'video' ? (
                  <video 
                    src={selectedFile.file_url}
                    controls
                    className="max-h-[300px] max-w-full rounded"
                  />
                ) : selectedFile.file_type === 'audio' ? (
                  <audio src={selectedFile.file_url} controls className="w-full" />
                ) : (
                  <div className="text-center">
                    {React.createElement(FILE_TYPE_ICONS[selectedFile.file_type] || File, {
                      className: "h-16 w-16 text-muted-foreground mx-auto mb-2"
                    })}
                    <p className="text-muted-foreground">Podgląd niedostępny</p>
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nazwa:</span>
                  <p className="font-medium break-all">{selectedFile.original_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rozmiar:</span>
                  <p className="font-medium">{formatFileSize(selectedFile.file_size)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Typ:</span>
                  <p className="font-medium">{selectedFile.mime_type || selectedFile.file_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data dodania:</span>
                  <p className="font-medium">
                    {new Date(selectedFile.created_at).toLocaleDateString('pl-PL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              {/* Editable fields */}
              <div className="space-y-3">
                <div>
                  <Label>Opis</Label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Dodaj opis pliku..."
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label>Tagi (oddzielone przecinkami)</Label>
                  <Input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="np. logo, banner, 2024"
                  />
                </div>
              </div>
              
              {/* URL */}
              <div>
                <Label>URL pliku</Label>
                <div className="flex gap-2">
                  <Input value={selectedFile.file_url} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyUrl(selectedFile.file_url)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-wrap gap-2">
            <div className="flex gap-2 flex-1">
              <Button variant="outline" onClick={() => selectedFile && copyMarkdown(selectedFile)}>
                <FileText className="h-4 w-4 mr-2" />
                Kopiuj Markdown
              </Button>
              <Button variant="outline" onClick={() => selectedFile && downloadFile(selectedFile)}>
                <Download className="h-4 w-4 mr-2" />
                Pobierz
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => selectedFile && handleDelete(selectedFile)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń
              </Button>
            </div>
            <Button onClick={updateFileMetadata}>
              Zapisz zmiany
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
