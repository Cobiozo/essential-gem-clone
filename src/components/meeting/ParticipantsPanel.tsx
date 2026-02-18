import React from 'react';
import { User, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Participant {
  peerId: string;
  displayName: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isLocal?: boolean;
}

interface ParticipantsPanelProps {
  participants: Participant[];
  localDisplayName: string;
  localIsMuted: boolean;
  localIsCameraOff: boolean;
  onClose: () => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  participants,
  localDisplayName,
  localIsMuted,
  localIsCameraOff,
  onClose,
}) => {
  const allParticipants: Participant[] = [
    {
      peerId: 'local',
      displayName: localDisplayName,
      isMuted: localIsMuted,
      isCameraOff: localIsCameraOff,
      isLocal: true,
    },
    ...participants,
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">
          Uczestnicy ({allParticipants.length})
        </h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2 space-y-1">
          {allParticipants.map((p) => (
            <div
              key={p.peerId}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-zinc-400" />
              </div>
              <span className="text-sm text-white flex-1 truncate">
                {p.displayName}
                {p.isLocal && (
                  <span className="text-zinc-500 text-xs ml-1">(Ty)</span>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                {p.isMuted ? (
                  <MicOff className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Mic className="h-3.5 w-3.5 text-zinc-500" />
                )}
                {p.isCameraOff ? (
                  <VideoOff className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Video className="h-3.5 w-3.5 text-zinc-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
