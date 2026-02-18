import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MeetingControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  participantCount: number;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isMuted,
  isCameraOff,
  isScreenSharing,
  participantCount,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
}) => {
  return (
    <div className="flex items-center justify-center gap-3 p-4 bg-card/90 backdrop-blur-sm border-t">
      {/* Participant count */}
      <Badge variant="secondary" className="mr-4 flex items-center gap-1">
        <Users className="h-3 w-3" />
        {participantCount}
      </Badge>

      {/* Mic toggle */}
      <Button
        variant={isMuted ? 'destructive' : 'secondary'}
        size="icon"
        className="h-12 w-12 rounded-full"
        onClick={onToggleMute}
        title={isMuted ? 'Włącz mikrofon' : 'Wyłącz mikrofon'}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      {/* Camera toggle */}
      <Button
        variant={isCameraOff ? 'destructive' : 'secondary'}
        size="icon"
        className="h-12 w-12 rounded-full"
        onClick={onToggleCamera}
        title={isCameraOff ? 'Włącz kamerę' : 'Wyłącz kamerę'}
      >
        {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </Button>

      {/* Screen share toggle */}
      <Button
        variant={isScreenSharing ? 'default' : 'secondary'}
        size="icon"
        className="h-12 w-12 rounded-full"
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Zatrzymaj udostępnianie' : 'Udostępnij ekran'}
      >
        <Monitor className="h-5 w-5" />
      </Button>

      {/* Leave button */}
      <Button
        variant="destructive"
        size="icon"
        className="h-12 w-12 rounded-full ml-4"
        onClick={onLeave}
        title="Opuść spotkanie"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
};
