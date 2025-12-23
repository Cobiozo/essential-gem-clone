import { useState } from 'react';
import { MessageSquare, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useRoleChat } from '@/hooks/useRoleChat';
import { ROLE_LABELS } from '@/types/roleChat';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export const RoleChatBell = () => {
  const { messages, unreadCount, userRole, markAsRead } = useRoleChat();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Get recent unread messages for this user
  const unreadMessages = messages
    .filter(m => !m.is_read && m.sender_role !== userRole)
    .slice(-10)
    .reverse();

  const handleMessageClick = async (messageId: string) => {
    await markAsRead(messageId);
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/my-account?tab=chat');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h3 className="font-semibold">Czat wewnętrzny</h3>
        </div>

        <ScrollArea className="max-h-[300px]">
          {unreadMessages.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Brak nowych wiadomości
            </div>
          ) : (
            <div className="divide-y">
              {unreadMessages.map(message => (
                <div
                  key={message.id}
                  className="p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleMessageClick(message.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Od: {ROLE_LABELS[message.sender_role]}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {message.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(message.created_at), 'dd MMM, HH:mm', { locale: pl })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={handleViewAll}
          >
            Zobacz wszystkie wiadomości
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
