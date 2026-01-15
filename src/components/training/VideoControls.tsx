import React, { useMemo } from 'react';
import { Play, Pause, AlertTriangle, Maximize, Minimize, RefreshCw, Loader2, Wifi, WifiOff, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
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
  // Buffering props
  isBuffering?: boolean;
  bufferProgress?: number; // 0-100, percentage of buffer ready
  onRetry?: () => void;
  // NEW: Buffer visualization
  bufferedRanges?: { start: number; end: number }[];
  // NEW: Network quality indicator
  networkQuality?: 'good' | 'slow' | 'offline';
  // NEW: Diagnostics props (for admins)
  showDiagnostics?: boolean;
  videoSrc?: string;
  retryCount?: number;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  isTabHidden = false,
  onFullscreen,
  isFullscreen = false,
  isBuffering = false,
  bufferProgress,
  onRetry,
  bufferedRanges,
  networkQuality,
  showDiagnostics = false,
  videoSrc,
  retryCount = 0
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Determine if this is initial buffering (before first play)
  const isInitialLoad = bufferProgress !== undefined && bufferProgress < 100 && currentTime === 0;

  // Calculate buffer bar segments
  const bufferSegments = useMemo(() => {
    if (!bufferedRanges || !duration || duration <= 0) return [];
    
    return bufferedRanges.map(range => ({
      left: (range.start / duration) * 100,
      width: ((range.end - range.start) / duration) * 100,
    }));
  }, [bufferedRanges, duration]);

  // Network quality icon
  const NetworkIcon = networkQuality === 'slow' ? WifiOff : Wifi;
  const showNetworkWarning = networkQuality === 'slow' || networkQuality === 'offline';
  
  return (
    <div className="bg-card border rounded-lg p-3 space-y-3">
      {/* Buffering message with progress */}
      {isBuffering && (
        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 rounded-md text-sm">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <span>
              {isInitialLoad 
                ? "Przygotowuję wideo do odtwarzania..." 
                : "Słaby zasięg sieci - ładowanie wideo..."}
            </span>
            {bufferProgress !== undefined && bufferProgress > 0 && bufferProgress < 100 && (
              <div className="mt-1">
                <Progress value={Math.max(0, bufferProgress)} className="h-1" />
                <span className="text-xs mt-0.5 block text-blue-500 dark:text-blue-400">
                  Buforowanie: {Math.round(Math.max(0, bufferProgress))}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Network quality warning */}
      {showNetworkWarning && !isBuffering && (
        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-3 py-2 rounded-md text-sm">
          <NetworkIcon className="h-4 w-4 flex-shrink-0" />
          <span>
            {networkQuality === 'offline' 
              ? "Brak połączenia z internetem" 
              : "Słabe połączenie - wideo może się zacinać"}
          </span>
        </div>
      )}

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
          disabled={isBuffering}
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
          {/* Progress bar container with buffer visualization */}
          <div className="relative h-2">
            {/* Buffer segments (background layer) */}
            {bufferSegments.length > 0 && (
              <div className="absolute inset-0 rounded overflow-hidden">
                {bufferSegments.map((segment, i) => (
                  <div
                    key={i}
                    className="absolute h-full bg-primary/20 dark:bg-primary/30"
                    style={{
                      left: `${segment.left}%`,
                      width: `${segment.width}%`,
                    }}
                  />
                ))}
              </div>
            )}
            {/* Playback progress (foreground layer) */}
            <Progress value={progressPercentage} className="h-2 relative z-10" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Wideo się zacina? Kliknij aby spróbować ponownie"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Napraw
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Podstawowa pomoc + diagnostyka dla adminów
              const helpContent = (
                <div className="space-y-2">
                  <p className="font-medium">Problem z wideo?</p>
                  <ol className="text-sm list-decimal list-inside space-y-1">
                    <li>Sprawdź połączenie internetowe</li>
                    <li>Kliknij przycisk "Napraw"</li>
                    <li>Odśwież stronę (F5)</li>
                    <li>Spróbuj innej przeglądarki</li>
                  </ol>
                  {showDiagnostics && (
                    <div className="mt-3 pt-2 border-t border-muted text-xs space-y-1">
                      <p className="font-medium text-muted-foreground">🔧 Diagnostyka:</p>
                      <p>Sieć: {networkQuality === 'good' ? '✅ Dobra' : networkQuality === 'slow' ? '⚠️ Wolna' : '❌ Offline'}</p>
                      <p>Bufor: {bufferProgress?.toFixed(0) || 0}%</p>
                      <p>Czas: {formatTime(currentTime)} / {formatTime(duration)}</p>
                      <p>Próby: {retryCount}/5</p>
                      {videoSrc && <p className="truncate max-w-[200px]">Źródło: ...{videoSrc.slice(-30)}</p>}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Jeśli problem się powtarza, skontaktuj się z zespołem wsparcia.
                  </p>
                </div>
              );
              toast.info(helpContent, { duration: showDiagnostics ? 20000 : 15000 });
            }}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            title={showDiagnostics ? "Diagnostyka wideo" : "Pomoc z problemami z wideo"}
          >
            <HelpCircle className="h-3 w-3 mr-1" />
            {showDiagnostics ? 'Diagnostyka' : 'Pomoc'}
          </Button>
          
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
