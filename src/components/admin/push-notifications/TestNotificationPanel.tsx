import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Send, Bell, Loader2, Users } from 'lucide-react';

export const TestNotificationPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('Test powiadomienia');
  const [body, setBody] = useState('To jest testowe powiadomienie push!');
  const [sendingToSelf, setSendingToSelf] = useState(false);
  const [sendingToAll, setSendingToAll] = useState(false);

  const sendToSelf = async () => {
    if (!user) return;
    
    setSendingToSelf(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title,
          body,
          url: '/admin?tab=push-notifications',
          tag: `test-self-${Date.now()}`,
        },
      });

      if (error) throw error;

      if (data?.sent > 0) {
        toast({
          title: 'Wysłano',
          description: `Powiadomienie wysłane do ${data.sent} urządzenia/urządzeń.`,
        });
      } else {
        toast({
          title: 'Brak subskrypcji',
          description: 'Nie masz żadnych aktywnych subskrypcji push. Włącz powiadomienia w sekcji "Twoje urządzenie".',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Send to self error:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wysłać powiadomienia.',
        variant: 'destructive',
      });
    } finally {
      setSendingToSelf(false);
    }
  };

  const sendToAll = async () => {
    setSendingToAll(true);
    try {
      // Get all unique user IDs with subscriptions
      const { data: subscriptions, error: fetchError } = await supabase
        .from('user_push_subscriptions')
        .select('user_id')
        .limit(1000);

      if (fetchError) throw fetchError;

      if (!subscriptions || subscriptions.length === 0) {
        toast({
          title: 'Brak subskrypcji',
          description: 'Brak aktywnych subskrypcji push w systemie.',
          variant: 'destructive',
        });
        return;
      }

      // Get unique user IDs
      const uniqueUserIds = [...new Set(subscriptions.map(s => s.user_id))];
      
      let totalSent = 0;
      let totalFailed = 0;

      // Send to each user
      for (const userId of uniqueUserIds) {
        try {
          const { data } = await supabase.functions.invoke('send-push-notification', {
            body: {
              userId,
              title,
              body,
              url: '/messages',
              tag: `broadcast-${Date.now()}`,
            },
          });
          
          if (data?.sent) totalSent += data.sent;
          if (data?.failed) totalFailed += data.failed;
        } catch (err) {
          console.error('Error sending to user:', userId, err);
          totalFailed++;
        }
      }

      toast({
        title: 'Wysyłka zakończona',
        description: `Wysłano do ${totalSent} urządzeń (${uniqueUserIds.length} użytkowników). ${totalFailed > 0 ? `Błędy: ${totalFailed}` : ''}`,
      });
    } catch (error: any) {
      console.error('Send to all error:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wysłać powiadomień.',
        variant: 'destructive',
      });
    } finally {
      setSendingToAll(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Test powiadomień
        </CardTitle>
        <CardDescription>
          Wyślij testowe powiadomienie push do siebie lub wszystkich użytkowników
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="test-title">Tytuł powiadomienia</Label>
            <Input
              id="test-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tytuł..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-body">Treść powiadomienia</Label>
            <Input
              id="test-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Treść..."
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={sendToSelf}
            disabled={sendingToSelf || sendingToAll || !title}
          >
            {sendingToSelf ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Bell className="w-4 h-4 mr-2" />
            )}
            Wyślij do siebie
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={sendingToSelf || sendingToAll || !title}>
                {sendingToAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                Wyślij do wszystkich
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Wyślij do wszystkich użytkowników?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ta akcja wyśle powiadomienie push do wszystkich użytkowników z aktywnymi subskrypcjami.
                  Upewnij się, że treść jest odpowiednia.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={sendToAll}>
                  Wyślij do wszystkich
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
