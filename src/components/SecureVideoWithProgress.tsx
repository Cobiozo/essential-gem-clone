import React, { useState } from 'react';
import { SecureMedia } from '@/components/SecureMedia';
import { useVideoProgress } from '@/hooks/useVideoProgress';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw } from 'lucide-react';

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
  const [initialTime, setInitialTime] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(true);
  
  const {
    savedPosition,
    handleTimeUpdate,
    handlePlayStateChange,
    clearProgress
  } = useVideoProgress({ videoId });
  
  const handleResume = () => {
    if (savedPosition) {
      setInitialTime(savedPosition);
    }
    setShowResumePrompt(false);
  };
  
  const handleStartOver = () => {
    setInitialTime(0);
    clearProgress();
    setShowResumePrompt(false);
  };
  
  // Show resume prompt if there's saved progress
  if (savedPosition && showResumePrompt) {
    const minutes = Math.floor(savedPosition / 60);
    const seconds = Math.floor(savedPosition % 60);
    
    return (
      <div className={className}>
        <div className="bg-card border rounded-lg p-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Masz zapisany postęp oglądania
          </p>
          <p className="font-medium">
            Kontynuować od {minutes}:{seconds.toString().padStart(2, '0')}?
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleResume} size="sm">
              <Play className="h-4 w-4 mr-1" />
              Kontynuuj
            </Button>
            <Button onClick={handleStartOver} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-1" />
              Od początku
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
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
