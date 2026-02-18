import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Users, MessageCircle, PictureInPicture2, Square, LayoutGrid, UserCheck, Presentation, Settings } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MeetingSettingsDialog, type MeetingSettings } from './MeetingSettingsDialog';
import type { ViewMode } from './VideoGrid';

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
  viewMode: ViewMode;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onTogglePiP: () => void;
  onLeave: () => void;
  onEndMeeting?: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  // Permission props
  isHost?: boolean;
  isCoHost?: boolean;
  meetingSettings?: MeetingSettings;
  onMeetingSettingsChange?: (settings: MeetingSettings) => void;
  canChat?: boolean;
  canMicrophone?: boolean;
  canCamera?: boolean;
  canScreenShare?: boolean;
}

const ControlButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: string | number;
  highlighted?: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
}> = ({ icon, label, onClick, active, danger, badge, highlighted, disabled, disabledTooltip }) => {
  const button = (
    <button
      onClick={disabled ? undefined : onClick}
      className={`flex flex-col items-center gap-1 min-w-[48px] ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
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

  if (disabled && disabledTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top">{disabledTooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
};

const VIEW_MODES: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'speaker', label: 'Mówca', icon: <Presentation className="h-4 w-4" /> },
  { mode: 'gallery', label: 'Galeria', icon: <LayoutGrid className="h-4 w-4" /> },
  { mode: 'multi-speaker', label: 'Wielu mówców', icon: <UserCheck className="h-4 w-4" /> },
];

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
  viewMode,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onTogglePiP,
  onLeave,
  onEndMeeting,
  onViewModeChange,
  isHost = false,
  isCoHost = false,
  meetingSettings,
  onMeetingSettingsChange,
  canChat = true,
  canMicrophone = true,
  canCamera = true,
  canScreenShare = true,
}) => {
  const canManage = isHost || isCoHost;
  const disabledTip = 'Prowadzący wyłączył tę funkcję';

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-zinc-900 border-t border-zinc-800 flex-wrap" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <ControlButton
        icon={isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
        label="Mikrofon"
        onClick={onToggleMute}
        active={isMuted}
        disabled={!canMicrophone && !canManage}
        disabledTooltip={disabledTip}
      />

      <ControlButton
        icon={isCameraOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
        label="Kamera"
        onClick={onToggleCamera}
        active={isCameraOff}
        disabled={!canCamera && !canManage}
        disabledTooltip={disabledTip}
      />

      <ControlButton
        icon={<Monitor className="h-5 w-5 text-white" />}
        label="Ekran"
        onClick={onToggleScreenShare}
        active={isScreenSharing}
        disabled={!canScreenShare && !canManage}
        disabledTooltip={disabledTip}
      />

      <ControlButton
        icon={<MessageCircle className="h-5 w-5 text-white" />}
        label="Czat"
        onClick={onToggleChat}
        highlighted={isChatOpen}
        badge={unreadChatCount}
        disabled={!canChat && !canManage}
        disabledTooltip={disabledTip}
      />

      <ControlButton
        icon={<Users className="h-5 w-5 text-white" />}
        label={String(participantCount)}
        onClick={onToggleParticipants}
        highlighted={isParticipantsOpen}
      />

      {/* View mode dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex flex-col items-center gap-1 min-w-[48px]">
            <div className="w-11 h-11 rounded-full flex items-center justify-center transition-colors bg-zinc-700 hover:bg-zinc-600">
              <LayoutGrid className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] text-zinc-400 font-medium">Widok</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" className="bg-zinc-800 border-zinc-700 min-w-[160px]">
          {VIEW_MODES.map(({ mode, label, icon }) => (
            <DropdownMenuItem
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`flex items-center gap-2 text-sm cursor-pointer ${
                viewMode === mode ? 'text-blue-400 bg-zinc-700/50' : 'text-zinc-200 hover:text-white'
              }`}
            >
              {icon}
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings - only for host/co-host */}
      {canManage && meetingSettings && onMeetingSettingsChange && (
        <MeetingSettingsDialog
          settings={meetingSettings}
          onSettingsChange={onMeetingSettingsChange}
        />
      )}

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

      {(onEndMeeting && canManage) && (
        <ControlButton
          icon={<Square className="h-5 w-5 text-white" />}
          label="Zakończ"
          onClick={onEndMeeting}
          danger
        />
      )}
    </div>
  );
};
