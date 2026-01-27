import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UnifiedChannel } from '@/hooks/useUnifiedChat';

interface ConversationsSidebarProps {
  channels: UnifiedChannel[];
  selectedChannel: UnifiedChannel | null;
  onSelectChannel: (channelId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

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

  const allFiltered = [...filteredOutgoing, ...filteredIncoming];

  return (
    <div className="w-64 border-r border-border flex flex-col bg-background/80">
      {/* Header */}
      <div className="p-4 pb-2">
        <h2 className="text-lg font-semibold text-foreground">Konwersacje</h2>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-0"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {allFiltered.map(channel => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isSelected={selectedChannel?.id === channel.id}
              onClick={() => onSelectChannel(channel.id)}
            />
          ))}

          {/* Empty state */}
          {allFiltered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm px-4">
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
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-2.5 transition-colors text-sm flex items-center justify-between',
        isSelected
          ? 'bg-primary/10 text-primary border-l-2 border-primary'
          : 'hover:bg-muted/50 text-foreground border-l-2 border-transparent'
      )}
    >
      <span className={cn(isSelected && 'font-medium')}>{channel.name}</span>
      {channel.unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="h-5 min-w-5 px-1.5 text-xs"
        >
          {channel.unreadCount}
        </Badge>
      )}
    </button>
  );
};
