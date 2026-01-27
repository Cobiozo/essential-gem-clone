import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UnifiedChannel } from '@/hooks/useUnifiedChat';

interface ChannelListItemProps {
  channel: UnifiedChannel;
  isSelected: boolean;
  onClick: () => void;
}

// Get initials from channel name
const getInitials = (name: string): string => {
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Get avatar color based on channel type
const getAvatarColor = (channel: UnifiedChannel): string => {
  if (channel.isIncoming) {
    return 'bg-blue-500';
  }
  if (channel.type === 'broadcast') {
    return 'bg-purple-500';
  }
  return 'bg-primary';
};

export const ChannelListItem = ({ channel, isSelected, onClick }: ChannelListItemProps) => {
  const initials = getInitials(channel.name);
  const avatarColor = getAvatarColor(channel);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 transition-colors flex items-center gap-3',
        isSelected
          ? 'bg-primary/10 border-l-2 border-primary'
          : 'hover:bg-muted/50 border-l-2 border-transparent'
      )}
    >
      {/* Avatar */}
      <Avatar className={cn('h-12 w-12 shrink-0', avatarColor)}>
        <AvatarFallback className="text-white font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'font-medium text-sm truncate',
            isSelected ? 'text-primary' : 'text-foreground'
          )}>
            {channel.name}
          </span>
          {channel.lastMessageAt && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(channel.lastMessageAt)}
            </span>
          )}
        </div>
        
        {/* Last message preview */}
        {channel.lastMessage && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {channel.lastMessage}
          </p>
        )}
      </div>

      {/* Unread badge */}
      {channel.unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="h-5 min-w-5 px-1.5 text-xs shrink-0"
        >
          {channel.unreadCount}
        </Badge>
      )}
    </button>
  );
};

// Format time for display
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Wczoraj';
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('pl-PL', { weekday: 'short' });
  }
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
};
