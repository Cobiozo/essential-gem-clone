import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecureMediaProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
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