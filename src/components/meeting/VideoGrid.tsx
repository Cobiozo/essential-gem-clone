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
  isCameraOff?: boolean;
  className?: string;
  showOverlay?: boolean;
  videoRefCallback?: (el: HTMLVideoElement | null) => void;
}> = ({ participant, isCameraOff, className = '', showOverlay = true, videoRefCallback }) => {
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

  // For local participant, use isCameraOff prop; for remote, check track state
  const showVideo = participant.isLocal
    ? participant.stream && !isCameraOff
    : participant.stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

  return (
    <div className={`relative bg-zinc-900 overflow-hidden flex items-center justify-center ${className}`}>
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className={`w-full h-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-zinc-700 flex items-center justify-center">
            <User className="h-10 w-10 text-zinc-400" />
          </div>
          <span className="text-zinc-400 text-sm">{participant.displayName}</span>
        </div>
      )}

      {/* Hidden video element to keep stream active for PiP even when camera is off */}
      {!showVideo && participant.stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="hidden"
        />
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
  isSpeaking: boolean;
  isCameraOff?: boolean;
  onClick: () => void;
}> = ({ participant, isActive, isSpeaking, isCameraOff, onClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const showVideo = participant.isLocal
    ? participant.stream && !isCameraOff
    : participant.stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
        isActive
          ? 'border-blue-500'
          : isSpeaking
          ? 'border-green-500'
          : 'border-transparent hover:border-zinc-500'
      }`}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className={`w-full h-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
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

// Hook for active speaker detection using Web Audio API
function useActiveSpeakerDetection(participants: VideoParticipant[]) {
  const [speakingIndex, setSpeakingIndex] = useState(-1);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());
  const lastSpeakerChangeRef = useRef(0);

  useEffect(() => {
    // Lazy-init AudioContext
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
      } catch {
        return;
      }
    }
    const ctx = audioContextRef.current;

    // Clean up old analysers for participants that left
    const currentIds = new Set(participants.map(p => p.peerId));
    analysersRef.current.forEach((val, key) => {
      if (!currentIds.has(key)) {
        try { val.source.disconnect(); } catch {}
        analysersRef.current.delete(key);
      }
    });

    // Create analysers for new participants with audio streams
    participants.forEach((p) => {
      if (p.isLocal || !p.stream || analysersRef.current.has(p.peerId)) return;
      const audioTracks = p.stream.getAudioTracks();
      if (audioTracks.length === 0) return;
      try {
        const source = ctx.createMediaStreamSource(p.stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analysersRef.current.set(p.peerId, { analyser, source });
      } catch (e) {
        console.warn('[VideoGrid] Failed to create analyser for', p.peerId, e);
      }
    });

    // Poll audio levels
    const interval = setInterval(() => {
      let maxLevel = 15; // threshold to avoid silence switching
      let maxIndex = -1;

      participants.forEach((p, index) => {
        if (p.isLocal) return;
        const entry = analysersRef.current.get(p.peerId);
        if (!entry) return;

        const data = new Uint8Array(entry.analyser.frequencyBinCount);
        entry.analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        if (avg > maxLevel) {
          maxLevel = avg;
          maxIndex = index;
        }
      });

      const now = Date.now();
      // Debounce: only switch speaker if 1.5s since last change
      if (maxIndex !== -1 && now - lastSpeakerChangeRef.current > 1500) {
        setSpeakingIndex((prev) => {
          if (prev !== maxIndex) {
            lastSpeakerChangeRef.current = now;
            return maxIndex;
          }
          return prev;
        });
      }
    }, 300);

    return () => clearInterval(interval);
  }, [participants]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      analysersRef.current.forEach((val) => {
        try { val.source.disconnect(); } catch {}
      });
      analysersRef.current.clear();
      if (audioContextRef.current?.state !== 'closed') {
        try { audioContextRef.current?.close(); } catch {}
      }
    };
  }, []);

  return speakingIndex;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  localStream,
  localDisplayName,
  isMuted,
  isCameraOff,
  onActiveVideoRef,
}) => {
  const [manualActiveIndex, setManualActiveIndex] = useState<number | null>(null);

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

  const speakingIndex = useActiveSpeakerDetection(allParticipants);

  // Determine active speaker: manual override > detected speaker > first remote > local
  let activeIndex: number;
  if (manualActiveIndex !== null && manualActiveIndex < allParticipants.length) {
    activeIndex = manualActiveIndex;
  } else if (speakingIndex !== -1 && speakingIndex < allParticipants.length) {
    activeIndex = speakingIndex;
  } else if (allParticipants.length > 1) {
    activeIndex = 1; // first remote participant
  } else {
    activeIndex = 0; // only local
  }

  const activeSpeaker = allParticipants[activeIndex];
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
          isCameraOff={activeSpeaker.isLocal ? isCameraOff : undefined}
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
              isActive={index === activeIndex}
              isSpeaking={index === speakingIndex}
              isCameraOff={p.isLocal ? isCameraOff : undefined}
              onClick={() => setManualActiveIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
