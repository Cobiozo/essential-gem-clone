import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, X, Image, Video, Loader2, FileText, Music, File, FolderOpen, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SecureMedia } from './SecureMedia';

interface MediaUploadProps {
  onMediaUploaded: (url: string, type: 'image' | 'video' | 'document' | 'audio' | 'other', altText?: string) => void;
  currentMediaUrl?: string;
  currentMediaType?: 'image' | 'video' | 'document' | 'audio' | 'other';
  currentAltText?: string;
  allowedTypes?: ('image' | 'video' | 'document' | 'audio')[];
  maxSizeMB?: number | null;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onMediaUploaded,
  currentMediaUrl,
  currentMediaType,
  currentAltText,
  allowedTypes,
  maxSizeMB = 50
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [altText, setAltText] = useState(currentAltText || '');
  const [urlInput, setUrlInput] = useState('');
  const [libraryFiles, setLibraryFiles] = useState<Array<{name: string, url: string, type: string}>>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const { toast } = useToast();

  const compressFile = async (file: File): Promise<File> => {
    const fileSizeMB = file.size / (1024 * 1024);
    
    // Only compress images over 49MB
    if (fileSizeMB <= 49 || !file.type.startsWith('image/')) {
      return file; // Return original file without any modifications
    }

    showCompressionProgress("Rozpoczynanie kompresji obrazu...");
    return compressImage(file);
  };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');
      
