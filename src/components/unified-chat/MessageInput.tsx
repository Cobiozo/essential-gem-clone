import { useState, KeyboardEvent } from 'react';
import { Send, Smile, Paperclip, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MessageInputProps {
  onSend: (content: string) => Promise<boolean>;
  disabled?: boolean;
}

export const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const success = await onSend(trimmed);
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

  return (
    <div className="p-4 border-t border-border bg-background/80">
      <div className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-2">
        {/* Utility icons */}
        <Paperclip className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
        <Smile className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
        <Mic className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />

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
