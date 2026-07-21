import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, X, Image, Video, Loader2, FileText, Music, File, FolderOpen, Link as LinkIcon, Info, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_CONFIG, formatFileSize } from '@/lib/storageConfig';

interface MediaUploadProps {
  onMediaUploaded: (url: string, type: 'image' | 'video' | 'document' | 'audio' | 'other', altText?: string, durationSeconds?: number) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef(false);
  const inputId = useRef(`media-upload-${Math.random().toString(36).slice(2)}`);
  const { toast } = useToast();
  const { uploadFile, deleteFile, uploadProgress, uploadStage, isUploading, listFiles } = useLocalStorage();
  const prevStageRef = useRef(uploadStage);
  const lastUploadKindRef = useRef<'image' | 'video' | 'document' | 'audio' | 'other' | null>(null);

  // Toast po zakończeniu przetwarzania serwerowego (istotne przy dużych wideo, gdzie ffmpeg transkoduje).
  useEffect(() => {
    const wasProcessing = prevStageRef.current === 'processing' || prevStageRef.current === 'verifying';
    if (wasProcessing && uploadStage === 'done' && lastUploadKindRef.current === 'video') {
      toast({
        title: '✅ Przetwarzanie zakończone',
        description: 'Wideo zostało zoptymalizowane pod iPhone/Safari i jest gotowe do publikacji.',
      });
    }
    prevStageRef.current = uploadStage;
  }, [uploadStage, toast]);

  const uploadMedia = async (file: File) => {
    if (!file || isUploading) return;

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

    // Walidacja kompatybilności wideo z iPhone/Safari.
    // Safari nie odtwarza WebM/MKV/AVI/WMV/FLV oraz HEVC/H.265 w kontenerze MP4/MOV.
    const fileName = file.name.toLowerCase();
    if (isVideo) {
      const ext = fileName.split('.').pop() || '';
      const hardBlocked = ['webm', 'mkv', 'avi', 'wmv', 'flv', 'ogv'];
      if (hardBlocked.includes(ext)) {
        toast({
          title: `Format .${ext} nieobsługiwany na iPhone`,
          description: "Safari nie odtworzy tego pliku. Skonwertuj do MP4 (H.264 + AAC), np. w HandBrake lub ffmpeg: ffmpeg -i input -c:v libx264 -c:a aac -movflags +faststart output.mp4",
          variant: "destructive",
        });
        return;
      }
      if (ext === 'mov') {
        toast({
          title: "Uwaga: Format MOV",
          description: "Pliki MOV z iPhone są często zapisane w HEVC/H.265 — Safari na starszych iPhone'ach ich nie odtworzy. Zalecana konwersja do MP4 H.264 + AAC z opcją 'Web Optimized' (FastStart).",
          variant: "destructive",
        });
      }
      // Test dekodera przeglądarki — jeśli lokalna Safari/Chrome nie potrafi zdekodować, ostrzeż admina.
      try {
        const ok = await new Promise<boolean>((resolve) => {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.muted = true;
          const url = URL.createObjectURL(file);
          const cleanup = () => { URL.revokeObjectURL(url); };
          v.onloadedmetadata = () => {
            const good = v.videoWidth > 0 && v.videoHeight > 0;
            cleanup();
            resolve(good);
          };
          v.onerror = () => { cleanup(); resolve(false); };
          setTimeout(() => { cleanup(); resolve(true); }, 4000); // niepewne = daj przejść
          v.src = url;
        });
        if (!ok) {
          toast({
            title: "Plik prawdopodobnie w HEVC/H.265",
            description: "Twoja przeglądarka nie zdołała odczytać metadanych. Safari na iPhone również nie odtworzy tego wideo. Skonwertuj do MP4 H.264 + AAC przed publikacją.",
            variant: "destructive",
          });
          // nie blokujemy — admin zdecyduje, ale ostrzegamy
        }
      } catch {
        // ignore
      }
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
      // Dla wideo: wykryj duration z LOKALNEGO pliku PRZED uploadem
      let localDuration = 0;
      if (mediaType === 'video') {
        try {
          localDuration = await new Promise<number>((resolve, reject) => {
            const videoEl = document.createElement('video');
            videoEl.preload = 'metadata';
            const objectUrl = URL.createObjectURL(file);
            videoEl.src = objectUrl;
            videoEl.onloadedmetadata = () => {
              const dur = Math.floor(videoEl.duration);
              URL.revokeObjectURL(objectUrl);
              resolve(dur);
            };
            videoEl.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              resolve(0);
            };
            // Timeout 5s na detekcję metadanych
            setTimeout(() => {
              URL.revokeObjectURL(objectUrl);
              resolve(0);
            }, 5000);
          });
        } catch {
          localDuration = 0;
        }
      }

      lastUploadKindRef.current = mediaType;
      const result = await uploadFile(file, {
        folder: 'training-media',
        onProgress: (percent) => {
          console.log('Upload progress:', percent);
        }
      });

      const typeNames = {
        image: 'Zdjęcie',
        video: 'Film',
        document: 'Dokument',
        audio: 'Plik audio',
        other: 'Plik'
      };

      if (mediaType === 'video' && localDuration > 0) {
        onMediaUploaded(result.url, mediaType, altText, localDuration);
        toast({
          title: "Sukces",
          description: `${typeNames[mediaType]} zostało przesłane. (${formatFileSize(file.size)}, czas: ${Math.floor(localDuration / 60)}:${String(localDuration % 60).padStart(2, '0')})`,
        });
      } else {
        onMediaUploaded(result.url, mediaType, altText, localDuration);
        toast({
          title: "Sukces",
          description: `${typeNames[mediaType]} zostało przesłane. (${formatFileSize(file.size)})`,
        });
      }
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
    if (!file) return;

    // Natychmiast wyczyść input - zapobiega ponownemu triggerowi przy re-renderze
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Blokada na poziomie komponentu
    if (isUploadingRef.current) {
      console.warn('Upload already in progress, ignoring duplicate');
      return;
    }
    isUploadingRef.current = true;

    uploadMedia(file).finally(() => {
      isUploadingRef.current = false;
    });
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
    
    // For video files from library, detect duration
    if (mediaType === 'video') {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.src = file.url;
      
      videoElement.onloadedmetadata = () => {
        const durationSeconds = Math.floor(videoElement.duration);
        onMediaUploaded(file.url, mediaType, altText, durationSeconds);
        toast({
          title: "Sukces",
          description: `Plik został wybrany z biblioteki (czas: ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')})`,
        });
      };
      
      videoElement.onerror = () => {
        onMediaUploaded(file.url, mediaType, altText, 0);
        toast({
          title: "Sukces",
          description: "Plik został wybrany z biblioteki",
        });
      };
    } else {
      onMediaUploaded(file.url, mediaType, altText, 0);
      toast({
        title: "Sukces",
        description: "Plik został wybrany z biblioteki",
      });
    }
  };

