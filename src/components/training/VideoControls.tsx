import React from 'react';
import { Play, Pause, AlertTriangle, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  isTabHidden?: boolean;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  isTabHidden = false,
  onFullscreen,
  isFullscreen = false
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-card border rounded-lg p-3 space-y-3">
      {isTabHidden && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Wideo zostało wstrzymane - wróć do tej karty, aby kontynuować</span>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onPlayPause}
          className="flex items-center gap-2"
        >
          {isPlaying ? (
            <>
              <Pause className="h-4 w-4" />
              Pauza
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Odtwórz
            </>
          )}
        </Button>

        <div className="flex-1 space-y-1">
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          
          {onFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFullscreen}
              className="h-8 w-8 p-0"
              title={isFullscreen ? "Zamknij pełny ekran" : "Pełny ekran"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Podczas pierwszego oglądania przewijanie jest zablokowane
      </p>
    </div>
  );
};
