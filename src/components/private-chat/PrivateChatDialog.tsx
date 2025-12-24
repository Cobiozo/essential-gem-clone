import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, User } from 'lucide-react';
import { usePrivateChat } from '@/hooks/usePrivateChat';

interface Specialist {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  specialization?: string | null;
}

interface PrivateChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialist: Specialist | null;
  onThreadCreated?: (threadId: string) => void;
}

export const PrivateChatDialog = ({ 
  open, 
  onOpenChange, 
  specialist,
  onThreadCreated 
}: PrivateChatDialogProps) => {
  const { createOrGetThread } = usePrivateChat();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleStartChat = async () => {
    if (!specialist || !message.trim()) return;

    setSending(true);
    try {
      const thread = await createOrGetThread({
        participant_id: specialist.user_id,
        subject: subject.trim() || undefined,
        initial_message: message.trim(),
      });

      if (thread) {
        onThreadCreated?.(thread.id);
        onOpenChange(false);
        setSubject('');
        setMessage('');
      }
    } finally {
      setSending(false);
    }
  };

  const specialistName = specialist 
    ? `${specialist.first_name || ''} ${specialist.last_name || ''}`.trim() || specialist.email || 'Specjalista'
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Rozpocznij czat
          </DialogTitle>
        </DialogHeader>

        {specialist && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{specialistName}</p>
              {specialist.specialization && (
                <p className="text-sm text-muted-foreground">{specialist.specialization}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="subject">Temat (opcjonalnie)</Label>
            <Input
              id="subject"
              placeholder="Temat rozmowy..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Wiadomość *</Label>
            <Textarea
              id="message"
              placeholder="Napisz wiadomość..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              disabled={sending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleStartChat}
            disabled={sending || !message.trim()}
          >
            {sending ? (
              'Wysyłanie...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Rozpocznij czat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
