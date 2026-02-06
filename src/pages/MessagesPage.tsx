import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';
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
  const { user } = useAuth();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Group chat selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showGroupDialog, setShowGroupDialog] = useState(false);

  // Browser notifications
  const { permission, showNotification } = useBrowserNotifications();

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

  // REMOVED: Duplicate subscription - useUnifiedChat already handles realtime messages
  // Browser notifications are handled via user_notifications table and service worker

  const handleSelectChannel = (channelId: string) => {
    selectChannel(channelId);
    setMobileView('chat');
  };

  const handleSelectDirectMember = (userId: string) => {
    selectDirectMember(userId);
    setMobileView('chat');
  };

  const handleSendMessage = async (
    content: string,
    messageType: string = 'text',
    attachmentUrl?: string,
    attachmentName?: string
  ): Promise<boolean> => {
    if (selectedDirectUserId) {
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
      // Exiting selection mode - clear selections
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

  // Determine current chat context
  const currentChatName = selectedDirectMember 
    ? `${selectedDirectMember.firstName} ${selectedDirectMember.lastName}`
    : selectedChannel?.name;
  
  const canSendInCurrentChat = selectedDirectMember 
    ? true  // Direct messages always sendable
    : selectedChannel?.canSend;

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
          {(selectedChannel || selectedDirectMember) ? (
            <FullChatWindow
              channel={selectedChannel}
              directMember={selectedDirectMember}
              messages={messages}
              loading={loading}
              onSend={handleSendMessage}
              onBack={() => setMobileView('list')}
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
