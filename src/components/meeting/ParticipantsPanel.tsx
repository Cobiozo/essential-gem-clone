import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, X, VolumeX, Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface Participant {
  peerId: string;
  displayName: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isLocal?: boolean;
  avatarUrl?: string;
  userId?: string;
  isGuest?: boolean;
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
  // Role props
  isHost?: boolean;
  isCoHost?: boolean;
  hostUserId?: string;
  coHostUserIds?: string[];
  currentUserId?: string;
  onToggleCoHost?: (userId: string) => void;
  // Guest mode
  guestMode?: boolean;
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
  isHost = false,
  isCoHost = false,
  hostUserId,
  coHostUserIds = [],
  currentUserId,
  onToggleCoHost,
  guestMode = false,
}) => {
  const [hoveredPeerId, setHoveredPeerId] = useState<string | null>(null);
  const canManage = isHost || isCoHost;

  const allParticipants: Participant[] = [
    {
      peerId: 'local',
      displayName: localDisplayName,
      isMuted: localIsMuted,
      isCameraOff: localIsCameraOff,
      isLocal: true,
      avatarUrl: localAvatarUrl,
      userId: currentUserId,
      isGuest: guestMode,
    },
    ...participants,
  ];

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleBadge = (p: Participant) => {
    if (p.userId === hostUserId) {
      return <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-blue-600/20 text-blue-400 border-0">Prowadzący</Badge>;
    }
    if (p.userId && coHostUserIds.includes(p.userId)) {
      return <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-green-600/20 text-green-400 border-0">Współprowadzący</Badge>;
    }
    if (p.isGuest) {
      return <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-orange-600/20 text-orange-400 border-0">Gość</Badge>;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">
          Uczestnicy ({allParticipants.length})
        </h3>
        <div className="flex items-center gap-1">
          {canManage && onMuteAll && participants.length > 0 && (
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
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white truncate block">
                  {p.displayName}
                  {p.isLocal && (
                    <span className="text-zinc-500 text-xs ml-1">(Ty)</span>
                  )}
                </span>
                {getRoleBadge(p)}
              </div>
              <div className="flex items-center gap-1.5">
                {/* Co-host toggle - only host can do this, not for self or current host */}
                {isHost && !p.isGuest && hoveredPeerId === p.peerId && !p.isLocal && p.userId && p.userId !== hostUserId && onToggleCoHost && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onToggleCoHost(p.userId!)}
                        className="p-0.5 rounded hover:bg-zinc-700 transition-colors"
                      >
                        {coHostUserIds.includes(p.userId) ? (
                          <ShieldOff className="h-3.5 w-3.5 text-orange-400" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {coHostUserIds.includes(p.userId!) ? 'Odbierz współprowadzenie' : 'Nadaj współprowadzenie'}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Mute button on hover for non-local participants */}
                {!p.isLocal && hoveredPeerId === p.peerId && canManage && onMuteParticipant ? (
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
