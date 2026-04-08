import { useState, KeyboardEvent } from 'react';
import { Send, Smile, Paperclip, X, FileText, Image as ImageIcon, Film, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmojiPicker } from '@/components/cms/EmojiPicker';
import { MediaUpload } from '@/components/MediaUpload';
import { VoiceRecorder } from './VoiceRecorder';

interface PendingAttachment {
  url: string;
  type: string;
  fileName: string;
}

interface MessageInputProps {
  onSend: (content: string, messageType?: string, attachmentUrl?: string, attachmentName?: string) => Promise<boolean>;
  disabled?: boolean;
}

export const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed && !pendingAttachment) return;
    if (sending) return;

    setSending(true);
    try {
      const success = await onSend(
        trimmed,
        pendingAttachment ? pendingAttachment.type : 'text',
        pendingAttachment?.url,
        pendingAttachment?.fileName
      );
      if (success) {
        setMessage('');
        setPendingAttachment(null);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleMediaUploaded = (url: string, type: 'image' | 'video' | 'document' | 'audio' | 'other') => {
    setAttachmentDialogOpen(false);
    const messageType = type === 'other' ? 'file' : type;
    const fileName = url.split('/').pop() || 'attachment';
    setPendingAttachment({ url, type: messageType, fileName });
  };

  const handleVoiceRecordingComplete = async (url: string, fileName: string) => {
    setIsRecording(false);
    setSending(true);
    try {
      await onSend('', 'audio', url, fileName);
    } finally {
      setSending(false);
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-5 w-5 text-primary" />;
      case 'video': return <Film className="h-5 w-5 text-primary" />;
      case 'audio': return <Music className="h-5 w-5 text-primary" />;
      default: return <FileText className="h-5 w-5 text-primary" />;
    }
  };

  // Show voice recorder UI when recording
  if (isRecording) {
    return (
      <div className="p-4 border-t border-border bg-background/80">
        <VoiceRecorder
          onRecordingComplete={handleVoiceRecordingComplete}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-border bg-background/80">
      {/* Pending attachment preview */}
      {pendingAttachment && (
        <div className="flex items-center gap-3 mb-3 p-2.5 bg-muted/60 rounded-xl border border-border">
          {pendingAttachment.type === 'image' ? (
            <img
              src={pendingAttachment.url}
              alt="Podgląd"
              className="h-14 w-14 rounded-lg object-cover"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
              {getAttachmentIcon(pendingAttachment.type)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {pendingAttachment.fileName}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {pendingAttachment.type === 'file' ? 'Dokument' : pendingAttachment.type === 'image' ? 'Zdjęcie' : pendingAttachment.type === 'video' ? 'Wideo' : pendingAttachment.type === 'audio' ? 'Audio' : pendingAttachment.type}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPendingAttachment(null)}
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col bg-muted/50 rounded-2xl px-4 py-2">
        {/* Textarea - full width */}
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Wpisz wiadomość..."
          disabled={disabled || sending}
          rows={1}
          className="w-full bg-transparent border-0 shadow-none focus:outline-none focus-visible:ring-0 resize-none text-sm py-2 max-h-[120px] min-h-[36px]"
        />

        {/* Bottom row: icons left, send button right */}
        <div className="flex items-center gap-1 mt-1">
          {/* Attachment dialog */}
          <Dialog open={attachmentDialogOpen} onOpenChange={setAttachmentDialogOpen}>
            <DialogTrigger asChild>
              <button 
                type="button"
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md !z-[200]" style={{ zIndex: 200 }}>
              <DialogHeader>
                <DialogTitle>Załącz plik</DialogTitle>
              </DialogHeader>
              <MediaUpload
                onMediaUploaded={handleMediaUploaded}
                allowedTypes={['image', 'video', 'document', 'audio']}
                compact
              />
            </DialogContent>
          </Dialog>

          {/* Emoji picker */}
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            trigger={
              <button 
                type="button"
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Smile className="h-5 w-5" />
              </button>
            }
            popoverClassName="z-[200]"
          />

          {/* Voice recorder trigger */}
          <button 
            type="button"
            onClick={() => setIsRecording(true)}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </button>

          {/* Send button - turquoise, pushed to right */}
          <Button
            onClick={handleSend}
            disabled={(!message.trim() && !pendingAttachment) || sending || disabled}
            size="icon"
            className="h-10 w-10 rounded-full bg-cyan-500 hover:bg-cyan-600 shrink-0 ml-auto"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
};
