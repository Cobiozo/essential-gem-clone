import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Users, MessageCircle } from 'lucide-react';

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

const ControlButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: string | number;
}> = ({ icon, label, onClick, active, danger, badge }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1 min-w-[56px]"
  >
    <div
      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
        danger
          ? 'bg-red-600 hover:bg-red-700'
          : active
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-zinc-700 hover:bg-zinc-600'
      }`}
    >
      {icon}
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
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
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 px-4 py-3 bg-zinc-900 border-t border-zinc-800">
      {/* Mic */}
      <ControlButton
        icon={isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
        label="Mikrofon"
        onClick={onToggleMute}
        active={isMuted}
      />

      {/* Camera */}
      <ControlButton
        icon={isCameraOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
        label="Kamera"
        onClick={onToggleCamera}
        active={isCameraOff}
      />

      {/* Screen share */}
      <ControlButton
        icon={<Monitor className="h-5 w-5 text-white" />}
        label="Ekran"
        onClick={onToggleScreenShare}
        active={isScreenSharing}
      />

      {/* Chat placeholder */}
      <ControlButton
        icon={<MessageCircle className="h-5 w-5 text-white" />}
        label="Czat"
        onClick={() => {}}
      />

      {/* Participants */}
      <div className="flex flex-col items-center gap-1 min-w-[56px]">
        <div className="relative w-11 h-11 rounded-full flex items-center justify-center bg-zinc-700">
          <Users className="h-5 w-5 text-white" />
        </div>
        <span className="text-[10px] text-zinc-400 font-medium">{participantCount}</span>
      </div>

      {/* Leave */}
      <ControlButton
        icon={<PhoneOff className="h-5 w-5 text-white" />}
        label="Opuść"
        onClick={onLeave}
        danger
      />
    </div>
  );
};
