import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { usePrivateChat } from '@/hooks/usePrivateChat';
import { PrivateChatThreadList } from './PrivateChatThreadList';
import { PrivateChatThreadView } from './PrivateChatThreadView';
import { PrivateChatThread } from '@/types/privateChat';
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

export const PrivateChatWidget = () => {
  // Enable realtime since this widget is only rendered when visible (on private-chats tab)
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
  } = usePrivateChat({ enableRealtime: true });

  const [deleteConfirmThread, setDeleteConfirmThread] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'closed' | 'archived'>('active');

  const filteredThreads = threads.filter(t => {
    if (activeTab === 'active') return t.status === 'active';
    if (activeTab === 'closed') return t.status === 'closed';
    return t.status === 'archived';
  });

  const handleSendMessage = async (content: string) => {
    if (!selectedThread) return false;
    return sendMessage(selectedThread.id, content);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmThread) {
      await deleteThread(deleteConfirmThread);
      setDeleteConfirmThread(null);
    }
  };

  // Show thread view if a thread is selected
  if (selectedThread) {
    return (
      <Card className="h-[500px] flex flex-col">
        <PrivateChatThreadView
          thread={selectedThread}
          messages={messages}
          loading={messagesLoading}
          onSendMessage={handleSendMessage}
          onBack={() => selectThread(null)}
          getOtherParticipant={getOtherParticipant}
        />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Wątki czatu
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchThreads}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="active">
                Aktywne
                {threads.filter(t => t.status === 'active').length > 0 && (
                  <span className="ml-1.5 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                    {threads.filter(t => t.status === 'active').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="closed">Zamknięte</TabsTrigger>
              <TabsTrigger value="archived">Archiwum</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              <PrivateChatThreadList
                threads={filteredThreads}
                selectedThread={selectedThread}
                loading={loading}
                onSelectThread={selectThread}
                onUpdateStatus={updateThreadStatus}
                onDeleteThread={(id) => setDeleteConfirmThread(id)}
                getOtherParticipant={getOtherParticipant}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
