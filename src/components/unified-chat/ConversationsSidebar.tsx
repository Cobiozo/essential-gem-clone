import { Search, Users, User, UserCheck, Shield, Inbox, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { UnifiedChannel } from '@/hooks/useUnifiedChat';

interface ConversationsSidebarProps {
  channels: UnifiedChannel[];
  selectedChannel: UnifiedChannel | null;
  onSelectChannel: (channelId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  User,
  UserCheck,
  Shield,
  Inbox,
  Send,
};

export const ConversationsSidebar = ({
  channels,
  selectedChannel,
  onSelectChannel,
  searchQuery,
  onSearchChange,
}: ConversationsSidebarProps) => {
  // Separate outgoing (can send) and incoming (can receive) channels
  const outgoingChannels = channels.filter(c => c.canSend);
  const incomingChannels = channels.filter(c => c.canReceive);

  const filteredOutgoing = outgoingChannels.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIncoming = incomingChannels.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 border-r border-border flex flex-col bg-muted/30">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj kanałów..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Outgoing channels section */}
          {filteredOutgoing.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Send className="h-3 w-3" />
                Wyślij do
              </div>
              {filteredOutgoing.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isSelected={selectedChannel?.id === channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                />
              ))}
            </>
          )}

          {/* Separator between sections */}
          {filteredOutgoing.length > 0 && filteredIncoming.length > 0 && (
            <Separator className="my-3" />
          )}

          {/* Incoming channels section */}
          {filteredIncoming.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Inbox className="h-3 w-3" />
                Odebrane od
              </div>
              {filteredIncoming.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isSelected={selectedChannel?.id === channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                />
              ))}
            </>
          )}

          {/* Empty state */}
          {filteredOutgoing.length === 0 && filteredIncoming.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Brak dostępnych kanałów
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

interface ChannelItemProps {
  channel: UnifiedChannel;
  isSelected: boolean;
  onClick: () => void;
}

const ChannelItem = ({ channel, isSelected, onClick }: ChannelItemProps) => {
  const IconComponent = IconMap[channel.icon] || Users;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent text-foreground'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isSelected ? 'bg-primary-foreground/20' : 'bg-primary/10'
        )}
      >
        <IconComponent
          className={cn(
            'h-4 w-4',
            isSelected ? 'text-primary-foreground' : 'text-primary'
          )}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">{channel.name}</span>
          {channel.unreadCount > 0 && (
            <Badge
              variant={isSelected ? 'secondary' : 'destructive'}
              className="h-5 min-w-5 px-1.5 text-xs"
            >
              {channel.unreadCount}
            </Badge>
          )}
        </div>
        {channel.lastMessage && (
          <p
            className={cn(
              'text-xs truncate mt-0.5',
              isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {channel.lastMessage}
          </p>
        )}
      </div>
    </button>
  );
};
