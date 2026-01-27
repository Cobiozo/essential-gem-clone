import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/types/roleChat';
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
    <div
      className={cn(
        'flex gap-3',
        message.isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        {message.senderAvatar && (
          <AvatarImage src={message.senderAvatar} alt={message.senderName} />
        )}
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {message.senderInitials}
        </AvatarFallback>
      </Avatar>

      {/* Message content */}
      <div
        className={cn(
          'max-w-[70%] space-y-1',
          message.isOwn ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender info */}
        <div
          className={cn(
            'flex items-center gap-2 text-xs',
            message.isOwn ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="font-medium text-foreground">
            {message.senderName}
          </span>
          <span className="text-muted-foreground">
            {ROLE_LABELS[message.senderRole] || message.senderRole}
          </span>
          <span className="text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl',
            message.isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
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
