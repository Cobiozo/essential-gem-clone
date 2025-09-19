import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Image, Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MediaUploadProps {
  onMediaUploaded: (url: string, type: 'image' | 'video', altText?: string) => void;
  currentMediaUrl?: string;
  currentMediaType?: 'image' | 'video';
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

    if (!isImage && !isVideo) {
      toast({
        title: "Nieprawidłowy format",
        description: "Dozwolone są tylko pliki graficzne i wideo.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Plik za duży",
        description: "Maksymalny rozmiar pliku to 20MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const bucket = isImage ? 'cms-images' : 'cms-videos';
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

      const mediaType = isImage ? 'image' : 'video';
      onMediaUploaded(data.publicUrl, mediaType, altText);

      toast({
        title: "Sukces",
        description: `${isImage ? 'Zdjęcie' : 'Film'} zostało przesłane.`,
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
            accept="image/*,video/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Dozwolone formaty: JPG, PNG, GIF, MP4, MOV, AVI (max 20MB)
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
                ) : (
                  <Video className="w-3 h-3" />
                )}
                {currentMediaType === 'image' ? 'Zdjęcie' : 'Film'}
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
              {currentMediaType === 'image' ? (
                <img
                  src={currentMediaUrl}
                  alt={currentAltText || 'Podgląd'}
                  className="w-full max-h-48 object-cover rounded border"
                />
              ) : (
                <video
                  src={currentMediaUrl}
                  className="w-full max-h-48 rounded border"
                  controls
                  preload="metadata"
                />
              )}
              
              <div>
                <Label htmlFor="alt-text" className="text-xs">
                  {currentMediaType === 'image' ? 'Tekst alternatywny' : 'Opis filmu'}
                </Label>
                <Input
                  id="alt-text"
                  value={altText}
                  onChange={(e) => {
                    setAltText(e.target.value);
                    onMediaUploaded(currentMediaUrl, currentMediaType, e.target.value);
                  }}
                  placeholder={currentMediaType === 'image' ? 'Opisz zdjęcie...' : 'Opisz film...'}
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