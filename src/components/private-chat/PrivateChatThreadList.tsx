import { PrivateChatThread } from '@/types/privateChat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, User, Users, Clock, X, RefreshCw, Archive, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

interface PrivateChatThreadListProps {
  threads: PrivateChatThread[];
  selectedThread: PrivateChatThread | null;
  loading: boolean;
  onSelectThread: (thread: PrivateChatThread) => void;
  onUpdateStatus: (threadId: string, status: 'active' | 'closed' | 'archived') => void;
  onDeleteThread: (threadId: string) => void;
  getOtherParticipant: (thread: PrivateChatThread) => PrivateChatThread['participant'];
  getThreadDisplayName?: (thread: PrivateChatThread) => string;
}

const ThreadStatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { label: string; className: string }> = {
    active: { label: 'Aktywny', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    closed: { label: 'Zamknięty', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    archived: { label: 'Archiwum', className: 'bg-muted text-muted-foreground border-muted' },
  };

  const variant = variants[status] || variants.active;

  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  );
};

export const PrivateChatThreadList = ({
  threads,
  selectedThread,
  loading,
  onSelectThread,
  onUpdateStatus,
  onDeleteThread,
  getOtherParticipant,
  getThreadDisplayName,
}: PrivateChatThreadListProps) => {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Brak wątków czatu</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Wątki pojawią się tutaj po rozpoczęciu rozmowy
        </p>
      </div>
    );
  }

  const getDisplayName = (thread: PrivateChatThread): string => {
    if (getThreadDisplayName) {
      return getThreadDisplayName(thread);
    }
    
    // Fallback for group threads
    if (thread.is_group) {
      if (thread.participants && thread.participants.length > 0) {
        const names = thread.participants
          .slice(0, 3)
          .map(p => p.profile?.first_name || p.profile?.email || 'Uczestnik')
          .join(', ');
        if (thread.participants.length > 3) {
          return `${names} +${thread.participants.length - 3}`;
        }
        return names;
      }
      return thread.subject || 'Czat grupowy';
    }
    
    // Fallback for 1:1 threads
    const otherParticipant = getOtherParticipant(thread);
    return otherParticipant
      ? `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || otherParticipant.email
      : 'Nieznany uczestnik';
  };

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 p-2">
        {threads.map((thread) => {
          const displayName = getDisplayName(thread);
          const isSelected = selectedThread?.id === thread.id;
          const isInitiator = thread.initiator_id === user?.id;
          const isGroup = thread.is_group;
          const participantCount = thread.participants?.length || 0;

          return (
            <div
              key={thread.id}
              className={`
                relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                transition-colors hover:bg-accent/50
                ${isSelected ? 'bg-accent border-primary' : 'bg-card'}
              `}
              onClick={() => onSelectThread(thread)}
            >
              <div className="relative">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  isGroup ? 'bg-secondary/20' : 'bg-primary/10'
                }`}>
                  {isGroup ? (
                    <Users className="h-5 w-5 text-secondary-foreground" />
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                </div>
                {thread.unread_count && thread.unread_count > 0 ? (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {thread.unread_count > 9 ? '9+' : thread.unread_count}
                  </span>
                ) : null}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{displayName}</p>
                  <ThreadStatusBadge status={thread.status} />
                  {isGroup && (
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {participantCount}
                    </Badge>
                  )}
                </div>
                {thread.subject && (
                  <p className="text-sm text-muted-foreground truncate">{thread.subject}</p>
                )}
                {thread.last_message_at && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(thread.last_message_at), { 
                      addSuffix: true, 
                      locale: pl 
                    })}
                  </p>
                )}
              </div>

              {isInitiator && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {thread.status === 'active' && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(thread.id, 'closed');
                      }}>
                        <X className="h-4 w-4 mr-2" />
                        Zamknij wątek
                      </DropdownMenuItem>
                    )}
                    {thread.status === 'closed' && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(thread.id, 'active');
                      }}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Wznów wątek
                      </DropdownMenuItem>
                    )}
                    {thread.status !== 'archived' && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(thread.id, 'archived');
                      }}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archiwizuj
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteThread(thread.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Usuń wątek
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