      img.onload = () => {
        const fileSizeMB = file.size / (1024 * 1024);
        let scaleFactor = 0.8; // Default compression
        let quality = 0.8;
        
        // Aggressive compression for very large files
        if (fileSizeMB > 100) {
          scaleFactor = 0.5;
          quality = 0.6;
        } else if (fileSizeMB > 75) {
          scaleFactor = 0.6;
          quality = 0.7;
        } else if (fileSizeMB > 50) {
          scaleFactor = 0.7;
          quality = 0.75;
        }

        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              // Convert Blob to File properly
              const buffer = await blob.arrayBuffer();
              const compressedFile = new (File as any)(
                [buffer], 
                file.name, 
                { type: blob.type }
              );
              
              const newSizeMB = blob.size / (1024 * 1024);
              showCompressionProgress(`Kompresja zakończona: ${Math.round(fileSizeMB)}MB → ${Math.round(newSizeMB)}MB`);
              resolve(compressedFile);
            } catch (e) {
              console.error('Blob to File conversion failed:', e);
              resolve(file); // Fallback to original
            }
          } else {
            resolve(file); // Fallback to original
          }
        }, file.type, quality);
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const showCompressionProgress = (message: string) => {
    toast({
      title: "Kompresja pliku",
      description: message,
      duration: 3000,
    });
  };

  const uploadMedia = async (originalFile: File) => {
    if (!originalFile) return;

    // For videos, skip compression entirely - upload original
    const isVideo = originalFile.type.startsWith('video/');
    let file = originalFile;
    
    // Only compress large images
    if (!isVideo && originalFile.size > 49 * 1024 * 1024) {
      try {
        file = await compressFile(originalFile);
      } catch (error) {
        console.error('Compression error:', error);
        toast({
          title: "Ostrzeżenie",
          description: "Nie udało się skompresować pliku. Kontynuowanie z oryginalnym plikiem.",
          variant: "default",
        });
      }
    }

    const isImage = file.type.startsWith('image/');
    // isVideo already declared above
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
    let bucket: string;

    if (isImage) {
      mediaType = 'image';
      bucket = 'training-media';
    } else if (isVideo) {
      mediaType = 'video';
      bucket = 'training-media';
    } else if (isAudio) {
      mediaType = 'audio';
      bucket = 'training-media';
    } else if (isDocument) {
      mediaType = 'document';
      bucket = 'training-media';
    } else {
      mediaType = 'other';
      bucket = 'training-media';
    }
    
    console.log('=== UPLOAD DEBUG ===');
    console.log('Media type:', mediaType);
    console.log('Bucket:', bucket);
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: Math.round(file.size / (1024 * 1024)) + 'MB',
      isVideo,
      isImage
    });

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

    // Check file size if limit is set (skip for videos in training)
    if (maxSizeMB !== null && maxSizeMB > 0) {
      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        // For videos, show warning but allow upload
        if (isVideo) {
          toast({
            title: "Duży plik wideo",
            description: `Plik ma ${Math.round(file.size / (1024 * 1024))}MB. Upload może potrwać dłużej.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Plik za duży",
            description: `Maksymalny rozmiar pliku to ${maxSizeMB}MB.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setUploading(true);
    setUploadProgress(0);

    // Adjust progress simulation for large files
    const fileSize = file.size / (1024 * 1024); // Size in MB
    const progressSpeed = fileSize > 100 ? 500 : fileSize > 50 ? 300 : 200; // Slower for larger files

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + (fileSize > 100 ? 5 : 10); // Smaller increments for large files
      });
    }, progressSpeed);

    try {
      console.log('=== UPLOAD START ===');
      
      // Debug: Check auth state
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session exists:', !!session);
      console.log('User ID:', session?.user?.id);
      
      if (!session) {
        throw new Error('Musisz być zalogowany, aby przesyłać pliki');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      console.log('=== UPLOAD DETAILS ===');
      console.log('Target bucket:', bucket);
      console.log('File path:', filePath);
      console.log('File size:', Math.round(fileSize), 'MB');
      console.log('File type:', file.type);
      console.log('File name:', file.name);
      console.log('Content type:', file.type);

      console.log('=== CALLING SUPABASE STORAGE ===');
      // Direct upload without bucket test
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });
      
      console.log('=== SUPABASE RESPONSE ===');
      console.log('Error:', uploadError);
      console.log('Data:', uploadData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        console.error('Upload error message:', uploadError.message);
        console.error('Upload error status:', (uploadError as any).statusCode);
        throw uploadError;
      }
      
      console.log('Upload successful:', uploadData);

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onMediaUploaded(data.publicUrl, mediaType, altText);

      const typeNames = {
        image: 'Zdjęcie',
        video: 'Film',
        document: 'Dokument',
        audio: 'Plik audio',
        other: 'Plik'
      };

      toast({
        title: "Sukces",
        description: `${typeNames[mediaType]} zostało przesłane.`,
      });
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('Error uploading media:', error);
      
      // Better error handling - don't break the form
      let errorMessage = "Nie udało się przesłać pliku.";
      let errorTitle = "Błąd uploadu";
      
      const isVideo = file.type.startsWith('video/');
      const fileSizeMB = file.size / (1024 * 1024);
      
      // Check for specific error types
      if (error.message?.includes('413') || 
          error.message?.includes('too large') ||
          error.message?.includes('exceeded the maximum allowed size') ||
          (error.error === 'Payload too large')) {
        errorTitle = "Plik za duży";
        errorMessage = `Plik wideo jest za duży dla serwera (limit Supabase: ~50MB). 
        
Sugestie:
• Zmniejsz jakość wideo (np. z 4K na 1080p)
• Skróć długość filmu
• Użyj kompresji wideo (np. HandBrake, FFmpeg)
• Podziel długi film na krótsze części`;
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
        // "Failed to fetch" for videos often means file too large
        if (isVideo && fileSizeMB > 40) {
          errorTitle = "Prawdopodobnie plik za duży";
          errorMessage = `Upload wideo nie powiódł się. Plik ma ${Math.round(fileSizeMB)}MB.

Supabase ma limit ~50MB. Sugestie:
• Skompresuj wideo (HandBrake, FFmpeg, lub online)
• Zmniejsz rozdzielczość (np. 1080p → 720p)
• Skróć długość filmu
• Podziel na krótsze części`;
        } else {
          errorMessage = "Problem z połączeniem lub plik jest za duży. Sprawdź połączenie i rozmiar pliku.";
        }
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Upload trwał zbyt długo. Spróbuj ponownie z mniejszym plikiem.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Longer duration for important error info
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
      const { data, error } = await supabase.storage
        .from('training-media')
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      const files = data?.map(file => {
        const { data: urlData } = supabase.storage
          .from('training-media')
          .getPublicUrl(file.name);
        
        // Detect type from file extension
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let type = 'other';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) type = 'image';
        else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) type = 'video';
        else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) type = 'audio';
        else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) type = 'document';

        return {
          name: file.name,
          url: urlData.publicUrl,
          type
        };
      }) || [];

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
    } else if (url.match(/\.(mp4|mov|avi|webm|mkv)$/)) {
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
    if (!allowedTypes || allowedTypes.length === 0) {
      if (maxSizeMB === null || maxSizeMB === 0) {
        return `Dozwolone formaty: JPG, PNG, GIF, MP4, MOV, AVI, MP3, WAV, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
        
⚠️ Uwaga: Supabase ma limit ~50MB na plik. Dla większych plików wideo użyj kompresji.`;
      }
      return `Dozwolone formaty: JPG, PNG, GIF, MP4, MOV, AVI, MP3, WAV, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (max ${maxSizeMB}MB)
      
⚠️ Supabase ma limit ~50MB na plik. Dla większych filmów użyj kompresji.`;
    }
    
    const formatMap = {
      image: "JPG, PNG, GIF",
      video: "MP4, MOV, AVI, WebM",
      audio: "MP3, WAV, OGG",
      document: "PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT"
    };
    const formats = allowedTypes.map(t => formatMap[t]).join(', ');
    
    if (maxSizeMB === null || maxSizeMB === 0) {
      return `Dozwolone formaty: ${formats}
      
⚠️ Uwaga: Supabase ma limit ~50MB na plik. Dla większych plików wideo użyj kompresji.`;
    }
    return `Dozwolone formaty: ${formats} (max ${maxSizeMB}MB)
    
⚠️ Supabase ma limit ~50MB na plik. Dla większych filmów użyj kompresji.`;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Plik multimedialny</Label>
        <Tabs defaultValue="upload" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="text-xs">
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs">
              <LinkIcon className="w-3 h-3 mr-1" />
              URL
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs" onClick={loadLibraryFiles}>
              <FolderOpen className="w-3 h-3 mr-1" />
              Biblioteka
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-3">
            <Input
              id="media-upload"
              type="file"
              accept={getAcceptString()}
              onChange={handleFileSelect}
              disabled={uploading}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              {getHelpText()}
            </p>
          </TabsContent>

          <TabsContent value="url" className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUrlSubmit();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleUrlSubmit}
                size="sm"
              >
                Dodaj
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Wklej URL obrazu, filmu lub innego pliku
            </p>
          </TabsContent>

          <TabsContent value="library" className="space-y-3">
            {loadingLibrary ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : libraryFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Brak plików w bibliotece
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-md p-2">
                <div className="grid grid-cols-3 gap-2">
                  {libraryFiles.map((file, index) => (
                    <Card 
                      key={index} 
                      className="cursor-pointer hover:border-primary transition-colors overflow-hidden"
                      onClick={() => selectFromLibrary(file)}
                    >
                      <CardContent className="p-2">
                        {file.type === 'image' ? (
                          <img 
                            src={file.url} 
                            alt={file.name}
                            className="w-full h-20 object-cover rounded"
                          />
                        ) : file.type === 'video' ? (
                          <div className="w-full h-20 bg-secondary rounded flex items-center justify-center">
                            <Video className="w-8 h-8 text-muted-foreground" />
                          </div>
                        ) : file.type === 'audio' ? (
                          <div className="w-full h-20 bg-secondary rounded flex items-center justify-center">
                            <Music className="w-8 h-8 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="w-full h-20 bg-secondary rounded flex items-center justify-center">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-xs mt-1 truncate" title={file.name}>
                          {file.name}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            <p className="text-xs text-muted-foreground">
              Kliknij na plik aby go wybrać
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {uploading && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">Przesyłanie... {uploadProgress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentMediaUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <Badge variant="outline" className="flex items-center gap-1">
                {currentMediaType === 'image' ? (
                  <Image className="w-3 h-3" />
                ) : currentMediaType === 'video' ? (
                  <Video className="w-3 h-3" />
                ) : currentMediaType === 'audio' ? (
                  <Music className="w-3 h-3" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                {currentMediaType === 'image' ? 'Zdjęcie' : 
                 currentMediaType === 'video' ? 'Film' :
                 currentMediaType === 'audio' ? 'Audio' :
                 currentMediaType === 'document' ? 'Dokument' : 'Plik'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeMedia}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              <SecureMedia
                mediaUrl={currentMediaUrl}
                mediaType={currentMediaType}
                altText={currentAltText || 'Podgląd'}
                className="w-full max-h-48 object-cover rounded border"
              />
              
              <div>
                <Label htmlFor="alt-text" className="text-xs">
                  {currentMediaType === 'image' ? 'Tekst alternatywny' : 
                   currentMediaType === 'video' ? 'Opis filmu' :
                   currentMediaType === 'audio' ? 'Opis audio' : 'Opis pliku'}
                </Label>
                <Input
                  id="alt-text"
                  value={altText}
                  onChange={(e) => {
                    setAltText(e.target.value);
                    onMediaUploaded(currentMediaUrl, currentMediaType, e.target.value);
                  }}
                  placeholder={currentMediaType === 'image' ? 'Opisz zdjęcie...' : 
                              currentMediaType === 'video' ? 'Opisz film...' :
                              currentMediaType === 'audio' ? 'Opisz plik audio...' : 'Opisz plik...'}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};