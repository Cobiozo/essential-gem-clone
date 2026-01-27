import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UnifiedMessage } from '@/hooks/useUnifiedChat';

interface MessageBubbleProps {
  message: UnifiedMessage;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-start gap-3">
      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        {message.senderAvatar && (
          <AvatarImage src={message.senderAvatar} alt={message.senderName} />
        )}
        <AvatarFallback className="text-xs bg-primary text-primary-foreground font-medium">
          {message.senderInitials}
        </AvatarFallback>
      </Avatar>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Sender info */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-foreground">
            {message.senderName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            'inline-block px-4 py-2.5 rounded-2xl max-w-[85%]',
            message.isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
};
