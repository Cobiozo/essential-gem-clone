import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  onActiveVideoRef?: (el: HTMLVideoElement | null) => void;
}

const VideoTile: React.FC<{
  participant: VideoParticipant;
  className?: string;
  showOverlay?: boolean;
  videoRefCallback?: (el: HTMLVideoElement | null) => void;
}> = ({ participant, className = '', showOverlay = true, videoRefCallback }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  useEffect(() => {
    if (videoRefCallback) {
      videoRefCallback(videoRef.current);
    }
  }, [videoRefCallback]);

  const hasVideo = participant.stream?.getVideoTracks().some(t => t.enabled);

  return (
    <div className={`relative bg-zinc-900 overflow-hidden flex items-center justify-center ${className}`}>
      {participant.stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-zinc-700 flex items-center justify-center">
            <User className="h-10 w-10 text-zinc-400" />
          </div>
          <span className="text-zinc-400 text-sm">{participant.displayName}</span>
        </div>
      )}

      {showOverlay && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-md font-medium">
            {participant.displayName}
            {participant.isLocal && ' (Ty)'}
          </span>
          <div className="flex items-center gap-1">
            {participant.isMuted && (
              <span className="bg-red-600 p-1 rounded-full">
                <MicOff className="h-3 w-3 text-white" />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ThumbnailTile: React.FC<{
  participant: VideoParticipant;
  isActive: boolean;
  onClick: () => void;
}> = ({ participant, isActive, onClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = participant.stream?.getVideoTracks().some(t => t.enabled);

  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
        isActive ? 'border-blue-500' : 'border-transparent hover:border-zinc-500'
      }`}
    >
      {participant.stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <User className="h-5 w-5 text-zinc-500" />
        </div>
      )}
      {participant.isMuted && (
        <div className="absolute bottom-0.5 right-0.5 bg-red-600 rounded-full p-0.5">
          <MicOff className="h-2 w-2 text-white" />
        </div>
      )}
    </button>
  );
};

export const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  localStream,
  localDisplayName,
  isMuted,
  isCameraOff,
  onActiveVideoRef,
}) => {
  const [activeSpeakerIndex, setActiveSpeakerIndex] = useState(0);

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

  const activeSpeaker = allParticipants[activeSpeakerIndex] || allParticipants[0];
  const showThumbnails = allParticipants.length > 1;

  const handleVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      onActiveVideoRef?.(el);
    },
    [onActiveVideoRef]
  );

  return (
    <div className="flex-1 flex flex-col bg-black relative">
      <div className="flex-1 relative">
        <VideoTile
          participant={activeSpeaker}
          className="absolute inset-0 rounded-none"
          showOverlay={true}
          videoRefCallback={handleVideoRef}
        />
      </div>

      {showThumbnails && (
        <div className="flex items-center gap-2 px-3 py-2 bg-black/80 overflow-x-auto">
          {allParticipants.map((p, index) => (
            <ThumbnailTile
              key={p.peerId}
              participant={p}
              isActive={index === activeSpeakerIndex}
              onClick={() => setActiveSpeakerIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
