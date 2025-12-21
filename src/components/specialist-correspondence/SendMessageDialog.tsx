import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Send, User } from 'lucide-react';

interface Specialist {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  specialization: string | null;
  email?: string;
}

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialist: Specialist | null;
  onMessageSent?: () => void;
}

export const SendMessageDialog = ({ 
  open, 
  onOpenChange, 
  specialist, 
  onMessageSent 
}: SendMessageDialogProps) => {
  const { session } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!specialist || !subject.trim() || !message.trim()) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    if (!session?.access_token) {
      toast.error('Musisz być zalogowany');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-specialist-message', {
        body: {
          specialist_id: specialist.user_id,
          subject: subject.trim(),
          message: message.trim(),
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Wiadomość została wysłana');
      setSubject('');
      setMessage('');
      onOpenChange(false);
      onMessageSent?.();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Nie udało się wysłać wiadomości');
    } finally {
      setSending(false);
    }
  };

  const specialistName = specialist 
    ? `${specialist.first_name || ''} ${specialist.last_name || ''}`.trim() || 'Specjalista'
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Wyślij wiadomość do specjalisty
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

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Temat</Label>
            <Input
              id="subject"
              placeholder="Temat wiadomości..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Treść wiadomości</Label>
            <Textarea
              id="message"
              placeholder="Napisz swoją wiadomość..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              disabled={sending}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Wiadomość zostanie wysłana jako e-mail do specjalisty. 
            Kopia będzie zapisana w historii korespondencji.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Anuluj
          </Button>
          <Button onClick={handleSend} disabled={sending || !subject.trim() || !message.trim()}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wysyłanie...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Wyślij
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
