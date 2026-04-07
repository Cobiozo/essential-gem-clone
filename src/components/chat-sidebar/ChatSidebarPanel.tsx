import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatSidebar } from '@/contexts/ChatSidebarContext';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';
import { useAdminConversations } from '@/hooks/useAdminConversations';
import { useConversationSettings } from '@/hooks/useConversationSettings';
import { MessagesSidebar } from '@/components/messages/MessagesSidebar';
import { FullChatWindow } from '@/components/messages/FullChatWindow';

export const ChatSidebarPanel = () => {
  const { isOpen, close, pendingUserId, clearPendingUser } = useChatSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'chat'>('list');

  const {
    channels,
    selectedChannel,
    messages,
    loading,
    selectChannel,
    sendMessage,
    teamMembers,
    upline,
    selectedDirectUserId,
    selectedDirectMember,
    selectDirectMember,
    sendDirectMessage,
    deleteMessage,
  } = useUnifiedChat({ enableRealtime: true });

  const {
    conversations: adminConversations,
    isAdmin,
    openConversation,
    closeConversation,
    getConversationStatus,
  } = useAdminConversations();

  const {
    deleteConversation,
    archiveConversation,
    blockUser,
    unblockUser,
    isDeleted,
    isArchived,
    isBlocked,
  } = useConversationSettings();

  const [currentConvStatus, setCurrentConvStatus] = useState<string | null>(null);

  // Handle pending user from context
  useEffect(() => {
    if (pendingUserId && isOpen) {
      selectDirectMember(pendingUserId);
      setView('chat');
      clearPendingUser();
    }
  }, [pendingUserId, isOpen, selectDirectMember, clearPendingUser]);

  // Fetch conversation status
  useEffect(() => {
    if (selectedDirectUserId) {
      getConversationStatus(selectedDirectUserId).then(setCurrentConvStatus);
    } else {
      setCurrentConvStatus(null);
    }
  }, [selectedDirectUserId, getConversationStatus]);

  const handleSelectChannel = (channelId: string) => {
    selectChannel(channelId);
    setView('chat');
  };

  const handleSelectDirectMember = (userId: string) => {
    selectDirectMember(userId);
    setView('chat');
  };

  const handleAdminSelectUser = async (userId: string) => {
    if (isAdmin) await openConversation(userId);
    selectDirectMember(userId);
    setView('chat');
    const status = await getConversationStatus(userId);
    setCurrentConvStatus(status);
  };

  const handleCloseConversation = async () => {
    if (!selectedDirectUserId || !isAdmin) return;
    const success = await closeConversation(selectedDirectUserId);
    if (success) setCurrentConvStatus('closed');
  };

  const handleSendMessage = async (
    content: string,
    messageType: string = 'text',
    attachmentUrl?: string,
    attachmentName?: string
  ): Promise<boolean> => {
    if (selectedDirectUserId) {
      if (isAdmin) {
        await openConversation(selectedDirectUserId);
        const status = await getConversationStatus(selectedDirectUserId);
        setCurrentConvStatus(status);
      }
      return sendDirectMessage(selectedDirectUserId, content, messageType, attachmentUrl, attachmentName);
    }
    return sendMessage(content);
  };

  const effectiveDirectMember = useMemo(() => {
    if (!selectedDirectUserId) return null;
    if (selectedDirectMember) return selectedDirectMember;
    const conv = adminConversations.find(c => c.userId === selectedDirectUserId);
    if (conv) {
      return {
        userId: conv.userId,
        firstName: conv.firstName,
        lastName: conv.lastName,
        role: conv.role,
        eqId: null,
        avatarUrl: conv.avatarUrl,
        isUpline: false,
        level: 0,
      };
    }
    return null;
  }, [selectedDirectUserId, selectedDirectMember, adminConversations]);

  const filteredAdminConversations = useMemo(() => {
    return adminConversations.filter(c => !isDeleted(c.userId) && !isArchived(c.userId) && !isBlocked(c.userId));
  }, [adminConversations, isDeleted, isArchived, isBlocked]);

  const filteredTeamMembers = useMemo(() => {
    return teamMembers.filter(m => !isDeleted(m.userId) && !isArchived(m.userId) && !isBlocked(m.userId));
  }, [teamMembers, isDeleted, isArchived, isBlocked]);

  const hasActiveChat = !!(selectedChannel || effectiveDirectMember);

  return (
    <div
      className={cn(
        'h-full border-l border-border bg-background flex flex-col transition-all duration-300 ease-in-out overflow-hidden shrink-0',
        isOpen ? 'w-[380px] max-md:fixed max-md:inset-0 max-md:w-full max-md:z-50' : 'w-0 border-l-0'
      )}
    >
      {isOpen && (
        <>
          {/* Panel header */}
          <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0 bg-background">
            <div className="flex items-center gap-2">
              {view === 'chat' && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('list')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Czat</h2>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={close}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {view === 'list' ? (
              <MessagesSidebar
                channels={channels}
                selectedChannel={selectedChannel}
                onSelectChannel={handleSelectChannel}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                teamMembers={filteredTeamMembers}
                upline={upline}
                selectedDirectUserId={selectedDirectUserId}
                onSelectDirectMember={handleSelectDirectMember}
                isAdmin={isAdmin}
                adminConversations={filteredAdminConversations}
                onAdminSelectUser={handleAdminSelectUser}
                onDeleteConversation={deleteConversation}
                onArchiveConversation={archiveConversation}
                onBlockUser={blockUser}
                onUnblockUser={unblockUser}
                isConversationArchived={isArchived}
                isConversationBlocked={isBlocked}
                className="w-full"
              />
            ) : hasActiveChat ? (
              <FullChatWindow
                channel={selectedChannel}
                directMember={effectiveDirectMember}
                messages={messages}
                loading={loading}
                onSend={handleSendMessage}
                onBack={() => setView('list')}
                isAdmin={isAdmin}
                adminConversationStatus={currentConvStatus}
                onCloseConversation={handleCloseConversation}
                onDeleteConversation={deleteConversation}
                onArchiveConversation={archiveConversation}
                onBlockUser={blockUser}
                onUnblockUser={unblockUser}
                isConversationArchived={selectedDirectUserId ? isArchived(selectedDirectUserId) : false}
                isConversationBlocked={selectedDirectUserId ? isBlocked(selectedDirectUserId) : false}
                onDeleteMessage={deleteMessage}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center p-4">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Wybierz rozmowę</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
