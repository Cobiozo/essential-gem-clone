import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users, Search, MessageSquare, Plus, Archive, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PrivateChatThread } from '@/types/privateChat';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationListProps {
  threads: PrivateChatThread[];
  selectedThread: PrivateChatThread | null;
  loading: boolean;
  onSelectThread: (thread: PrivateChatThread) => void;
  onNewMessage: () => void;
  getOtherParticipant: (thread: PrivateChatThread) => any;
  getThreadDisplayName: (thread: PrivateChatThread) => string;
}

export const ConversationList = ({
  threads,
  selectedThread,
  loading,
  onSelectThread,
  onNewMessage,
  getOtherParticipant,
  getThreadDisplayName,
}: ConversationListProps) => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredThreads = threads.filter(t => {
    // Filter by status
    if (t.status !== statusFilter) return false;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const displayName = getThreadDisplayName(t).toLowerCase();
      const subject = (t.subject || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      if (!displayName.includes(query) && !subject.includes(query)) return false;
    }
    
    return true;
  });

  const activeCount = threads.filter(t => t.status === 'active').length;
  const closedCount = threads.filter(t => t.status === 'closed').length;
  const archivedCount = threads.filter(t => t.status === 'archived').length;

  const formatTime = (date: string | null) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="h-10 bg-muted animate-pulse rounded-md" />
          <div className="h-9 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <Button onClick={onNewMessage} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Nowa wiadomość
        </Button>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj rozmów..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="text-xs">
              Aktywne
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                  {activeCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              {closedCount}
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-xs">
              <Archive className="h-3 w-3 mr-1" />
              {archivedCount}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Brak rozmów</p>
            </div>
          ) : (
            filteredThreads.map(thread => {
              const isSelected = selectedThread?.id === thread.id;
              const displayName = getThreadDisplayName(thread);
              const hasUnread = (thread.unread_count || 0) > 0;

              return (
                <button
                  key={thread.id}
                  onClick={() => onSelectThread(thread)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    thread.is_group ? 'bg-accent' : 'bg-primary/10'
                  }`}>
                    {thread.is_group ? (
                      <Users className="h-5 w-5 text-accent-foreground" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                    {hasUnread && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                        {thread.unread_count}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium truncate ${hasUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {displayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatTime(thread.last_message_at || thread.created_at)}
                      </span>
                    </div>
                    {thread.subject && (
                      <p className="text-sm text-muted-foreground truncate">
                        {thread.subject}
                      </p>
                    )}
                    {thread.is_group && thread.participants && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {thread.participants.length} uczestników
                      </p>
                    )}
                  </div>

                  {/* Unread badge */}
                  {hasUnread && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">
                      {thread.unread_count}
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
