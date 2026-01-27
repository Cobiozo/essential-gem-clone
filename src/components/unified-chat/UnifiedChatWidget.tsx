import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';
import { ConversationsSidebar } from './ConversationsSidebar';
import { ChatWindow } from './ChatWindow';

export const UnifiedChatWidget = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    channels,
    selectedChannel,
    messages,
    loading,
    totalUnread,
    selectChannel,
    sendMessage,
  } = useUnifiedChat({ enableRealtime: true });

  return (
    <div className="flex h-[600px] bg-background/90 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-sm">
      {/* Left sidebar - channel list */}
      <ConversationsSidebar
        channels={channels}
        selectedChannel={selectedChannel}
        onSelectChannel={selectChannel}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      {/* Right side - chat window */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChannel ? (
          <ChatWindow
            channel={selectedChannel}
            messages={messages}
            loading={loading}
            onSend={sendMessage}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Wybierz kanał</p>
              <p className="text-sm">Wybierz kanał z listy po lewej stronie, aby rozpocząć rozmowę</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
