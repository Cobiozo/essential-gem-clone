import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';
import { MessagesSidebar } from '@/components/messages/MessagesSidebar';
import { FullChatWindow } from '@/components/messages/FullChatWindow';

const MessagesPage = () => {
  const navigate = useNavigate();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [searchQuery, setSearchQuery] = useState('');

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
  } = useUnifiedChat({ enableRealtime: true });

  const handleSelectChannel = (channelId: string) => {
    selectChannel(channelId);
    setMobileView('chat');
  };

  const handleSelectDirectMember = (userId: string) => {
    selectDirectMember(userId);
    setMobileView('chat');
  };

  const handleSendMessage = async (content: string): Promise<boolean> => {
    if (selectedDirectUserId) {
      return sendDirectMessage(selectedDirectUserId, content);
    }
    return sendMessage(content);
  };

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
