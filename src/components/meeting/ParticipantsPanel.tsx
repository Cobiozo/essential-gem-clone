import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, X, VolumeX } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Participant {
  peerId: string;
  displayName: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isLocal?: boolean;
  avatarUrl?: string;
}

interface ParticipantsPanelProps {
  participants: Participant[];
  localDisplayName: string;
  localIsMuted: boolean;
  localIsCameraOff: boolean;
  localAvatarUrl?: string;
  onClose: () => void;
  onMuteAll?: () => void;
  onMuteParticipant?: (peerId: string) => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  participants,
  localDisplayName,
  localIsMuted,
  localIsCameraOff,
  localAvatarUrl,
  onClose,
  onMuteAll,
  onMuteParticipant,
}) => {
  const [hoveredPeerId, setHoveredPeerId] = useState<string | null>(null);

  const allParticipants: Participant[] = [
    {
      peerId: 'local',
      displayName: localDisplayName,
      isMuted: localIsMuted,
      isCameraOff: localIsCameraOff,
      isLocal: true,
      avatarUrl: localAvatarUrl,
    },
    ...participants,
  ];

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">
          Uczestnicy ({allParticipants.length})
        </h3>
        <div className="flex items-center gap-1">
          {onMuteAll && participants.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  onClick={onMuteAll}
                >
                  <VolumeX className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Wycisz wszystkich</TooltipContent>
            </Tooltip>
          )}
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2 space-y-1">
          {allParticipants.map((p) => (
            <div
              key={p.peerId}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors group"
              onMouseEnter={() => setHoveredPeerId(p.peerId)}
              onMouseLeave={() => setHoveredPeerId(null)}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.displayName} />}
                <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs font-medium">
                  {getInitials(p.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-white flex-1 truncate">
                {p.displayName}
                {p.isLocal && (
                  <span className="text-zinc-500 text-xs ml-1">(Ty)</span>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                {/* Show mute/unmute button on hover for non-local participants */}
                {!p.isLocal && hoveredPeerId === p.peerId && onMuteParticipant ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onMuteParticipant(p.peerId)}
                        className="p-0.5 rounded hover:bg-zinc-700 transition-colors"
                      >
                        {p.isMuted ? (
                          <Mic className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <MicOff className="h-3.5 w-3.5 text-orange-400" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {p.isMuted ? 'Poproś o odciszenie' : 'Wycisz'}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    {p.isMuted ? (
                      <MicOff className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <Mic className="h-3.5 w-3.5 text-zinc-500" />
                    )}
                  </>
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
