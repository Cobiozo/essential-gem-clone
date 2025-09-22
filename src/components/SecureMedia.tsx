import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { isExternalUrl } from '@/lib/linkUtils';

interface SecureMediaProps {
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document' | 'audio' | 'other';
  altText?: string;
  className?: string;
}

export const SecureMedia: React.FC<SecureMediaProps> = ({
  mediaUrl,
  mediaType,
  altText,
  className
}) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        // Extract bucket and path from the media URL
        const urlParts = mediaUrl.split('/');
        const bucketName = urlParts[urlParts.length - 2];
        const fileName = urlParts[urlParts.length - 1];
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(fileName, 3600); // 1 hour expiry

        if (error) {
          console.error('Error creating signed URL:', error);
          return;
        }

        setSignedUrl(data.signedUrl);
      } catch (error) {
        console.error('Error processing media URL:', error);
      } finally {
        setLoading(false);
      }
    };

    if (mediaUrl) {
      getSignedUrl();
    }
  }, [mediaUrl]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSelectStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg w-full h-48 flex items-center justify-center">
        <span className="text-gray-500">Ładowanie...</span>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="bg-gray-100 rounded-lg w-full h-48 flex items-center justify-center">
        <span className="text-gray-500">Nie można załadować mediów</span>
      </div>
    );
  }

  const securityProps = {
    onContextMenu: handleContextMenu,
    onDragStart: handleDragStart,
    onSelectStart: handleSelectStart,
    style: { 
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    } as React.CSSProperties,
    draggable: false
  };

  if (mediaType === 'video') {
    return (
      <video
        {...securityProps}
        src={signedUrl}
        controls
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        className={`w-full h-auto rounded-lg ${className || ''}`}
        preload="metadata"
      >
        Twoja przeglądarka nie obsługuje odtwarzania wideo.
      </video>
    );
  }

  if (mediaType === 'audio') {
    return (
      <div className={`w-full p-4 border rounded-lg bg-gray-50 ${className || ''}`}>
        <audio
          {...securityProps}
          src={signedUrl}
          controls
          controlsList="nodownload"
          className="w-full"
          preload="metadata"
        >
          Twoja przeglądarka nie obsługuje odtwarzania audio.
        </audio>
        <p className="text-sm text-gray-600 mt-2">{altText || 'Plik audio'}</p>
      </div>
    );
  }

  if (mediaType === 'document' || mediaType === 'other') {
    const fileName = mediaUrl.split('/').pop() || 'Dokument';
    const extension = fileName.split('.').pop()?.toUpperCase() || '';
    
    return (
      <div className={`w-full p-4 border rounded-lg bg-gray-50 flex items-center gap-3 ${className || ''}`}>
        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="text-blue-600 font-semibold text-xs">{extension}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{altText || fileName}</p>
          <p className="text-xs text-gray-500">Dokument • {extension}</p>
        </div>
        <button
          onClick={() => {
            if (isExternalUrl(signedUrl)) {
              window.open(signedUrl, '_blank', 'noopener,noreferrer');
            } else {
              window.location.href = signedUrl;
            }
          }}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Otwórz
        </button>
      </div>
    );
  }

  return (
    <img
      {...securityProps}
      src={signedUrl}
      alt={altText || 'Zabezpieczone zdjęcie'}
      className={`w-full h-auto rounded-lg ${className || ''}`}
      loading="lazy"
    />
  );
};