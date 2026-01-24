import React, { useMemo } from 'react';
import { Play, Pause, AlertTriangle, Maximize, Minimize, RefreshCw, Loader2, Wifi, WifiOff, HelpCircle, Settings, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface NoteMarker {
  id: string;
  timestamp: number;
}

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onRewind?: () => void; // NEW: Rewind 10 seconds callback
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
  // NEW: Extended diagnostics props (for admins)
  showDiagnostics?: boolean;
  videoSrc?: string;
  retryCount?: number;
  smartBufferingActive?: boolean;
  bufferedAheadSeconds?: number;
  connectionType?: string;
  downlink?: number;
  rtt?: number;
  // NEW: Note markers
  noteMarkers?: NoteMarker[];
  onNoteMarkerClick?: (noteId: string) => void;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onRewind,
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
  retryCount = 0,
  smartBufferingActive = false,
  bufferedAheadSeconds = 0,
  connectionType,
  downlink,
  rtt,
  noteMarkers,
  onNoteMarkerClick
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Function to copy diagnostics to clipboard (for admins)
  const copyDiagnostics = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      networkQuality,
      connectionType: connectionType || 'unknown',
      downlink: downlink ? `${downlink} Mbps` : 'n/a',
      rtt: rtt ? `${rtt}ms` : 'n/a',
      bufferProgress: bufferProgress?.toFixed(1) || 0,
      bufferedAhead: bufferedAheadSeconds?.toFixed(1) || 0,
      currentTime: formatTime(currentTime),
      duration: formatTime(duration),
      retryCount,
      isPlaying,
      isBuffering,
      smartBufferingActive,
      videoSrc: videoSrc?.slice(-80) || 'n/a'
    };
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2))
      .then(() => toast.success('Skopiowano dane diagnostyczne'))
      .catch(() => toast.error('Nie udało się skopiować'));
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
                : networkQuality === 'slow' || networkQuality === 'offline'
                  ? "Słaby zasięg sieci - ładowanie wideo..."
                  : "Buforowanie wideo..."}
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
      
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1 sm:gap-2">
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

          {onRewind && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRewind}
              className="flex items-center gap-1"
              disabled={isBuffering || currentTime < 1}
              title="Cofnij 10 sekund"
            >
              <RotateCcw className="h-4 w-4" />
              -10s
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-1">
          {/* Progress bar container with buffer visualization and note markers */}
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
            
            {/* Note markers (red dots on timeline) */}
            {noteMarkers && noteMarkers.length > 0 && duration > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {noteMarkers.map(marker => (
                  <button
                    key={marker.id}
                    className="absolute w-3 h-3 bg-red-500 rounded-full -top-0.5 transform -translate-x-1/2 cursor-pointer hover:scale-125 transition-transform z-20 pointer-events-auto shadow-sm"
                    style={{ left: `${(marker.timestamp / duration) * 100}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNoteMarkerClick?.(marker.id);
                    }}
                    title="Kliknij, aby zobaczyć notatkę"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
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
                      <p className="font-medium text-muted-foreground">🔧 Diagnostyka admina:</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <p>Sieć: {networkQuality === 'good' ? '✅ Dobra' : networkQuality === 'slow' ? '⚠️ Wolna' : '❌ Offline'}</p>
                        <p>Typ: {connectionType || 'brak danych'}</p>
                        <p>Downlink: {downlink ? `${downlink} Mbps` : 'n/a'}</p>
                        <p>RTT: {rtt ? `${rtt}ms` : 'n/a'}</p>
                        <p>Bufor: {bufferProgress?.toFixed(0) || 0}%</p>
                        <p>Bufor ahead: {bufferedAheadSeconds?.toFixed(1) || 0}s</p>
                        <p>Pozycja: {formatTime(currentTime)}</p>
                        <p>Całkowity: {formatTime(duration)}</p>
                        <p>Próby: {retryCount}/5</p>
                        <p>Smart buf: {smartBufferingActive ? '🔴 Aktywny' : '🟢 Nie'}</p>
                      </div>
                      {videoSrc && (
                        <p className="truncate max-w-full pt-1">
                          Źródło: <code className="text-[10px]">...{videoSrc.slice(-50)}</code>
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyDiagnostics}
                        className="mt-2 h-6 text-[10px] w-full"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Kopiuj dane diagnostyczne
                      </Button>
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
        Podczas pierwszego oglądania możesz tylko cofać wideo
      </p>
    </div>
  );
};
