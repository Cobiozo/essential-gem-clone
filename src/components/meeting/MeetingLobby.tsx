import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Video, VideoOff, Mic, MicOff, LogIn } from 'lucide-react';

interface MeetingLobbyProps {
  displayName: string;
  onJoin: (audioEnabled: boolean, videoEnabled: boolean) => void;
  isConnecting: boolean;
}

export const MeetingLobby: React.FC<MeetingLobbyProps> = ({
  displayName,
  onJoin,
  isConnecting,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initPreview = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: audioEnabled,
        });
        setPreviewStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('[Lobby] Camera/mic access denied:', err);
      }
    };

    initPreview();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Toggle tracks without recreating stream
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
    // Stop preview stream before joining (VideoRoom will create its own)
    previewStream?.getTracks().forEach((t) => t.stop());
    onJoin(audioEnabled, videoEnabled);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Dołącz do spotkania</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
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
