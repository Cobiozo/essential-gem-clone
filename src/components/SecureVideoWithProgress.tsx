import React from 'react';
import { SecureMedia } from '@/components/SecureMedia';
import { useVideoProgress } from '@/hooks/useVideoProgress';

interface SecureVideoWithProgressProps {
  mediaUrl: string;
  videoId: string;
  className?: string;
  altText?: string;
}

export const SecureVideoWithProgress: React.FC<SecureVideoWithProgressProps> = ({
  mediaUrl,
  videoId,
  className,
  altText
}) => {
  const {
    savedPosition,
    handleTimeUpdate,
    handlePlayStateChange
  } = useVideoProgress({ videoId });
  
  // Automatyczne ustawienie pozycji startowej na zapisaną
  const initialTime = savedPosition || 0;
  
  return (
    <SecureMedia
      mediaUrl={mediaUrl}
      mediaType="video"
      controlMode="secure"
      className={className}
      altText={altText}
      initialTime={initialTime}
      onTimeUpdate={handleTimeUpdate}
      onPlayStateChange={handlePlayStateChange}
    />
  );
};
