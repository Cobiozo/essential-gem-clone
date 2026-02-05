import { useState, KeyboardEvent } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmojiPicker } from '@/components/cms/EmojiPicker';
import { MediaUpload } from '@/components/MediaUpload';
import { VoiceRecorder } from './VoiceRecorder';

interface MessageInputProps {
  onSend: (content: string, messageType?: string, attachmentUrl?: string, attachmentName?: string) => Promise<boolean>;
  disabled?: boolean;
}

export const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const success = await onSend(trimmed, 'text');
      if (success) {
        setMessage('');
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

  const handleMediaUploaded = async (url: string, type: 'image' | 'video' | 'document' | 'audio' | 'other') => {
    setAttachmentDialogOpen(false);
    
    const messageType = type === 'other' ? 'file' : type;
    const fileName = url.split('/').pop() || 'attachment';
    
    setSending(true);
    try {
      await onSend('', messageType, url, fileName);
    } finally {
      setSending(false);
    }
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
      <div className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-2">
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
          <DialogContent className="sm:max-w-md">
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

        {/* Input */}
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Wpisz wiadomość..."
          disabled={disabled || sending}
          className="flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 h-9 px-2"
        />

        {/* Send button - turquoise */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending || disabled}
          size="icon"
          className="h-10 w-10 rounded-full bg-cyan-500 hover:bg-cyan-600 shrink-0"
        >
          <Send className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  );
};
