import { useState } from 'react';
import { Search, Archive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UnifiedChannel, TeamMemberChannel } from '@/hooks/useUnifiedChat';
import type { AdminConversationUser } from '@/hooks/useAdminConversations';
import { ChannelListItem } from './ChannelListItem';
import { TeamMembersSection } from './TeamMembersSection';
import { AdminUserSearch } from './AdminUserSearch';
import { ConversationActions } from './ConversationActions';

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
  // Group chat selection props
  selectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  selectedMembers?: Set<string>;
  onToggleSelection?: (userId: string) => void;
  onCreateGroupChat?: () => void;
  // Admin conversation props
  isAdmin?: boolean;
  adminConversations?: AdminConversationUser[];
  onAdminSelectUser?: (userId: string) => void;
  // Conversation settings props
  onDeleteConversation?: (userId: string) => void;
  onArchiveConversation?: (userId: string) => void;
  onBlockUser?: (userId: string) => void;
  onUnblockUser?: (userId: string) => void;
  isConversationArchived?: (userId: string) => boolean;
  isConversationBlocked?: (userId: string) => boolean;
  archivedConversations?: AdminConversationUser[];
  archivedTeamMembers?: TeamMemberChannel[];
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
  selectionMode = false,
  onToggleSelectionMode,
  selectedMembers = new Set(),
  onToggleSelection,
  onCreateGroupChat,
  isAdmin = false,
  adminConversations = [],
  onAdminSelectUser,
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

  // Can create groups if user has downline members
  const canCreateGroups = teamMembers.length > 1;

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

      {/* Admin user search */}
      {isAdmin && onAdminSelectUser && (
        <AdminUserSearch onSelectUser={onAdminSelectUser} />
      )}

      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Admin conversations section */}
          {isAdmin && adminConversations.length > 0 && onAdminSelectUser && (
            <div className="mb-4">
              <div className="px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Konwersacje z użytkownikami
                </span>
              </div>
              {adminConversations
                .filter(c => c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             c.lastName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(conv => (
                  <button
                    key={conv.userId}
                    onClick={() => onAdminSelectUser(conv.userId)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left',
                      selectedDirectUserId === conv.userId && 'bg-accent'
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={conv.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {conv.firstName?.charAt(0)}{conv.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conv.firstName} {conv.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conv.conversationStatus === 'closed' ? '🔒 Zamknięta' : '💬 Otwarta'}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Non-admin: show admin conversations user received */}
          {!isAdmin && adminConversations.length > 0 && onAdminSelectUser && (
            <div className="mb-4">
              <div className="px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Od Administratora
                </span>
              </div>
              {adminConversations
                .filter(c => c.conversationStatus === 'open' || true) // show all, status shown in UI
                .map(conv => (
                  <button
                    key={conv.userId}
                    onClick={() => onAdminSelectUser(conv.userId)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left',
                      selectedDirectUserId === conv.userId && 'bg-accent'
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={conv.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {conv.firstName?.charAt(0)}{conv.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conv.firstName} {conv.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conv.conversationStatus === 'closed' ? '🔒 Konwersacja zamknięta' : 'Administrator'}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          )}

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
              // Group chat props
              selectionMode={selectionMode}
              onToggleSelectionMode={onToggleSelectionMode}
              selectedMembers={selectedMembers}
              onToggleSelection={onToggleSelection}
              onCreateGroupChat={onCreateGroupChat}
              canCreateGroups={canCreateGroups}
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
