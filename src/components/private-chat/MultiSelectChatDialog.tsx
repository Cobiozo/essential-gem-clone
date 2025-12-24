import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Send, CheckSquare, Square } from 'lucide-react';
import { usePrivateChat } from '@/hooks/usePrivateChat';

interface Specialist {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  specialization?: string | null;
}

interface MultiSelectChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialists: Specialist[];
  selectedIds: string[];
  onThreadCreated?: (threadId: string) => void;
}

export const MultiSelectChatDialog: React.FC<MultiSelectChatDialogProps> = ({
  open,
  onOpenChange,
  specialists,
  selectedIds,
  onThreadCreated,
}) => {
  const { createGroupThread } = usePrivateChat();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

  // Sync local selection with prop when dialog opens
  React.useEffect(() => {
    if (open) {
      setLocalSelectedIds(selectedIds);
    }
  }, [open, selectedIds]);

  const toggleSpecialist = (userId: string) => {
    setLocalSelectedIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    setLocalSelectedIds(specialists.map(s => s.user_id));
  };

  const deselectAll = () => {
    setLocalSelectedIds([]);
  };

  const handleStartGroupChat = async () => {
    if (localSelectedIds.length < 1 || !subject.trim()) return;

    setSending(true);
    try {
      const thread = await createGroupThread({
        participant_ids: localSelectedIds,
        subject: subject.trim(),
        initial_message: message.trim() || undefined,
      });

      if (thread) {
        setSubject('');
        setMessage('');
        setLocalSelectedIds([]);
        onOpenChange(false);
        onThreadCreated?.(thread.id);
      }
    } finally {
      setSending(false);
    }
  };

  const selectedSpecialists = specialists.filter(s => localSelectedIds.includes(s.user_id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Utwórz czat grupowy
          </DialogTitle>
          <DialogDescription>
            Wybierz specjalistów i rozpocznij rozmowę grupową. Wszyscy uczestnicy będą widzieć wszystkie wiadomości.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Selected count and actions */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-sm">
              Wybrano: {localSelectedIds.length} / {specialists.length}
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="h-4 w-4 mr-1" />
                Zaznacz wszystkich
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                <Square className="h-4 w-4 mr-1" />
                Odznacz wszystkich
              </Button>
            </div>
          </div>

          {/* Specialist list with checkboxes */}
          <ScrollArea className="h-[200px] border rounded-md p-2">
            <div className="space-y-2">
              {specialists.map((specialist) => {
                const isSelected = localSelectedIds.includes(specialist.user_id);
                const name = `${specialist.first_name || ''} ${specialist.last_name || ''}`.trim() || specialist.email;

                return (
                  <div
                    key={specialist.user_id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleSpecialist(specialist.user_id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSpecialist(specialist.user_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {specialist.specialization || specialist.email}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Selected specialists preview */}
          {selectedSpecialists.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedSpecialists.slice(0, 5).map((s) => (
                <Badge key={s.user_id} variant="outline" className="text-xs">
                  {s.first_name || s.email}
                </Badge>
              ))}
              {selectedSpecialists.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedSpecialists.length - 5} więcej
                </Badge>
              )}
            </div>
          )}

          {/* Subject (required for group chats) */}
          <div className="space-y-2">
            <Label htmlFor="group-subject">Temat rozmowy *</Label>
            <Input
              id="group-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Wprowadź temat rozmowy grupowej..."
            />
          </div>

          {/* Initial message */}
          <div className="space-y-2">
            <Label htmlFor="group-message">Pierwsza wiadomość (opcjonalnie)</Label>
            <Textarea
              id="group-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Wpisz wiadomość powitalną..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleStartGroupChat}
            disabled={localSelectedIds.length < 1 || !subject.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Utwórz czat grupowy ({localSelectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
