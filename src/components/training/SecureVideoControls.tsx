import React, { useState, useMemo } from 'react';
import { Play, Pause, Maximize, Minimize, RefreshCw, Loader2, RotateCcw, FastForward, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SecureVideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (rate: number) => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onRetry?: () => void;
  isBuffering?: boolean;
  playbackRate?: number;
}

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

export const SecureVideoControls: React.FC<SecureVideoControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onFullscreen,
  isFullscreen = false,
  onRetry,
  isBuffering = false,
  playbackRate = 1,
}) => {
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSliderChange = (value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    onSeek(newTime);
  };

  const handleSkipBackward = () => {
    const newTime = Math.max(0, currentTime - 10);
    onSeek(newTime);
  };

  const handleSkipForward = () => {
    const newTime = Math.min(duration, currentTime + 10);
    onSeek(newTime);
  };

  const currentSpeedLabel = SPEED_OPTIONS.find(s => s.value === playbackRate)?.label || '1x';

  return (
    <div className="bg-card border rounded-lg p-3 space-y-3">
      {/* Buffering indicator */}
      {isBuffering && (
        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 rounded-md text-sm">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          <span>Ładowanie wideo...</span>
        </div>
      )}

      {/* Progress bar (clickable slider) */}
      <div className="w-full">
        <Slider
          value={[progressPercentage]}
          max={100}
          step={0.1}
          onValueChange={handleSliderChange}
          className="w-full cursor-pointer"
          disabled={isBuffering || duration === 0}
        />
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Play/Pause */}
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
              <span className="hidden sm:inline">Pauza</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Odtwórz</span>
            </>
          )}
        </Button>

        {/* Skip backward 10s */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkipBackward}
          className="flex items-center gap-1"
          disabled={isBuffering || currentTime < 1}
          title="Cofnij 10 sekund"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="text-xs">-10s</span>
        </Button>

        {/* Skip forward 10s */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkipForward}
          className="flex items-center gap-1"
          disabled={isBuffering || currentTime >= duration - 1}
          title="Do przodu 10 sekund"
        >
          <FastForward className="h-4 w-4" />
          <span className="text-xs">+10s</span>
        </Button>

        {/* Time display */}
        <div className="flex-1 text-center text-xs sm:text-sm text-muted-foreground whitespace-nowrap min-w-[80px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Speed control dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 min-w-[60px]"
              disabled={isBuffering}
            >
              <span className="text-xs">{currentSpeedLabel}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SPEED_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSpeedChange(option.value)}
                className={playbackRate === option.value ? 'bg-accent' : ''}
              >
                {option.label}
                {playbackRate === option.value && ' ✓'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Retry button */}
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Wideo się zacina? Kliknij aby spróbować ponownie"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Napraw</span>
          </Button>
        )}

        {/* Fullscreen */}
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
  );
};
