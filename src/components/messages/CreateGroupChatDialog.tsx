import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';

interface CreateGroupChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantNames: string[];
  onCreateGroup: (subject: string, initialMessage: string) => Promise<boolean>;
}

export const CreateGroupChatDialog = ({
  open,
  onOpenChange,
  participantNames,
  onCreateGroup,
}: CreateGroupChatDialogProps) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) return;

    setIsCreating(true);
    try {
      const success = await onCreateGroup(subject.trim(), message.trim());
      if (success) {
        setSubject('');
        setMessage('');
        onOpenChange(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Nowy czat grupowy
          </DialogTitle>
          <DialogDescription>
            Utwórz grupę z wybranymi członkami zespołu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Temat rozmowy</Label>
            <Input
              id="subject"
              placeholder="np. Spotkanie zespołu, Projekt X..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Pierwsza wiadomość</Label>
            <Textarea
              id="message"
              placeholder="Wpisz wiadomość inaugurującą rozmowę..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Uczestnicy ({participantNames.length})
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {participantNames.map((name, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !subject.trim() || !message.trim()}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Tworzenie...
              </>
            ) : (
              'Utwórz grupę'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
