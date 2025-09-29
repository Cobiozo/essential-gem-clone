import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Image, Video, Loader2, FileText, Music, File } from 'lucide-react';
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

    // Check if compression is needed and compress if necessary
    let file = originalFile;
    try {
      file = await compressFile(originalFile);
    } catch (error) {
      console.error('Compression error:', error);
      // Continue with original file if compression fails
      toast({
        title: "Ostrzeżenie",
        description: "Nie udało się skompresować pliku. Kontynuowanie z oryginalnym plikiem.",
        variant: "default",
      });
    }

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
      // Debug: Check auth state
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Upload attempt - Session exists:', !!session);
      console.log('Upload attempt - User ID:', session?.user?.id);
      
      if (!session) {
        throw new Error('Musisz być zalogowany, aby przesyłać pliki');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      console.log('Uploading to bucket:', bucket, 'path:', filePath, 'size:', Math.round(fileSize), 'MB');

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

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

  const removeMedia = () => {
    onMediaUploaded('', 'image', '');
    setAltText('');
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
        <Label htmlFor="media-upload">Plik multimedialny</Label>
        <div className="mt-2">
          <Input
            id="media-upload"
            type="file"
            accept={getAcceptString()}
            onChange={handleFileSelect}
            disabled={uploading}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {getHelpText()}
          </p>
        </div>
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