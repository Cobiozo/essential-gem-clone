import React, { useEffect, useRef, useState, useCallback } from 'react';
import { User, MicOff, Mic } from 'lucide-react';

export type ViewMode = 'speaker' | 'gallery' | 'multi-speaker';

interface VideoParticipant {
  peerId: string;
  displayName: string;
  stream: MediaStream | null;
  isMuted?: boolean;
  isLocal?: boolean;
  avatarUrl?: string;
}

interface VideoGridProps {
  participants: VideoParticipant[];
  localStream: MediaStream | null;
  localDisplayName: string;
  localAvatarUrl?: string;
  isMuted: boolean;
  isCameraOff: boolean;
  viewMode: ViewMode;
  isScreenSharing?: boolean;
  onActiveVideoRef?: (el: HTMLVideoElement | null) => void;
  onAudioBlocked?: () => void;
  remoteScreenShareStream?: MediaStream | null;
  remoteScreenSharerName?: string;
  remoteScreenSharerPeerId?: string;
}

// Helper: play video with muted fallback for mobile autoplay policy
const playVideoSafe = async (video: HTMLVideoElement, isLocal: boolean, onAudioBlocked?: () => void) => {
  if (isLocal) {
    video.play().catch(() => {});
    return;
  }
  try {
    await video.play();
  } catch {
    // Autoplay with audio blocked — mute and retry
    video.muted = true;
    try {
      await video.play();
      console.warn('[VideoGrid] Autoplay blocked — playing muted, notifying user');
      onAudioBlocked?.();
    } catch (e2) {
      console.error('[VideoGrid] Even muted play() failed:', e2);
    }
  }
};

// ─── Audio indicator component ───
const AudioIndicator: React.FC<{ audioLevel: number; isMuted?: boolean; size?: 'sm' | 'md' }> = ({
  audioLevel,
  isMuted,
  size = 'md',
}) => {
  if (isMuted) {
    return (
      <span className="bg-red-600 p-1 rounded-full">
        <MicOff className={size === 'sm' ? 'h-2 w-2 text-white' : 'h-3 w-3 text-white'} />
      </span>
    );
  }

  const isActive = audioLevel > 0.1;
  const iconSize = size === 'sm' ? 'h-2 w-2' : 'h-3 w-3';

  return (
    <span
      className={`p-1 rounded-full transition-all duration-150 ${
        isActive ? 'bg-green-600' : 'bg-zinc-600'
      }`}
      style={isActive ? { boxShadow: `0 0 ${4 + audioLevel * 8}px rgba(34,197,94,${0.4 + audioLevel * 0.6})` } : undefined}
    >
      <Mic className={`${iconSize} text-white`} />
    </span>
  );
};

// ─── Audio-only element for decoupled audio playback ───
const AudioElement: React.FC<{ stream: MediaStream; onAudioBlocked?: () => void }> = ({ stream, onAudioBlocked }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => {
      el.muted = true;
      el.play().then(() => {
        console.warn('[AudioElement] Autoplay blocked — playing muted');
        onAudioBlocked?.();
      }).catch(() => {});
    });
  }, [stream, onAudioBlocked]);
  return <video ref={ref} autoPlay playsInline data-audio-only="true" style={{ display: 'none' }} />;
};

// ─── Hidden audio streams for speaker/multi-speaker modes ───
const AudioOnlyStreams: React.FC<{ participants: VideoParticipant[]; onAudioBlocked?: () => void }> = ({ participants, onAudioBlocked }) => (
  <>
    {participants
      .filter(p => !p.isLocal && p.stream)
      .map(p => (
        <AudioElement key={p.peerId} stream={p.stream!} onAudioBlocked={onAudioBlocked} />
      ))}
  </>
);

