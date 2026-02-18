import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Users, MessageCircle, PictureInPicture2 } from 'lucide-react';

interface MeetingControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  participantCount: number;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isPiPActive: boolean;
  isPiPSupported: boolean;
  unreadChatCount: number;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onTogglePiP: () => void;
  onLeave: () => void;
}

const ControlButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: string | number;
  highlighted?: boolean;
}> = ({ icon, label, onClick, active, danger, badge, highlighted }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1 min-w-[48px]"
  >
    <div className="relative">
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
          danger
            ? 'bg-red-600 hover:bg-red-700'
            : active
            ? 'bg-red-600 hover:bg-red-700'
            : highlighted
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-zinc-700 hover:bg-zinc-600'
        }`}
      >
        {icon}
      </div>
      {badge !== undefined && Number(badge) > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1">
          {badge}
        </span>
      )}
    </div>
    <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
  </button>
);

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isMuted,
  isCameraOff,
  isScreenSharing,
  participantCount,
  isChatOpen,
  isParticipantsOpen,
  isPiPActive,
  isPiPSupported,
  unreadChatCount,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onTogglePiP,
  onLeave,
}) => {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3 bg-zinc-900 border-t border-zinc-800">
      <ControlButton
        icon={isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
        label="Mikrofon"
        onClick={onToggleMute}
        active={isMuted}
      />

      <ControlButton
        icon={isCameraOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
        label="Kamera"
        onClick={onToggleCamera}
        active={isCameraOff}
      />

      <ControlButton
        icon={<Monitor className="h-5 w-5 text-white" />}
        label="Ekran"
        onClick={onToggleScreenShare}
        active={isScreenSharing}
      />

      <ControlButton
        icon={<MessageCircle className="h-5 w-5 text-white" />}
        label="Czat"
        onClick={onToggleChat}
        highlighted={isChatOpen}
        badge={unreadChatCount}
      />

      <ControlButton
        icon={<Users className="h-5 w-5 text-white" />}
        label={String(participantCount)}
        onClick={onToggleParticipants}
        highlighted={isParticipantsOpen}
      />

      {isPiPSupported && (
        <ControlButton
          icon={<PictureInPicture2 className="h-5 w-5 text-white" />}
          label="PiP"
          onClick={onTogglePiP}
          highlighted={isPiPActive}
        />
      )}

      <ControlButton
        icon={<PhoneOff className="h-5 w-5 text-white" />}
        label="Opuść"
        onClick={onLeave}
        danger
      />
    </div>
  );
};
