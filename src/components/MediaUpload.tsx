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
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onMediaUploaded,
  currentMediaUrl,
  currentMediaType,
  currentAltText
}) => {
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState(currentAltText || '');
  const { toast } = useToast();

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
    let bucket: string;

    if (isImage) {
      mediaType = 'image';
      bucket = 'cms-images';
    } else if (isVideo) {
      mediaType = 'video';
      bucket = 'cms-videos';
    } else if (isAudio) {
      mediaType = 'audio';
      bucket = 'cms-files';
    } else if (isDocument) {
      mediaType = 'document';
      bucket = 'cms-files';
    } else {
      mediaType = 'other';
      bucket = 'cms-files';
    }

    // Check file size (max 50MB for documents, 20MB for media)
    const maxSize = (isDocument || mediaType === 'other') ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Plik za duży",
        description: `Maksymalny rozmiar pliku to ${maxSize / 1024 / 1024}MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
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
    } catch (error) {
      console.error('Error uploading media:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się przesłać pliku.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="media-upload">Plik multimedialny</Label>
        <div className="mt-2">
          <Input
            id="media-upload"
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={handleFileSelect}
            disabled={uploading}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Dozwolone formaty: JPG, PNG, GIF, MP4, MOV, AVI, MP3, WAV, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (max 50MB dla dokumentów, 20MB dla mediów)
          </p>
        </div>
      </div>

      {uploading && (
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm">Przesyłanie...</span>
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