// ─── Video Tile ───
const VideoTile: React.FC<{
  participant: VideoParticipant;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  audioLevel?: number;
  className?: string;
  showOverlay?: boolean;
  forceAudioMuted?: boolean;
  videoRefCallback?: (el: HTMLVideoElement | null) => void;
  onAudioBlocked?: () => void;
}> = ({ participant, isCameraOff, isScreenSharing, audioLevel = 0, className = '', showOverlay = true, forceAudioMuted, videoRefCallback, onAudioBlocked }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !participant.stream) return;

    // When forceAudioMuted, create video-only stream to avoid AEC echo
    if (forceAudioMuted) {
      const videoTracks = participant.stream.getVideoTracks();
      video.srcObject = videoTracks.length > 0 ? new MediaStream(videoTracks) : participant.stream;
    } else {
      video.srcObject = participant.stream;
    }

    playVideoSafe(video, !!participant.isLocal, onAudioBlocked);

    const handleLoaded = () => {
      if (video.paused && video.srcObject) {
        playVideoSafe(video, !!participant.isLocal, onAudioBlocked);
      }
    };
    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('loadeddata', handleLoaded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('loadeddata', handleLoaded);
    };
  }, [participant.stream, forceAudioMuted, onAudioBlocked]);

  // Observe track changes within existing stream (reconnect scenarios)
  useEffect(() => {
    const stream = participant.stream;
    const video = videoRef.current;
    if (!stream || !video) return;

    const handleTrackChange = () => {
      if (forceAudioMuted) {
        const videoTracks = stream.getVideoTracks();
        video.srcObject = videoTracks.length > 0 ? new MediaStream(videoTracks) : stream;
      } else {
        if (video.srcObject !== stream) video.srcObject = stream;
      }
      playVideoSafe(video, !!participant.isLocal, onAudioBlocked);
    };

    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);

    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
    };
  }, [participant.stream, onAudioBlocked]);

  useEffect(() => {
    if (videoRefCallback) videoRefCallback(videoRef.current);
  }, [videoRefCallback]);

  // Force re-play on tab return (mobile Safari fix)
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && videoRef.current && participant.stream) {
        const video = videoRef.current;
        if (video.paused || video.ended) {
          playVideoSafe(video, !!participant.isLocal, onAudioBlocked);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [participant.stream, participant.isLocal, onAudioBlocked]);

  const showVideo = participant.isLocal
    ? participant.stream && !isCameraOff
    : participant.stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

  return (
    <div className={`relative bg-zinc-900 overflow-hidden flex items-center justify-center ${className}`}>
      {/* Always keep video in DOM to preserve srcObject */}
      {/* @ts-ignore webkit-playsinline for Safari */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        // @ts-ignore
        webkit-playsinline=""
        muted={participant.isLocal || !!forceAudioMuted}
        data-local-video={participant.isLocal ? 'true' : undefined}
        className={showVideo
          ? `max-w-full max-h-full object-contain ${participant.isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''}`
          : 'hidden'
        }
      />

      {!showVideo && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
            {participant.avatarUrl ? (
              <img src={participant.avatarUrl} alt={participant.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-zinc-300">
                {participant.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            )}
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
            <AudioIndicator audioLevel={audioLevel} isMuted={participant.isMuted} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Thumbnail Tile ───
const ThumbnailTile: React.FC<{
  participant: VideoParticipant;
  isActive: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  isCameraOff?: boolean;
  playAudio?: boolean;
  onClick: () => void;
}> = ({ participant, isActive, isSpeaking, audioLevel, isCameraOff, playAudio, onClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !participant.stream) return;
    video.srcObject = participant.stream;
    playVideoSafe(video, !!participant.isLocal);

    const handleLoaded = () => {
      if (video.paused && video.srcObject) {
        playVideoSafe(video, !!participant.isLocal);
      }
    };
    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('loadeddata', handleLoaded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('loadeddata', handleLoaded);
    };
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
          muted={!playAudio}
          className={`w-full h-full object-cover ${participant.isLocal && !isCameraOff ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <User className="h-5 w-5 text-zinc-500" />
        </div>
      )}
      <div className="absolute bottom-0.5 right-0.5">
        <AudioIndicator audioLevel={audioLevel} isMuted={participant.isMuted} size="sm" />
      </div>
    </button>
  );
};

// ─── Speaker detection hook ───
interface SpeakerDetection {
  speakingIndex: number;
  audioLevels: Map<string, number>;
}

function useActiveSpeakerDetection(participants: VideoParticipant[]): SpeakerDetection {
  const [speakingIndex, setSpeakingIndex] = useState(-1);
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());
  const lastSpeakerChangeRef = useRef(0);

  useEffect(() => {
    if (!audioContextRef.current) {
      try { audioContextRef.current = new AudioContext(); } catch { return; }
    }
    const ctx = audioContextRef.current;
    // Resume AudioContext if suspended (browsers block until user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const currentIds = new Set(participants.map(p => p.peerId));
    analysersRef.current.forEach((val, key) => {
      if (!currentIds.has(key)) {
        try { val.source.disconnect(); } catch {}
        analysersRef.current.delete(key);
      }
    });

    // Create analysers for ALL participants (including local for mic indicator)
    participants.forEach((p) => {
      if (!p.stream || analysersRef.current.has(p.peerId)) return;
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

    const interval = setInterval(() => {
      let maxLevel = 25; // raised threshold to reduce false triggers
      let maxIndex = -1;
      const newLevels = new Map<string, number>();

      participants.forEach((p, index) => {
        const entry = analysersRef.current.get(p.peerId);
        if (!entry) {
          newLevels.set(p.peerId, 0);
          return;
        }

        const data = new Uint8Array(entry.analyser.frequencyBinCount);
        entry.analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const normalized = Math.min(avg / 80, 1); // normalize to 0-1
        newLevels.set(p.peerId, normalized);

        // Only consider non-local for speaker switching
        if (!p.isLocal && avg > maxLevel) {
          maxLevel = avg;
          maxIndex = index;
        }
      });

      setAudioLevels(newLevels);

      const now = Date.now();
      // Hold time: 2.5s minimum before switching speaker + hysteresis
      if (maxIndex !== -1 && now - lastSpeakerChangeRef.current > 2500) {
        setSpeakingIndex((prev) => {
          if (prev !== maxIndex) {
            // Hysteresis: only switch if new speaker is significantly louder
            const prevLevel = prev >= 0 && prev < participants.length
              ? newLevels.get(participants[prev].peerId) || 0
              : 0;
            const newLevel = newLevels.get(participants[maxIndex].peerId) || 0;
            // Only switch if new speaker is at least 0.15 louder (normalized) or prev is silent
            if (newLevel > prevLevel + 0.15 || prevLevel < 0.05) {
              lastSpeakerChangeRef.current = now;
              return maxIndex;
            }
          }
          return prev;
        });
      }
    }, 250); // slightly slower polling

    return () => clearInterval(interval);
  }, [participants]);

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

  return { speakingIndex, audioLevels };
}

// ─── Gallery Layout ───
const GalleryLayout: React.FC<{
  participants: VideoParticipant[];
  isCameraOff: boolean;
  isScreenSharing?: boolean;
  audioLevels: Map<string, number>;
  onActiveVideoRef?: (el: HTMLVideoElement | null) => void;
  onAudioBlocked?: () => void;
}> = ({ participants, isCameraOff, isScreenSharing, audioLevels, onActiveVideoRef, onAudioBlocked }) => {
  const cols = participants.length <= 2 ? 'grid-cols-1 md:grid-cols-2'
    : participants.length <= 4 ? 'grid-cols-2'
    : participants.length <= 9 ? 'grid-cols-2 md:grid-cols-3'
    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={`flex-1 grid ${cols} gap-1 p-1 bg-black`}>
      {participants.map((p, i) => (
        <VideoTile
          key={p.peerId}
          participant={p}
          isCameraOff={p.isLocal ? isCameraOff : undefined}
          isScreenSharing={p.isLocal ? isScreenSharing : undefined}
          audioLevel={audioLevels.get(p.peerId) || 0}
          className="rounded-lg min-h-0"
          videoRefCallback={
            i === participants.findIndex(pp => !pp.isLocal)
              ? onActiveVideoRef
              : (i === 0 && !participants.some(pp => !pp.isLocal) ? onActiveVideoRef : undefined)
          }
          onAudioBlocked={onAudioBlocked}
        />
      ))}
    </div>
  );
};

// ─── Multi-speaker Layout ───
const MultiSpeakerLayout: React.FC<{
  participants: VideoParticipant[];
  isCameraOff: boolean;
  isScreenSharing?: boolean;
  audioLevels: Map<string, number>;
  speakingIndex: number;
  onActiveVideoRef?: (el: HTMLVideoElement | null) => void;
  onAudioBlocked?: () => void;
}> = ({ participants, isCameraOff, isScreenSharing, audioLevels, speakingIndex, onActiveVideoRef, onAudioBlocked }) => {
  // Show top 2-3 speakers in large tiles
  const speakerIndices = new Set<number>();
  if (speakingIndex >= 0) speakerIndices.add(speakingIndex);
  const sorted = [...participants]
    .map((p, i) => ({ index: i, level: audioLevels.get(p.peerId) || 0 }))
    .sort((a, b) => b.level - a.level);
  for (const s of sorted) {
    if (speakerIndices.size >= 3) break;
    if (!participants[s.index].isLocal) speakerIndices.add(s.index);
  }
  if (speakerIndices.size === 0 && participants.length > 1) speakerIndices.add(1);

  const mainSpeakers = [...speakerIndices];
  const others = participants.filter((_, i) => !speakerIndices.has(i));

  return (
    <div className="flex-1 flex flex-col bg-black">
      <div className={`flex-1 flex gap-1 p-1 ${mainSpeakers.length === 1 ? '' : ''}`}>
        {mainSpeakers.map((idx, i) => (
          <VideoTile
            key={participants[idx].peerId}
            participant={participants[idx]}
            isCameraOff={participants[idx].isLocal ? isCameraOff : undefined}
            isScreenSharing={participants[idx].isLocal ? isScreenSharing : undefined}
            audioLevel={audioLevels.get(participants[idx].peerId) || 0}
            className="flex-1 rounded-lg min-h-0"
            videoRefCallback={
              i === 0 && !mainSpeakers.some(idx => !participants[idx].isLocal)
                ? onActiveVideoRef
                : (i === mainSpeakers.findIndex(idx => !participants[idx].isLocal) ? onActiveVideoRef : undefined)
            }
            onAudioBlocked={onAudioBlocked}
          />
        ))}
      </div>
      {others.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-black/80 overflow-x-auto">
          {others.map((p) => (
            <div key={p.peerId} className="relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center">
              {p.stream ? (
                <MiniVideo participant={p} isCameraOff={p.isLocal ? isCameraOff : undefined} playAudio={!p.isLocal} />
              ) : (
                <User className="h-5 w-5 text-zinc-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Mini video for thumbnails in multi-speaker
const MiniVideo: React.FC<{ participant: VideoParticipant; isCameraOff?: boolean; playAudio?: boolean }> = ({ participant, isCameraOff, playAudio }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !participant.stream) return;
    video.srcObject = participant.stream;
    playVideoSafe(video, !!participant.isLocal);

    const handleLoaded = () => {
      if (video.paused && video.srcObject) {
        playVideoSafe(video, !!participant.isLocal);
      }
    };
    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('loadeddata', handleLoaded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('loadeddata', handleLoaded);
    };
  }, [participant.stream]);

  const showVideo = participant.isLocal
    ? participant.stream && !isCameraOff
    : participant.stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

  if (!showVideo) return <User className="h-5 w-5 text-zinc-500" />;

  return (
    <video ref={ref} autoPlay playsInline muted={!playAudio}
      className={`w-full h-full object-cover ${participant.isLocal && !isCameraOff ? 'scale-x-[-1]' : ''}`} />
  );
};

// ─── Draggable Floating PiP ───
const DraggableFloatingPiP: React.FC<{
  participant: VideoParticipant;
  isCameraOff?: boolean;
  audioLevel: number;
}> = ({ participant, isCameraOff, audioLevel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize position to bottom-right
  useEffect(() => {
    if (pos.x === -1 && containerRef.current?.parentElement) {
      const parent = containerRef.current.parentElement;
      setPos({ x: parent.clientWidth - 220, y: parent.clientHeight - 170 });
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !participant.stream) return;
    video.srcObject = participant.stream;
    playVideoSafe(video, !!participant.isLocal);
  }, [participant.stream]);

  const handleStart = (clientX: number, clientY: number) => {
    dragging.current = true;
    offset.current = { x: clientX - pos.x, y: clientY - pos.y };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current || !containerRef.current?.parentElement) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const parent = containerRef.current.parentElement;
      const newX = Math.max(0, Math.min(parent.clientWidth - 200, clientX - offset.current.x));
      const newY = Math.max(0, Math.min(parent.clientHeight - 150, clientY - offset.current.y));
      setPos({ x: newX, y: newY });
    };
    const handleEnd = () => { dragging.current = false; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [pos]);

  const showVideo = participant.isLocal
    ? participant.stream && !isCameraOff
    : participant.stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

  return (
    <div
      ref={containerRef}
      className="absolute z-30 w-[200px] h-[150px] rounded-xl overflow-hidden shadow-2xl border-2 border-zinc-600 cursor-grab active:cursor-grabbing bg-zinc-900"
      style={{ left: pos.x >= 0 ? pos.x : undefined, top: pos.y >= 0 ? pos.y : undefined, right: pos.x < 0 ? 16 : undefined, bottom: pos.y < 0 ? 16 : undefined }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!!participant.isLocal}
          className={`w-full h-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
          <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
            {participant.avatarUrl ? (
              <img src={participant.avatarUrl} alt={participant.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-semibold text-zinc-300">
                {participant.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
        <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded font-medium truncate">
          {participant.displayName}
        </span>
        <AudioIndicator audioLevel={audioLevel} isMuted={participant.isMuted} size="sm" />
      </div>
    </div>
  );
};

// ─── Screen Share Layout ───
const ScreenShareLayout: React.FC<{
  screenStream: MediaStream;
  sharerName: string;
  sharerParticipant?: VideoParticipant;
  allParticipants: VideoParticipant[];
  isCameraOff: boolean;
  audioLevels: Map<string, number>;
  onAudioBlocked?: () => void;
}> = ({ screenStream, sharerName, sharerParticipant, allParticipants, isCameraOff, audioLevels, onAudioBlocked }) => {
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = screenVideoRef.current;
    if (!video || !screenStream) return;
    video.srcObject = screenStream;
    playVideoSafe(video, false, onAudioBlocked);
  }, [screenStream, onAudioBlocked]);

  return (
    <div className="flex-1 flex flex-col bg-black relative">
      <div className="flex-1 relative flex items-center justify-center">
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          muted
          className="max-w-full max-h-full object-contain"
        />
        <div className="absolute top-2 left-2 bg-red-600/80 text-white text-xs px-2 py-1 rounded-md font-medium">
          📺 {sharerName} udostępnia ekran
        </div>

        {/* Draggable PiP for sharer's camera */}
        {sharerParticipant && (
          <DraggableFloatingPiP
            participant={sharerParticipant}
            isCameraOff={sharerParticipant.isLocal ? isCameraOff : undefined}
            audioLevel={audioLevels.get(sharerParticipant.peerId) || 0}
          />
        )}
      </div>

      {/* Thumbnail strip for other participants */}
      {allParticipants.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-black/80 overflow-x-auto">
          {allParticipants
            .filter(p => p.peerId !== sharerParticipant?.peerId)
            .map((p) => (
              <div key={p.peerId} className="relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center">
                <MiniVideo participant={p} isCameraOff={p.isLocal ? isCameraOff : undefined} playAudio={!p.isLocal} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

// ─── Main VideoGrid ───
export const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  localStream,
  localDisplayName,
  localAvatarUrl,
  isMuted,
  isCameraOff,
  viewMode,
  isScreenSharing,
  onActiveVideoRef,
  onAudioBlocked,
  remoteScreenShareStream,
  remoteScreenSharerName,
  remoteScreenSharerPeerId,
}) => {
  const [manualActiveIndex, setManualActiveIndex] = useState<number | null>(null);
  const manualTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allParticipants: VideoParticipant[] = [
    { peerId: 'local', displayName: localDisplayName, stream: localStream, isMuted, isLocal: true, avatarUrl: localAvatarUrl },
    ...participants,
  ];

  const { speakingIndex, audioLevels } = useActiveSpeakerDetection(allParticipants);

  // Reset manual selection after 5s of new speaker
  useEffect(() => {
    if (manualActiveIndex !== null && speakingIndex !== -1 && speakingIndex !== manualActiveIndex) {
      if (manualTimeoutRef.current) clearTimeout(manualTimeoutRef.current);
      manualTimeoutRef.current = setTimeout(() => setManualActiveIndex(null), 5000);
    }
    return () => { if (manualTimeoutRef.current) clearTimeout(manualTimeoutRef.current); };
  }, [speakingIndex, manualActiveIndex]);

  let activeIndex: number;
  if (manualActiveIndex !== null && manualActiveIndex < allParticipants.length) {
    activeIndex = manualActiveIndex;
  } else if (speakingIndex !== -1 && speakingIndex < allParticipants.length) {
    activeIndex = speakingIndex;
  } else if (allParticipants.length > 1) {
    activeIndex = 1;
  } else {
    activeIndex = 0;
  }

  const activeSpeaker = allParticipants[activeIndex];
  const showThumbnails = allParticipants.length > 1;

  const handleVideoRef = useCallback(
    (el: HTMLVideoElement | null) => { onActiveVideoRef?.(el); },
    [onActiveVideoRef]
  );

  // ─── Screen share mode (overrides other modes) ───
  if (remoteScreenShareStream) {
    const sharerParticipant = remoteScreenSharerPeerId
      ? allParticipants.find(p => p.peerId === remoteScreenSharerPeerId)
      : undefined;
    return (
      <ScreenShareLayout
        screenStream={remoteScreenShareStream}
        sharerName={remoteScreenSharerName || 'Uczestnik'}
        sharerParticipant={sharerParticipant}
        allParticipants={allParticipants}
        isCameraOff={isCameraOff}
        audioLevels={audioLevels}
        onAudioBlocked={onAudioBlocked}
      />
    );
  }

  // ─── Gallery mode ───
  if (viewMode === 'gallery') {
    return <GalleryLayout participants={allParticipants} isCameraOff={isCameraOff} isScreenSharing={isScreenSharing} audioLevels={audioLevels} onActiveVideoRef={handleVideoRef} onAudioBlocked={onAudioBlocked} />;
  }

  // ─── Multi-speaker mode ───
  if (viewMode === 'multi-speaker') {
    return <MultiSpeakerLayout participants={allParticipants} isCameraOff={isCameraOff} isScreenSharing={isScreenSharing} audioLevels={audioLevels} speakingIndex={speakingIndex} onActiveVideoRef={handleVideoRef} onAudioBlocked={onAudioBlocked} />;
  }


  // ─── Speaker mode (default) ───
  return (
    <div className="flex-1 flex flex-col bg-black relative">
      <div className="flex-1 relative">
        <VideoTile
          participant={activeSpeaker}
          isCameraOff={activeSpeaker.isLocal ? isCameraOff : undefined}
          isScreenSharing={activeSpeaker.isLocal ? isScreenSharing : undefined}
          audioLevel={audioLevels.get(activeSpeaker.peerId) || 0}
          className="absolute inset-0 rounded-none"
          showOverlay={true}
          videoRefCallback={handleVideoRef}
          onAudioBlocked={onAudioBlocked}
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
              audioLevel={audioLevels.get(p.peerId) || 0}
              isCameraOff={p.isLocal ? isCameraOff : undefined}
              playAudio={!p.isLocal && index !== activeIndex}
              onClick={() => setManualActiveIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
