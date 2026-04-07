import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Download, Trash2 } from 'lucide-react';
import { RoleBadgedAvatar } from '@/components/chat/RoleBadgedAvatar';
import type { UnifiedMessage } from '@/hooks/useUnifiedChat';

interface MessageBubbleProps {
  message: UnifiedMessage;
  onDelete?: (messageId: string) => void;
}

export const MessageBubble = ({ message, onDelete }: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Deleted message placeholder
  if (message.isDeleted) {
    return (
      <div className={cn('flex w-full mb-4', message.isOwn ? 'justify-end' : 'justify-start')}>
        <div className="inline-block px-4 py-2.5 rounded-2xl border border-border bg-transparent">
          <p className="text-sm italic text-muted-foreground">
            🚫 Wiadomość została usunięta
          </p>
          <span className="text-[10px] text-muted-foreground/60 mt-1 block">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

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
    <div
      className={cn(
        'flex w-full mb-4 group',
        message.isOwn ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar — only for other's messages */}
      {!message.isOwn && (
        <div className="mr-2.5 shrink-0">
          <RoleBadgedAvatar
            role={message.senderRole}
            isLeader={message.isLeader}
            avatarUrl={message.senderAvatar}
            initials={message.senderInitials}
            size="md"
          />
        </div>
      )}

      <div className={cn('max-w-[75%] min-w-0 overflow-hidden', message.isOwn ? 'items-end' : 'items-start', 'flex flex-col')}>
        {/* Sender name + time */}
        <div className={cn('flex items-center gap-2 mb-1', message.isOwn ? 'flex-row-reverse' : 'flex-row')}>
          {!message.isOwn && (
            <span className="font-medium text-xs text-foreground">
              {message.senderName}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
        </div>

        {/* Message bubble */}
        <div className="relative">
          <div
            className={cn(
              'inline-block px-4 py-2.5 rounded-2xl',
              message.isOwn
                ? 'bg-amber-500 text-white rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            )}
          >
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {message.content}
              </p>
            )}
            {renderAttachment()}
          </div>

          {/* Delete action on hover — own messages only */}
          {message.isOwn && showActions && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="absolute -left-8 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
              title="Usuń wiadomość"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
