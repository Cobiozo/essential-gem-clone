import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image, Video, Loader2, FileText, Music, File, FolderOpen, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_CONFIG, formatFileSize } from '@/lib/storageConfig';

interface MediaUploadProps {
  onMediaUploaded: (url: string, type: 'image' | 'video' | 'document' | 'audio' | 'other', altText?: string) => void;
  currentMediaUrl?: string;
  currentMediaType?: 'image' | 'video' | 'document' | 'audio' | 'other';
  currentAltText?: string;
  allowedTypes?: ('image' | 'video' | 'document' | 'audio')[];
  maxSizeMB?: number | null;
  compact?: boolean;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onMediaUploaded,
  currentMediaUrl,
  currentMediaType,
  currentAltText,
  allowedTypes,
  maxSizeMB = 2048, // 2GB domyślny limit
  compact = false
}) => {
  const [altText, setAltText] = useState(currentAltText || '');
  const [urlInput, setUrlInput] = useState('');
  const [libraryFiles, setLibraryFiles] = useState<Array<{name: string, url: string, type: string}>>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const { toast } = useToast();
  const { uploadFile, uploadProgress, isUploading, listFiles } = useLocalStorage();

  const uploadMedia = async (file: File) => {
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isDocument = file.type === 'application/pdf' || 
                     file.type === 'application/msword' || 
                     file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     file.type === 'application/vnd.ms-excel' ||
                     file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-powerpoint' ||
                     file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                     file.type === 'text/plain';

    let mediaType: 'image' | 'video' | 'document' | 'audio' | 'other';

    if (isImage) {
      mediaType = 'image';
    } else if (isVideo) {
      mediaType = 'video';
    } else if (isAudio) {
      mediaType = 'audio';
    } else if (isDocument) {
      mediaType = 'document';
    } else {
      mediaType = 'other';
    }

    // Check allowed types
    if (allowedTypes && allowedTypes.length > 0) {
      const typeAllowed = allowedTypes.some(type => {
        if (type === 'image') return isImage;
        if (type === 'video') return isVideo;
        if (type === 'audio') return isAudio;
        if (type === 'document') return isDocument;
        return false;
      });
      
      if (!typeAllowed) {
        const typeNames = {
          image: 'obrazy',
          video: 'filmy wideo',
          audio: 'pliki audio',
          document: 'dokumenty'
        };
        const allowedNames = allowedTypes.map(t => typeNames[t]).join(', ');
        toast({
          title: "Nieprawidłowy typ pliku",
          description: `Dozwolone formaty: ${allowedNames}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Check file size
    const effectiveMaxSize = maxSizeMB !== null ? maxSizeMB : STORAGE_CONFIG.MAX_FILE_SIZE_MB;
    const maxSizeBytes = effectiveMaxSize * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      toast({
        title: "Plik za duży",
        description: `Maksymalny rozmiar pliku to ${effectiveMaxSize}MB. Twój plik: ${formatFileSize(file.size)}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await uploadFile(file, {
        folder: 'training-media',
        onProgress: (percent) => {
          console.log('Upload progress:', percent);
        }
      });

      onMediaUploaded(result.url, mediaType, altText);

      const typeNames = {
        image: 'Zdjęcie',
        video: 'Film',
        document: 'Dokument',
        audio: 'Plik audio',
        other: 'Plik'
      };

      toast({
        title: "Sukces",
        description: `${typeNames[mediaType]} zostało przesłane. (${formatFileSize(file.size)})`,
      });
    } catch (error: any) {
      console.error('Error uploading media:', error);
      toast({
        title: "Błąd uploadu",
        description: error.message || "Nie udało się przesłać pliku.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMedia(file);
    }
  };

  const loadLibraryFiles = async () => {
    setLoadingLibrary(true);
    try {
      const files = await listFiles('training-media');
      setLibraryFiles(files);
    } catch (error) {
      console.error('Error loading library:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować biblioteki plików",
        variant: "destructive",
      });
    } finally {
      setLoadingLibrary(false);
    }
  };

  const selectFromLibrary = (file: {name: string, url: string, type: string}) => {
    const mediaType = file.type as 'image' | 'video' | 'document' | 'audio' | 'other';
    onMediaUploaded(file.url, mediaType, altText);
    toast({
      title: "Sukces",
      description: "Plik został wybrany z biblioteki",
    });
  };

  const removeMedia = () => {
    onMediaUploaded('', 'image', '');
    setAltText('');
    setUrlInput('');
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast({
        title: "Błąd",
        description: "Wprowadź URL pliku",
        variant: "destructive",
      });
      return;
    }

    // Detect media type from URL
    const url = urlInput.toLowerCase();
    let mediaType: 'image' | 'video' | 'document' | 'audio' | 'other' = 'other';
    
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      mediaType = 'image';
    } else if (url.match(/\.(mp4|mov|avi|webm|mkv)$/) || url.includes('youtube.com') || url.includes('youtu.be')) {
      mediaType = 'video';
    } else if (url.match(/\.(mp3|wav|ogg|m4a)$/)) {
      mediaType = 'audio';
    } else if (url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/)) {
      mediaType = 'document';
    }

    onMediaUploaded(urlInput, mediaType, altText);
    setUrlInput('');
    
    toast({
      title: "Sukces",
      description: "URL został dodany",
    });
  };

  const getAcceptString = () => {
    if (!allowedTypes || allowedTypes.length === 0) {
      return "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";
    }
    const acceptMap = {
      image: "image/*",
      video: "video/*",
      audio: "audio/*",
      document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
    };
    return allowedTypes.map(t => acceptMap[t]).join(',');
  };

  const getHelpText = () => {
    const effectiveMaxSize = maxSizeMB !== null ? maxSizeMB : STORAGE_CONFIG.MAX_FILE_SIZE_MB;
    
    if (!allowedTypes || allowedTypes.length === 0) {
      return `Dozwolone formaty: JPG, PNG, GIF, MP4, MOV, AVI, MP3, WAV, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (max ${effectiveMaxSize >= 1024 ? (effectiveMaxSize / 1024) + 'GB' : effectiveMaxSize + 'MB'})`;
    }
    
    const formatMap = {
      image: "JPG, PNG, GIF",
      video: "MP4, MOV, AVI, WebM",
      audio: "MP3, WAV, OGG",
      document: "PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT"
    };
    const formats = allowedTypes.map(t => formatMap[t]).join(', ');
    
    return `Dozwolone formaty: ${formats} (max ${effectiveMaxSize >= 1024 ? (effectiveMaxSize / 1024) + 'GB' : effectiveMaxSize + 'MB'})`;
  };

  return (
    <div className={compact ? "space-y-1.5" : "space-y-4"}>
      <div>
        {!compact && <Label>Plik multimedialny</Label>}
        <Tabs defaultValue="upload" className={compact ? "mt-0" : "mt-2"}>
          <TabsList className={`grid w-full grid-cols-3 ${compact ? "h-7" : ""}`}>
            <TabsTrigger value="upload" className={compact ? "text-[10px] h-6 px-1" : "text-xs"}>
              <Upload className={compact ? "w-2.5 h-2.5 mr-0.5" : "w-3 h-3 mr-1"} />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className={compact ? "text-[10px] h-6 px-1" : "text-xs"}>
              <LinkIcon className={compact ? "w-2.5 h-2.5 mr-0.5" : "w-3 h-3 mr-1"} />
              URL
            </TabsTrigger>
            <TabsTrigger value="library" className={compact ? "text-[10px] h-6 px-1" : "text-xs"} onClick={loadLibraryFiles}>
              <FolderOpen className={compact ? "w-2.5 h-2.5 mr-0.5" : "w-3 h-3 mr-1"} />
              Biblioteka
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className={compact ? "space-y-1 mt-1" : "space-y-3"}>
            <Input
              id="media-upload"
              type="file"
              accept={getAcceptString()}
              onChange={handleFileSelect}
              disabled={isUploading}
              className={compact ? "cursor-pointer h-7 text-[10px]" : "cursor-pointer"}
            />
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Przesyłanie... {uploadProgress}%
                </p>
              </div>
            )}
            {!compact && (
              <p className="text-xs text-muted-foreground">
                {getHelpText()}
              </p>
            )}
          </TabsContent>

          <TabsContent value="url" className={compact ? "space-y-1 mt-1" : "space-y-3"}>
            <div className="flex gap-1">
              <Input
                type="url"
                placeholder="https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className={compact ? "h-7 text-[10px]" : ""}
              />
              <Button 
                onClick={handleUrlSubmit} 
                size={compact ? "sm" : "default"}
                className={compact ? "h-7 px-2 text-[10px]" : ""}
              >
                Dodaj
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="library" className={compact ? "mt-1" : "mt-2"}>
            {loadingLibrary ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Ładowanie...</span>
              </div>
            ) : libraryFiles.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Brak plików w bibliotece
              </div>
            ) : (
              <ScrollArea className={compact ? "h-24" : "h-40"}>
                <div className="grid grid-cols-3 gap-1.5 p-1">
                  {libraryFiles.filter(f => f.type === 'image').map((file) => (
                    <button
                      key={file.name}
                      onClick={() => selectFromLibrary(file)}
                      className="aspect-square border rounded overflow-hidden hover:ring-2 hover:ring-primary transition-all bg-muted"
                    >
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {libraryFiles.filter(f => f.type !== 'image').map((file) => (
                    <button
                      key={file.name}
                      onClick={() => selectFromLibrary(file)}
                      className="aspect-square border rounded flex flex-col items-center justify-center hover:ring-2 hover:ring-primary transition-all bg-muted p-1"
                    >
                      {file.type === 'video' && <Video className="w-6 h-6 text-primary" />}
                      {file.type === 'audio' && <Music className="w-6 h-6 text-primary" />}
                      {file.type === 'document' && <FileText className="w-6 h-6 text-primary" />}
                      {file.type === 'other' && <File className="w-6 h-6 text-primary" />}
                      <span className="text-[8px] text-muted-foreground mt-1 truncate w-full text-center">
                        {file.name.split('/').pop()?.substring(0, 12)}...
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Alt text input */}
      {!compact && (
        <div>
          <Label htmlFor="alt-text">Tekst alternatywny (opcjonalnie)</Label>
          <Input
            id="alt-text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Opis dla osób niewidomych"
            className="mt-1"
          />
        </div>
      )}

      {/* Current media preview */}
      {currentMediaUrl && (
        <Card className={compact ? "mt-1" : "mt-4"}>
          <CardContent className={compact ? "p-2" : "p-4"}>
            <div className="flex items-start gap-3">
              <div className={compact ? "w-12 h-12 flex-shrink-0" : "w-20 h-20 flex-shrink-0"}>
              {currentMediaType === 'image' ? (
                  <img
                    src={currentMediaUrl}
                    alt={currentAltText || 'Media'}
                    className="w-full h-full object-cover rounded"
                  />
                ) : currentMediaType === 'video' ? (
                  <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                    <Video className={compact ? "w-4 h-4" : "w-8 h-8"} />
                  </div>
                ) : currentMediaType === 'audio' ? (
                  <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                    <Music className={compact ? "w-4 h-4" : "w-8 h-8"} />
                  </div>
                ) : currentMediaType === 'document' ? (
                  <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                    <FileText className={compact ? "w-4 h-4" : "w-8 h-8"} />
                  </div>
                ) : (
                  <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                    <File className={compact ? "w-4 h-4" : "w-8 h-8"} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <Badge variant="outline" className={compact ? "text-[9px] px-1 py-0" : "mb-1"}>
                  {currentMediaType}
                </Badge>
                <p className={`truncate text-muted-foreground max-w-[150px] ${compact ? "text-[9px]" : "text-xs"}`}>
                  {currentMediaUrl.split('/').pop()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeMedia}
                className={`flex-shrink-0 ${compact ? "h-5 w-5" : "h-8 w-8"}`}
              >
                <X className={compact ? "w-3 h-3" : "w-4 h-4"} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