  const removeMedia = async () => {
    // Delete file from server if it exists
    if (currentMediaUrl) {
      const result = await deleteFile(currentMediaUrl);
      if (result.success) {
        toast({
          title: "Sukces",
          description: "Plik został usunięty z serwera",
        });
      } else {
        console.warn('Could not delete file from server:', result.error);
      }
    }
    
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

    // For video URLs, try to detect duration
    if (mediaType === 'video' && !url.includes('youtube.com') && !url.includes('youtu.be')) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.src = urlInput;
      
      videoElement.onloadedmetadata = () => {
        const durationSeconds = Math.floor(videoElement.duration);
        onMediaUploaded(urlInput, mediaType, altText, durationSeconds);
        setUrlInput('');
        toast({
          title: "Sukces",
          description: `URL został dodany (czas: ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')})`,
        });
      };
      
      videoElement.onerror = () => {
        onMediaUploaded(urlInput, mediaType, altText, 0);
        setUrlInput('');
        toast({
          title: "Sukces",
          description: "URL został dodany",
        });
      };
    } else {
      onMediaUploaded(urlInput, mediaType, altText, 0);
      setUrlInput('');
      
      toast({
        title: "Sukces",
        description: "URL został dodany",
      });
    }
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
              ref={fileInputRef}
              id={inputId.current}
              type="file"
              accept={getAcceptString()}
              onChange={handleFileSelect}
              disabled={isUploading}
              className={compact ? "cursor-pointer h-7 text-[10px]" : "cursor-pointer"}
            />
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                {uploadStage === 'transferring' && (
                  <p className="text-xs text-muted-foreground text-center">
                    Przesyłanie... {uploadProgress}%
                  </p>
                )}
                {uploadStage === 'processing' && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border rounded-md p-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin mt-0.5 shrink-0 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground flex items-center gap-1">
                        Optymalizacja wideo na serwerze…
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              Serwer konwertuje wideo do formatu H.264 + AAC (MP4) zgodnego z iPhone/Safari.
                              Dla dużych plików może to potrwać kilka minut. Nie zamykaj tej karty — po zakończeniu
                              pojawi się powiadomienie.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </p>
                      <p className="mt-0.5">
                        Może potrwać kilka minut przy dużych plikach. Nie zamykaj karty.
                      </p>
                    </div>
                  </div>
                )}
                {uploadStage === 'verifying' && (
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Weryfikacja pliku…
                  </p>
                )}
                {uploadStage === 'done' && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Gotowe — plik przesłany i przetworzony
                  </p>
                )}
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
