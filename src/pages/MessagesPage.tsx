import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';
import { useAdminConversations } from '@/hooks/useAdminConversations';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { MessagesSidebar } from '@/components/messages/MessagesSidebar';
import { FullChatWindow } from '@/components/messages/FullChatWindow';
import { CreateGroupChatDialog } from '@/components/messages/CreateGroupChatDialog';
import { NotificationPermissionBanner } from '@/components/messages/NotificationPermissionBanner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const MessagesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Group chat selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showGroupDialog, setShowGroupDialog] = useState(false);

  // Admin conversation status for current chat
  const [currentConvStatus, setCurrentConvStatus] = useState<string | null>(null);

  // Browser notifications
  const { permission, showNotification } = useBrowserNotifications();

  // Admin conversations
  const {
    conversations: adminConversations,
    isAdmin,
    openConversation,
    closeConversation,
    getConversationStatus,
    refetch: refetchAdminConv,
  } = useAdminConversations();

  const {
    channels,
    selectedChannel,
    messages,
    loading,
    selectChannel,
    sendMessage,
    // Team members
    teamMembers,
    upline,
    selectedDirectUserId,
    selectedDirectMember,
    selectDirectMember,
    sendDirectMessage,
    createGroupChat,
  } = useUnifiedChat({ enableRealtime: true });

  // Handle ?user= URL parameter for notification deep-linking
  useEffect(() => {
    const userId = searchParams.get('user');
    if (!userId || !user) return;
    
    const adminConv = adminConversations.find(c => c.userId === userId);
    if (adminConv) {
      handleAdminSelectUser(userId);
    } else if (teamMembers.length > 0) {
      handleSelectDirectMember(userId);
    } else {
      selectDirectMember(userId);
      setMobileView('chat');
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, user, teamMembers, adminConversations]);

  // Fetch conversation status when direct user changes
  useEffect(() => {
    if (selectedDirectUserId) {
      getConversationStatus(selectedDirectUserId).then(setCurrentConvStatus);
    } else {
      setCurrentConvStatus(null);
    }
  }, [selectedDirectUserId, getConversationStatus]);

  const handleSelectChannel = (channelId: string) => {
    selectChannel(channelId);
    setMobileView('chat');
  };

  const handleSelectDirectMember = (userId: string) => {
    selectDirectMember(userId);
    setMobileView('chat');
  };

  // Admin: select user from search or conversation list
  const handleAdminSelectUser = async (userId: string) => {
    if (isAdmin) {
      await openConversation(userId);
    }
    // For admin, we need to fetch the profile to create a TeamMemberChannel-like object
    // selectDirectMember handles fetching messages
    selectDirectMember(userId);
    setMobileView('chat');
    // Refresh conversation status
    const status = await getConversationStatus(userId);
    setCurrentConvStatus(status);
  };

  const handleCloseConversation = async () => {
    if (!selectedDirectUserId || !isAdmin) return;
    const success = await closeConversation(selectedDirectUserId);
    if (success) {
      setCurrentConvStatus('closed');
    }
  };

  const handleSendMessage = async (
    content: string,
    messageType: string = 'text',
    attachmentUrl?: string,
    attachmentName?: string
  ): Promise<boolean> => {
    if (selectedDirectUserId) {
      // For admin: ensure conversation is open before sending
      if (isAdmin) {
        await openConversation(selectedDirectUserId);
        // Refresh status after opening
        const status = await getConversationStatus(selectedDirectUserId);
        setCurrentConvStatus(status);
      }
      return sendDirectMessage(selectedDirectUserId, content, messageType, attachmentUrl, attachmentName);
    }
    return sendMessage(content);
  };

  // Toggle member selection for group chat
  const handleToggleSelection = (userId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Toggle selection mode
  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedMembers(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  // Create group chat handler
  const handleCreateGroupChat = async (subject: string, initialMessage: string): Promise<boolean> => {
    if (!createGroupChat) {
      toast.error('Funkcja niedostępna');
      return false;
    }

    const participantIds = Array.from(selectedMembers);
    const success = await createGroupChat(participantIds, subject, initialMessage);

    if (success) {
      setSelectedMembers(new Set());
      setSelectionMode(false);
      toast.success('Czat grupowy został utworzony');
    } else {
      toast.error('Nie udało się utworzyć czatu grupowego');
    }

    return success;
  };

  // Get participant names for dialog
  const selectedMemberNames = useMemo(() => {
    return teamMembers
      .filter(m => selectedMembers.has(m.userId))
      .map(m => `${m.firstName} ${m.lastName}`.trim());
  }, [teamMembers, selectedMembers]);

  // Build selected direct member - for admin, might not be in teamMembers
  const effectiveDirectMember = useMemo(() => {
    if (!selectedDirectUserId) return null;
    if (selectedDirectMember) return selectedDirectMember;
    // Check admin conversations for profile info (works for both admin and user side)
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 bg-background/95 backdrop-blur shrink-0">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Powrót do pulpitu</span>
        </Button>
        <div className="flex items-center gap-2 ml-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-foreground">Wiadomości</h1>
        </div>
      </header>

      {/* Notification permission banner */}
      <NotificationPermissionBanner />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <MessagesSidebar
          channels={channels}
          selectedChannel={selectedChannel}
          onSelectChannel={handleSelectChannel}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          teamMembers={teamMembers}
          upline={upline}
          selectedDirectUserId={selectedDirectUserId}
          onSelectDirectMember={handleSelectDirectMember}
          // Group chat props
          selectionMode={selectionMode}
          onToggleSelectionMode={handleToggleSelectionMode}
          selectedMembers={selectedMembers}
          onToggleSelection={handleToggleSelection}
          onCreateGroupChat={() => setShowGroupDialog(true)}
          // Admin conversation props
          isAdmin={isAdmin}
          adminConversations={adminConversations}
          onAdminSelectUser={handleAdminSelectUser}
          className={cn(
            'w-80 border-r border-border shrink-0',
            'max-md:absolute max-md:inset-0 max-md:w-full max-md:z-10 max-md:bg-background',
            mobileView !== 'list' && 'max-md:hidden'
          )}
        />

        {/* Chat window */}
        <div className={cn(
          'flex-1 flex flex-col min-w-0',
          mobileView !== 'chat' && 'max-md:hidden'
        )}>
          {(selectedChannel || effectiveDirectMember) ? (
            <FullChatWindow
              channel={selectedChannel}
              directMember={effectiveDirectMember}
              messages={messages}
              loading={loading}
              onSend={handleSendMessage}
              onBack={() => setMobileView('list')}
              isAdmin={isAdmin}
              adminConversationStatus={currentConvStatus}
              onCloseConversation={handleCloseConversation}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Create Group Chat Dialog */}
      <CreateGroupChatDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        participantNames={selectedMemberNames}
        onCreateGroup={handleCreateGroupChat}
      />
    </div>
  );
};

const EmptyState = () => (
  <div className="flex-1 flex items-center justify-center bg-muted/20">
    <div className="text-center">
      <MessageSquare className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-1">
        Wybierz rozmowę
      </h3>
      <p className="text-sm text-muted-foreground">
        Wybierz kanał z listy, aby rozpocząć konwersację
      </p>
    </div>
  </div>
);

export default MessagesPage;
