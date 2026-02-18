import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Video, VideoOff, Mic, MicOff, LogIn, Settings, MessageCircle, Monitor } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import type { MeetingSettings } from './MeetingSettingsDialog';

interface MeetingLobbyProps {
  displayName: string;
  onJoin: (audioEnabled: boolean, videoEnabled: boolean, settings?: MeetingSettings) => void;
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
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  // Host settings
  const [meetingSettings, setMeetingSettings] = useState<MeetingSettings>({
    allowChat: true,
    allowMicrophone: true,
    allowCamera: true,
    allowScreenShare: 'host_only',
  });

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initPreview = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (err) {
            console.warn('[Lobby] Camera/mic access denied:', err);
            return;
          }
        }
      }
      setPreviewStream(stream);
    };

    initPreview();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

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

  const handleJoin = () => {
    previewStream?.getTracks().forEach((t) => t.stop());
    onJoin(audioEnabled, videoEnabled, isHost ? meetingSettings : undefined);
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
          {/* Video preview */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            {videoEnabled && previewStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <VideoOff className="h-12 w-12" />
                <span className="text-sm">Kamera wyłączona</span>
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-destructive" />}
                <Label>Mikrofon</Label>
              </div>
              <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-destructive" />}
                <Label>Kamera</Label>
              </div>
              <Switch checked={videoEnabled} onCheckedChange={setVideoEnabled} />
            </div>
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
