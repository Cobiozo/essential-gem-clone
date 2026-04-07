import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Download, Trash2, Share2, Save } from 'lucide-react';
import { RoleBadgedAvatar } from '@/components/chat/RoleBadgedAvatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { shareOrDownloadImage, isMobileDevice, canUseWebShare } from '@/lib/imageShareUtils';
import { toast } from 'sonner';
import type { UnifiedMessage } from '@/hooks/useUnifiedChat';

interface MessageBubbleProps {
  message: UnifiedMessage;
  onDelete?: (messageId: string) => void;
}

export const MessageBubble = ({ message, onDelete }: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleForward = async () => {
    if (!previewImage) return;
    if (isMobileDevice() && canUseWebShare()) {
      try {
        const response = await fetch(previewImage, { mode: 'cors' });
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Przekaż obrazek' });
          return;
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(previewImage);
      toast.success('Link skopiowany do schowka');
    } catch {
      toast.error('Nie udało się skopiować linku');
    }
  };

  const handleSave = async () => {
    if (!previewImage) return;
    const success = await shareOrDownloadImage(previewImage, 'image.jpg');
    if (success) toast.success('Zapisano');
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
            className="max-w-[120px] max-h-[120px] object-cover rounded-lg mt-2 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setPreviewImage(message.attachmentUrl!)}
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
    <>
      <div
        className={cn(
          'flex w-full mb-4 group',
          message.isOwn ? 'justify-end' : 'justify-start'
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
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

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-base">Podgląd obrazka</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex flex-col gap-3">
              <img
                src={previewImage}
                alt="Podgląd"
                className="w-full max-h-[60vh] object-contain rounded-lg"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleForward}>
                  <Share2 className="h-4 w-4" />
                  Przekaż
                </Button>
                <Button variant="default" className="flex-1 gap-2" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                  Zapisz
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
