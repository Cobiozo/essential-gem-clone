import React, { useEffect, useRef } from 'react';
import { User, MicOff } from 'lucide-react';

interface VideoParticipant {
  peerId: string;
  displayName: string;
  stream: MediaStream | null;
  isMuted?: boolean;
  isLocal?: boolean;
}

interface VideoGridProps {
  participants: VideoParticipant[];
  localStream: MediaStream | null;
  localDisplayName: string;
  isMuted: boolean;
  isCameraOff: boolean;
}

const VideoTile: React.FC<{ participant: VideoParticipant }> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = participant.stream?.getVideoTracks().some(t => t.enabled);

  return (
    <div className="relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
      {participant.stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
        </div>
      )}

      {/* Name overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-xs text-white bg-black/60 px-2 py-1 rounded">
          {participant.displayName}
          {participant.isLocal && ' (Ty)'}
        </span>
        {participant.isMuted && (
          <span className="bg-red-500/80 p-1 rounded">
            <MicOff className="h-3 w-3 text-white" />
          </span>
        )}
      </div>
    </div>
  );
};

export const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  localStream,
  localDisplayName,
  isMuted,
  isCameraOff,
}) => {
  const allParticipants: VideoParticipant[] = [
    {
      peerId: 'local',
      displayName: localDisplayName,
      stream: localStream,
      isMuted,
      isLocal: true,
    },
    ...participants,
  ];

  const count = allParticipants.length;

  // Adaptive grid classes
  const gridClass =
    count <= 1
      ? 'grid-cols-1'
      : count <= 2
      ? 'grid-cols-1 md:grid-cols-2'
      : count <= 4
      ? 'grid-cols-2'
      : count <= 6
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-3 md:grid-cols-4';

  return (
    <div className={`grid ${gridClass} gap-2 p-4 flex-1 auto-rows-fr`}>
      {allParticipants.map((p) => (
        <VideoTile key={p.peerId} participant={p} />
      ))}
    </div>
  );
};
