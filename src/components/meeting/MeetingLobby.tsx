import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Video, VideoOff, Mic, MicOff, LogIn, Settings, MessageCircle, Monitor, AlertCircle, Palette } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { BackgroundSelector } from './BackgroundSelector';
import { useVideoBackground } from '@/hooks/useVideoBackground';
import { useZoomBackgrounds } from '@/hooks/useZoomBackgrounds';
import { useCustomBackgrounds } from '@/hooks/useCustomBackgrounds';
import type { MeetingSettings } from './MeetingSettingsDialog';
import type { BackgroundMode } from './VideoBackgroundProcessor';

interface MeetingLobbyProps {
  displayName: string;
  onJoin: (audioEnabled: boolean, videoEnabled: boolean, settings?: MeetingSettings, stream?: MediaStream) => void;
  isConnecting: boolean;
  isHost?: boolean;
  roomId?: string;
  guestMode?: boolean;
}

export const MeetingLobby: React.FC<MeetingLobbyProps> = ({
  displayName,
  onJoin,
  isConnecting,
  isHost = false,
  guestMode = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamPassedRef = useRef(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [needsManualGrant, setNeedsManualGrant] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number>(0);
  const cleanupStreamRef = useRef<MediaStream | null>(null);

  // Background hooks
  const {
    mode: bgMode,
    selectedImage: bgSelectedImage,
    isLoading: bgLoading,
    isSupported: bgSupported,
    applyBackground,
    previewBackground,
    stopBackground,
    updateRawStream,
    getSavedBackground,
  } = useVideoBackground();

  const { zoomBackgrounds } = useZoomBackgrounds();
  const {
    customImages,
    isUploading: bgUploading,
    uploadImage,
    deleteImage,
    refetch: refetchBackgrounds,
    maxBackgrounds: maxCustomBackgrounds,
  } = useCustomBackgrounds();

  // The stream currently shown in the preview (may be raw or processed)
  const displayStreamRef = useRef<MediaStream | null>(null);

  // Host settings
  const [meetingSettings, setMeetingSettings] = useState<MeetingSettings>({
    allowChat: true,
    allowMicrophone: true,
    allowCamera: true,
    allowScreenShare: 'host_only',
  });

  const acquireStream = useCallback(async () => {
    setMediaError(null);
    setNeedsManualGrant(false);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err) {
          console.warn('[Lobby] Camera/mic access denied:', err);
          setMediaError('Nie można uzyskać dostępu do kamery lub mikrofonu. Sprawdź uprawnienia przeglądarki.');
          setNeedsManualGrant(true);
          return null;
        }
      }
    }
    // Stop previous stream if any
    if (cleanupStreamRef.current && cleanupStreamRef.current !== stream) {
      cleanupStreamRef.current.getTracks().forEach(t => t.stop());
    }
    cleanupStreamRef.current = stream;
    setPreviewStream(stream);
    updateRawStream(stream);
    return stream;
  }, [updateRawStream]);

  // Auto-attempt on mount
  useEffect(() => {
    acquireStream();
    return () => {
      if (!streamPassedRef.current) {
        cleanupStreamRef.current?.getTracks().forEach((t) => t.stop());
        stopBackground();
      }
      // When stream was passed to VideoRoom, don't kill the processor —
      // VideoRoom will create its own and the old one will be GC'd
    };
  }, []);

  // Auto-apply saved background when stream is ready (skip on mobile/PWA to avoid stream corruption)
  useEffect(() => {
    if (!previewStream) return;
    const isMobilePWA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobilePWA) {
      console.log('[Lobby] Skipping auto-apply background on mobile/PWA');
      return;
    }
    const saved = getSavedBackground();
    if (saved.mode !== 'none') {
      applyBackground(previewStream, saved.mode, saved.image).then((out) => {
        setProcessedStream(out);
      }).catch(() => {});
    }
  }, [previewStream]);

  // Attach the display stream (processed or raw) to video element
  useEffect(() => {
    const video = videoRef.current;
    const stream = processedStream || previewStream;
    displayStreamRef.current = stream;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch((err) => {
      console.warn('[Lobby] Video play() failed:', err);
    });
    const handleLoaded = () => {
      if (video.paused && video.srcObject) {
        video.play().catch(() => {});
      }
    };
    video.addEventListener('loadeddata', handleLoaded);
    return () => video.removeEventListener('loadeddata', handleLoaded);
  }, [previewStream, processedStream]);

  // Mic level indicator
  useEffect(() => {
    if (!previewStream || !audioEnabled) {
      setMicLevel(0);
      return;
    }

    const audioTracks = previewStream.getAudioTracks();
    if (audioTracks.length === 0) {
      setMicLevel(0);
      return;
    }

    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(previewStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setMicLevel(Math.min(avg / 128, 1));
        rafIdRef.current = requestAnimationFrame(tick);
      };
      rafIdRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('[Lobby] AudioContext error:', err);
    }

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
      analyserRef.current = null;
    };
  }, [previewStream, audioEnabled]);

  useEffect(() => {
    if (previewStream) {
      previewStream.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
    }
  }, [videoEnabled, previewStream]);

  useEffect(() => {
    if (previewStream) {
      previewStream.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
    }
  }, [audioEnabled, previewStream]);

  // Background selection handler
  const handleBackgroundSelect = useCallback(async (mode: BackgroundMode, imageSrc?: string) => {
    if (!previewStream) return;
    try {
      if (mode === 'none') {
        stopBackground();
        setProcessedStream(null);
        return;
      }
      const out = await applyBackground(previewStream, mode, imageSrc);
      setProcessedStream(out);
    } catch (err) {
      console.error('[Lobby] Background apply failed:', err);
    }
  }, [previewStream, applyBackground, stopBackground]);

  // Preview hover handler (lightweight, no stop/start)
  const handlePreviewModeChange = useCallback(async (mode: BackgroundMode, imageSrc?: string) => {
    if (!previewStream) return;
    try {
      const out = await previewBackground(previewStream, mode, imageSrc);
      if (out !== previewStream) {
        setProcessedStream(out);
      } else {
        setProcessedStream(null);
      }
    } catch {}
  }, [previewStream, previewBackground]);

  const handleJoin = () => {
    streamPassedRef.current = true;
    // Validate streams have live tracks before passing to VideoRoom
    const isLive = (s: MediaStream | null) => s?.getTracks().some(t => t.readyState === 'live') ?? false;
    let streamToPass: MediaStream | undefined;
    if (isLive(processedStream)) {
      streamToPass = processedStream!;
    } else if (isLive(previewStream)) {
      streamToPass = previewStream!;
    }
    // If neither is live, pass undefined — VideoRoom will acquire its own
    onJoin(audioEnabled, videoEnabled, isHost ? meetingSettings : undefined, streamToPass);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Dołącz do spotkania</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {guestMode && <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full mr-1">Gość</span>}
            Witaj, <strong>{displayName}</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Media error */}
          {mediaError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{mediaError}</span>
            </div>
          )}

          {/* Video preview */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={
                videoEnabled && (previewStream || processedStream)
                  ? 'w-full h-full object-cover'
                  : 'hidden'
              }
              style={{ transform: 'scaleX(-1)' }}
            />
            {(!videoEnabled || (!previewStream && !processedStream)) && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <VideoOff className="h-12 w-12" />
                <span className="text-sm">Kamera wyłączona</span>
              </div>
            )}
          </div>

          {/* Manual grant button */}
          {needsManualGrant && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => acquireStream()}
            >
              <Video className="h-4 w-4 mr-2" />
              Zezwól na dostęp do kamery i mikrofonu
            </Button>
          )}

          {/* Toggles */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-destructive" />}
                  <Label>Mikrofon</Label>
                </div>
                <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} />
              </div>
              {/* Mic level indicator */}
              {audioEnabled && previewStream && (
                <div className="flex items-center gap-2 pl-6">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-75"
                      style={{ width: `${Math.max(micLevel * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {Math.round(micLevel * 100)}%
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-destructive" />}
                <Label>Kamera</Label>
              </div>
              <Switch checked={videoEnabled} onCheckedChange={setVideoEnabled} />
            </div>

            {/* Background selector */}
            {bgSupported && videoEnabled && previewStream && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <Label>Tło</Label>
                </div>
                <BackgroundSelector
                  currentMode={bgMode}
                  selectedImage={bgSelectedImage}
                  backgroundImages={zoomBackgrounds}
                  isLoading={bgLoading}
                  isSupported={bgSupported}
                  onSelect={handleBackgroundSelect}
                  previewStream={processedStream || previewStream}
                  onPreviewModeChange={handlePreviewModeChange}
                  customImages={customImages}
                  maxCustom={maxCustomBackgrounds}
                  isUploading={bgUploading}
                  onUpload={(file) => { uploadImage(file).catch(() => {}); }}
                  onDelete={(url) => { deleteImage(url).catch(() => {}); }}
                  onRefresh={refetchBackgrounds}
                  trigger={
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Palette className="h-3.5 w-3.5" />
                      {bgMode === 'none' ? 'Brak' : bgMode === 'blur-light' ? 'Lekkie' : bgMode === 'blur-heavy' ? 'Mocne' : 'Obraz'}
                    </Button>
                  }
                />
              </div>
            )}
          </div>

          {/* Host settings */}
          {isHost && !guestMode && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Settings className="h-4 w-4" />
                  <span>Ustawienia spotkania</span>
                </div>

                <div className="space-y-3 pl-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-sm">Czat</Label>
                    </div>
                    <Switch
                      checked={meetingSettings.allowChat}
                      onCheckedChange={(v) => setMeetingSettings(s => ({ ...s, allowChat: v }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-sm">Mikrofon uczestników</Label>
                    </div>
                    <Switch
                      checked={meetingSettings.allowMicrophone}
                      onCheckedChange={(v) => setMeetingSettings(s => ({ ...s, allowMicrophone: v }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-sm">Kamera uczestników</Label>
                    </div>
                    <Switch
                      checked={meetingSettings.allowCamera}
                      onCheckedChange={(v) => setMeetingSettings(s => ({ ...s, allowCamera: v }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-sm">Udostępnianie ekranu</Label>
                    </div>
                    <RadioGroup
                      value={meetingSettings.allowScreenShare}
                      onValueChange={(v) => setMeetingSettings(s => ({ ...s, allowScreenShare: v as 'host_only' | 'all' }))}
                      className="pl-5 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="host_only" id="lobby-ss-host" />
                        <Label htmlFor="lobby-ss-host" className="text-sm text-muted-foreground">Tylko prowadzący</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="all" id="lobby-ss-all" />
                        <Label htmlFor="lobby-ss-all" className="text-sm text-muted-foreground">Wszyscy</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Join button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleJoin}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Łączenie...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Dołącz do spotkania
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
