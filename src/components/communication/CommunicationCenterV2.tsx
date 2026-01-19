import { useState, useMemo } from 'react';
import { MessageSquare, Users, Inbox, Bell, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivateChat } from '@/hooks/usePrivateChat';
import { useRoleChat } from '@/hooks/useRoleChat';
import { useChatPermissions } from '@/hooks/useChatPermissions';
import { ROLE_HIERARCHY } from '@/types/roleChat';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { NewMessageDialog } from './NewMessageDialog';
import { TeamMessageComposer } from './TeamMessageComposer';
import { RoleChatInbox } from '@/components/role-chat/RoleChatInbox';
import { RoleChatWidget } from '@/components/role-chat/RoleChatWidget';

export const CommunicationCenterV2 = () => {
  const { userRole, isAdmin, profile } = useAuth();
  const role = userRole?.role?.toLowerCase() || 'client';
  
  // Hooks
  const {
    threads,
    messages,
    selectedThread,
    loading,
    messagesLoading,
    fetchThreads,
    sendMessage,
    updateThreadStatus,
    deleteThread,
    selectThread,
    getOtherParticipant,
    getThreadDisplayName,
  } = usePrivateChat({ enableRealtime: true });
  
  const { channels, unreadCount: roleUnreadCount } = useRoleChat({ enableRealtime: false });
  const { getTargetRoles } = useChatPermissions();
  
  // State
  const [activeTab, setActiveTab] = useState('messages');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [deleteConfirmThread, setDeleteConfirmThread] = useState<string | null>(null);

  // Calculate counts
  const privateUnreadCount = useMemo(() => {
    return threads.filter(t => t.status === 'active' && (t.unread_count || 0) > 0).length;
  }, [threads]);

  // Determine which tabs to show based on role
  const userLevel = ROLE_HIERARCHY[role] || 25;
  
  // "From Leaders" - users who can receive messages from higher roles
  const showFromLeaders = role !== 'admin';
  
  // "To Team" - users who can send to lower roles (specjalista and above)
  const showToTeam = userLevel >= 50;
  
  // "Team Messages" - partners and specialists with team members
  const showTeamMessages = role === 'partner' || role === 'specjalista';
  
  // Can user create new messages?
  const canCreateMessages = getTargetRoles().length > 0;

  // Handlers
  const handleSendMessage = async (content: string) => {
    if (!selectedThread) return false;
    return sendMessage(selectedThread.id, content);
  };

  const handleUpdateStatus = async (status: 'active' | 'closed' | 'archived') => {
    if (!selectedThread) return;
    await updateThreadStatus(selectedThread.id, status);
  };

  const handleDelete = () => {
    if (selectedThread) {
      setDeleteConfirmThread(selectedThread.id);
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmThread) {
      await deleteThread(deleteConfirmThread);
      setDeleteConfirmThread(null);
    }
  };

  const handleThreadCreated = (threadId: string) => {
    fetchThreads();
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      selectThread(thread);
    }
  };

  // Calculate grid columns
  const tabCount = 1 + (showFromLeaders ? 1 : 0) + (showToTeam ? 1 : 0) + (showTeamMessages ? 1 : 0);

  return (
    <>
      <Card className="border-0 shadow-none h-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="h-5 w-5 text-primary" />
                Centrum Komunikacji
              </CardTitle>
              <CardDescription className="mt-1">
                Prowadź rozmowy prywatne, zespołowe i odbieraj ogłoszenia
              </CardDescription>
            </div>
            {(privateUnreadCount > 0 || roleUnreadCount > 0) && (
              <Badge variant="destructive" className="h-6 px-2">
                <Bell className="h-3 w-3 mr-1" />
                {privateUnreadCount + roleUnreadCount} nowych
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList 
              className="grid w-full mb-6" 
              style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}
            >
              {/* Private Messages */}
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Wiadomości</span>
                <span className="sm:hidden">Czat</span>
                {privateUnreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                    {privateUnreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              
              {/* Team Messages - for partners and specialists */}
              {showTeamMessages && (
                <TabsTrigger value="team-messages" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Do zespołu</span>
                  <span className="sm:hidden">Zespół</span>
                </TabsTrigger>
              )}
              
              {/* From Leaders - for receiving messages from higher roles */}
              {showFromLeaders && (
                <TabsTrigger value="from-leaders" className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  <span className="hidden sm:inline">Od przełożonych</span>
                  <span className="sm:hidden">Odebrane</span>
                  {roleUnreadCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                      {roleUnreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              
              {/* To Team - for sending to lower roles */}
              {showToTeam && (
                <TabsTrigger value="to-team" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Ogłoszenia</span>
                  <span className="sm:hidden">Wyślij</span>
                </TabsTrigger>
              )}
            </TabsList>
            
            {/* Private Messages Tab */}
            <TabsContent value="messages" className="mt-0">
              <div className="border rounded-lg h-[500px] overflow-hidden">
                {selectedThread ? (
                  <ConversationView
                    thread={selectedThread}
                    messages={messages}
                    loading={messagesLoading}
                    onSendMessage={handleSendMessage}
                    onBack={() => selectThread(null)}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                    getOtherParticipant={getOtherParticipant}
                    getThreadDisplayName={getThreadDisplayName}
                  />
                ) : (
                  <ConversationList
                    threads={threads}
                    selectedThread={selectedThread}
                    loading={loading}
                    onSelectThread={selectThread}
                    onNewMessage={() => setShowNewMessage(true)}
                    getOtherParticipant={getOtherParticipant}
                    getThreadDisplayName={getThreadDisplayName}
                  />
                )}
              </div>
            </TabsContent>
            
            {/* Team Messages Tab */}
            {showTeamMessages && (
              <TabsContent value="team-messages" className="mt-0">
                <TeamMessageComposer onMessageSent={fetchThreads} />
              </TabsContent>
            )}
            
            {/* From Leaders Tab */}
            {showFromLeaders && (
              <TabsContent value="from-leaders" className="mt-0">
                <RoleChatInbox />
              </TabsContent>
            )}
            
            {/* To Team Tab */}
            {showToTeam && (
              <TabsContent value="to-team" className="mt-0">
                <RoleChatWidget />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* New Message Dialog */}
      <NewMessageDialog
        open={showNewMessage}
        onOpenChange={setShowNewMessage}
        onThreadCreated={handleThreadCreated}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmThread} onOpenChange={() => setDeleteConfirmThread(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć wątek?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Wszystkie wiadomości w tym wątku zostaną trwale usunięte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
