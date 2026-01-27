import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { UnifiedChannel, TeamMemberChannel } from '@/hooks/useUnifiedChat';
import { ChannelListItem } from './ChannelListItem';
import { TeamMembersSection } from './TeamMembersSection';

interface MessagesSidebarProps {
  channels: UnifiedChannel[];
  selectedChannel: UnifiedChannel | null;
  onSelectChannel: (channelId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  className?: string;
  // Team members props
  teamMembers?: TeamMemberChannel[];
  upline?: TeamMemberChannel | null;
  selectedDirectUserId?: string | null;
  onSelectDirectMember?: (userId: string) => void;
}

export const MessagesSidebar = ({
  channels,
  selectedChannel,
  onSelectChannel,
  searchQuery,
  onSearchChange,
  className,
  teamMembers = [],
  upline = null,
  selectedDirectUserId = null,
  onSelectDirectMember,
}: MessagesSidebarProps) => {
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
    <div className={cn('flex flex-col bg-background', className)}>
      {/* Header */}
      <div className="p-4 pb-2 shrink-0">
        <h2 className="text-xl font-semibold text-foreground">Konwersacje</h2>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj rozmów..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-0"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Outgoing channels (can send) */}
          {filteredOutgoing.length > 0 && (
            <div className="mb-4">
              <div className="px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Kanały
                </span>
              </div>
              {filteredOutgoing.map(channel => (
                <ChannelListItem
                  key={channel.id}
                  channel={channel}
                  isSelected={selectedChannel?.id === channel.id && !selectedDirectUserId}
                  onClick={() => onSelectChannel(channel.id)}
                />
              ))}
            </div>
          )}

          {/* Team Members Section */}
          {(upline || teamMembers.length > 0) && onSelectDirectMember && (
            <TeamMembersSection
              upline={upline}
              members={teamMembers}
              selectedUserId={selectedDirectUserId}
              onSelectMember={onSelectDirectMember}
              searchQuery={searchQuery}
            />
          )}

          {/* Incoming channels (can receive) */}
          {filteredIncoming.length > 0 && (
            <div>
              <div className="px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Odebrane
                </span>
              </div>
              {filteredIncoming.map(channel => (
                <ChannelListItem
                  key={channel.id}
                  channel={channel}
                  isSelected={selectedChannel?.id === channel.id && !selectedDirectUserId}
                  onClick={() => onSelectChannel(channel.id)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {filteredOutgoing.length === 0 && filteredIncoming.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm px-4">
              Brak dostępnych kanałów
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
