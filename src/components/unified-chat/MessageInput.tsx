import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (content: string) => Promise<boolean>;
  disabled?: boolean;
}

export const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const success = await onSend(trimmed);
      if (success) {
        setMessage('');
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  return (
    <div className="p-3 border-t border-border bg-background">
      <div className="flex items-end gap-2">
        {/* Attachment button (placeholder) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Emoji button (placeholder) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled
        >
          <Smile className="h-4 w-4" />
        </Button>

        {/* Text input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Wpisz wiadomość..."
          disabled={disabled || sending}
          className={cn(
            'min-h-[36px] max-h-[120px] resize-none py-2',
            'flex-1'
          )}
          rows={1}
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending || disabled}
          size="icon"
          className="h-9 w-9 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Hint text */}
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Enter aby wysłać • Shift+Enter nowa linia
      </p>
    </div>
  );
};
