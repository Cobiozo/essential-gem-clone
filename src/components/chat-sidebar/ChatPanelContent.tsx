import { useState, useEffect, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatSidebar } from '@/contexts/ChatSidebarContext';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';
import { useAdminConversations } from '@/hooks/useAdminConversations';
import { useConversationSettings } from '@/hooks/useConversationSettings';
import { useRecipientChatAccess } from '@/hooks/useRecipientChatAccess';
import { MessagesSidebar } from '@/components/messages/MessagesSidebar';
import { FullChatWindow } from '@/components/messages/FullChatWindow';

export const ChatPanelContent = () => {
  const { pendingUserId, clearPendingUser, isOpen } = useChatSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'chat'>('list');

  const {
    channels, selectedChannel, messages, loading,
    selectChannel, sendMessage, teamMembers, upline,
    selectedDirectUserId, selectedDirectMember,
    selectDirectMember, sendDirectMessage, deleteMessage,
    unreadCounts,
  } = useUnifiedChat({ enableRealtime: true });

  const {
    conversations: adminConversations, isAdmin,
    openConversation, closeConversation, getConversationStatus,
  } = useAdminConversations();

  const {
    deleteConversation, archiveConversation, blockUser, unblockUser,
    isDeleted, isArchived, isBlocked,
  } = useConversationSettings();

  const [currentConvStatus, setCurrentConvStatus] = useState<string | null>(null);
  const { hasAccess: recipientHasAccess } = useRecipientChatAccess(selectedDirectUserId);

  useEffect(() => {
    if (pendingUserId && isOpen) {
      selectDirectMember(pendingUserId);
      setView('chat');
      clearPendingUser();
    }
  }, [pendingUserId, isOpen, selectDirectMember, clearPendingUser]);

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
    content: string, messageType: string = 'text',
    attachmentUrl?: string, attachmentName?: string
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
        userId: conv.userId, firstName: conv.firstName, lastName: conv.lastName,
        role: conv.role, eqId: null, avatarUrl: conv.avatarUrl, isUpline: false, level: 0,
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
    <div className="flex-1 flex flex-col overflow-hidden">
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
          className="w-full h-full overflow-hidden"
          unreadCounts={unreadCounts}
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
           recipientChatDisabled={selectedDirectUserId ? !recipientHasAccess : false}
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
  );
};
