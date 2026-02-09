import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
import { Send, Bell, Loader2, Users, Check, ChevronsUpDown, User, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TestNotificationPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('Test powiadomienia');
  const [body, setBody] = useState('To jest testowe powiadomienie push!');
  const [sendingToSelf, setSendingToSelf] = useState(false);
  const [sendingToAll, setSendingToAll] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sendingToSelected, setSendingToSelected] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const { data: usersWithSubscriptions, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-with-push-subscriptions'],
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from('user_push_subscriptions')
        .select('user_id')
        .limit(1000);
      
      if (error) throw error;
      
      const uniqueUserIds = [...new Set(subs?.map(s => s.user_id) || [])];
      if (uniqueUserIds.length === 0) return [];
      
      const { data: usersData, error: emailError } = await supabase.functions.invoke(
        'get-user-emails',
        { body: { userIds: uniqueUserIds } }
      );
      
      if (emailError) throw emailError;
      return usersData as { id: string; email: string }[];
    },
  });

  const sendToSelf = async () => {
    if (!user) return;
    setSendingToSelf(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { userId: user.id, title, body, url: '/admin?tab=push-notifications', tag: `test-self-${Date.now()}` },
      });
      if (error) throw error;
      if (data?.sent > 0) {
        toast({ title: 'Wysłano', description: `Powiadomienie wysłane do ${data.sent} urządzenia/urządzeń.` });
      } else {
        toast({ title: 'Brak subskrypcji', description: 'Nie masz żadnych aktywnych subskrypcji push.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message || 'Nie udało się wysłać powiadomienia.', variant: 'destructive' });
    } finally {
      setSendingToSelf(false);
    }
  };

  const sendToSelected = async () => {
    if (!selectedUserId) return;
    setSendingToSelected(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { userId: selectedUserId, title, body, url: '/dashboard', tag: `test-selected-${Date.now()}` },
      });
      if (error) throw error;
      const selectedUser = usersWithSubscriptions?.find(u => u.id === selectedUserId);
      if (data?.sent > 0) {
        toast({ title: 'Wysłano', description: `Powiadomienie wysłane do ${selectedUser?.email || 'wybranego użytkownika'} (${data.sent} urządzeń).` });
      } else {
        toast({ title: 'Brak aktywnych urządzeń', description: 'Użytkownik nie ma aktywnych subskrypcji push.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message || 'Nie udało się wysłać powiadomienia.', variant: 'destructive' });
    } finally {
      setSendingToSelected(false);
    }
  };

  const sendToAll = async () => {
    setSendingToAll(true);
    try {
      const { data: subscriptions, error: fetchError } = await supabase
        .from('user_push_subscriptions')
        .select('user_id')
        .limit(1000);
      if (fetchError) throw fetchError;
      if (!subscriptions || subscriptions.length === 0) {
        toast({ title: 'Brak subskrypcji', description: 'Brak aktywnych subskrypcji push w systemie.', variant: 'destructive' });
        return;
      }
      const uniqueUserIds = [...new Set(subscriptions.map(s => s.user_id))];
      let totalSent = 0;
      let totalFailed = 0;
      for (const userId of uniqueUserIds) {
        try {
          const { data } = await supabase.functions.invoke('send-push-notification', {
            body: { userId, title, body, url: '/messages', tag: `broadcast-${Date.now()}` },
          });
          if (data?.sent) totalSent += data.sent;
          if (data?.failed) totalFailed += data.failed;
        } catch (err) {
          totalFailed++;
        }
      }
      toast({ title: 'Wysyłka zakończona', description: `Wysłano do ${totalSent} urządzeń (${uniqueUserIds.length} użytkowników). ${totalFailed > 0 ? `Błędy: ${totalFailed}` : ''}` });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message || 'Nie udało się wysłać powiadomień.', variant: 'destructive' });
    } finally {
      setSendingToAll(false);
    }
  };

  const isSending = sendingToSelf || sendingToAll || sendingToSelected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Test powiadomień
        </CardTitle>
        <CardDescription>
          Wyślij testowe powiadomienie push do siebie, wybranego użytkownika lub wszystkich
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="test-title">Tytuł powiadomienia</Label>
            <Input id="test-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tytuł..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-body">Treść powiadomienia</Label>
            <Input id="test-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Treść..." />
          </div>
        </div>

        {/* User selection */}
        <div className="space-y-2">
          <Label>Wyślij do wybranego użytkownika</Label>
          <div className="flex flex-wrap gap-2">
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full md:w-[300px] justify-between"
                  disabled={loadingUsers}
                >
                  {loadingUsers ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedUserId ? (
                    usersWithSubscriptions?.find(u => u.id === selectedUserId)?.email || 'Wybierz użytkownika'
                  ) : (
                    'Wybierz użytkownika...'
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Szukaj po emailu..." />
                  <CommandList>
                    <CommandEmpty>Nie znaleziono użytkowników.</CommandEmpty>
                    <CommandGroup>
                      {usersWithSubscriptions?.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={u.email}
                          onSelect={() => {
                            setSelectedUserId(u.id === selectedUserId ? null : u.id);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                          <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                          {u.email}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Button
              variant="secondary"
              onClick={sendToSelected}
              disabled={!selectedUserId || isSending || !title}
            >
              {sendingToSelected ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <User className="w-4 h-4 mr-2" />}
              Wyślij do wybranego
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={sendToSelf} disabled={isSending || !title}>
            {sendingToSelf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
            Wyślij do siebie
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isSending || !title}>
                {sendingToAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                Wyślij do wszystkich
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Wyślij do wszystkich użytkowników?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ta akcja wyśle powiadomienie push do wszystkich użytkowników z aktywnymi subskrypcjami.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={sendToAll}>Wyślij do wszystkich</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
