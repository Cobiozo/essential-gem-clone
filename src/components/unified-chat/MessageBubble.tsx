import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { FileText, Download } from 'lucide-react';
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

  const renderAttachment = () => {
    if (!message.attachmentUrl) return null;

    const messageType = message.messageType || 'text';

    switch (messageType) {
      case 'image':
        return (
          <img 
            src={message.attachmentUrl} 
            alt={message.attachmentName || 'Obrazek'} 
            className="max-w-[280px] rounded-lg mt-2 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.attachmentUrl, '_blank')}
          />
        );
      
      case 'video':
        return (
          <video 
            src={message.attachmentUrl} 
            controls 
            controlsList="nodownload"
            className="max-w-[280px] rounded-lg mt-2"
          />
        );
      
      case 'audio':
        return (
          <audio 
            src={message.attachmentUrl} 
            controls 
            className="mt-2 max-w-[240px]"
          />
        );
      
      case 'file':
        return (
          <a 
            href={message.attachmentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 mt-2 p-2 bg-background/50 rounded-lg hover:bg-background/80 transition-colors"
          >
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm truncate max-w-[180px]">
              {message.attachmentName || 'Dokument'}
            </span>
            <Download className="h-4 w-4 ml-auto text-muted-foreground" />
          </a>
        );
      
      default:
        return null;
    }
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
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          {renderAttachment()}
        </div>
      </div>
    </div>
  );
};
