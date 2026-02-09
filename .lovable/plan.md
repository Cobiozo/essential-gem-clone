
# Plan: Dodanie wysyłki testowych powiadomień do wybranych użytkowników

## Zakres zmian

Rozszerzenie panelu "Test powiadomień" o możliwość wysyłki powiadomienia do konkretnego użytkownika wybranego z listy z funkcją wyszukiwania.

---

## Rozwiązanie

### Zmiana 1: Rozszerzenie TestNotificationPanel

**Plik:** `src/components/admin/push-notifications/TestNotificationPanel.tsx`

**Nowe funkcjonalności:**
1. Combobox z listą użytkowników posiadających subskrypcje push
2. Wyszukiwanie po emailu użytkownika
3. Przycisk "Wyślij do wybranego" (aktywny gdy wybrany użytkownik)

**Nowe stany:**
```tsx
const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
const [sendingToSelected, setSendingToSelected] = useState(false);
const [comboboxOpen, setComboboxOpen] = useState(false);
```

**Query do pobrania użytkowników z subskrypcjami:**
```tsx
const { data: usersWithSubscriptions, isLoading: loadingUsers } = useQuery({
  queryKey: ['users-with-push-subscriptions'],
  queryFn: async () => {
    // 1. Pobierz unikalne user_id z subskrypcji
    const { data: subs, error } = await supabase
      .from('user_push_subscriptions')
      .select('user_id')
      .limit(1000);
    
    if (error) throw error;
    
    const uniqueUserIds = [...new Set(subs?.map(s => s.user_id) || [])];
    
    if (uniqueUserIds.length === 0) return [];
    
    // 2. Pobierz emaile przez edge function
    const { data: usersData, error: emailError } = await supabase.functions.invoke(
      'get-user-emails',
      { body: { userIds: uniqueUserIds } }
    );
    
    if (emailError) throw emailError;
    
    return usersData as { id: string; email: string }[];
  },
});
```

**Nowa funkcja wysyłki:**
```tsx
const sendToSelected = async () => {
  if (!selectedUserId) return;
  
  setSendingToSelected(true);
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId: selectedUserId,
        title,
        body,
        url: '/dashboard',
        tag: `test-selected-${Date.now()}`,
      },
    });

    if (error) throw error;

    const selectedUser = usersWithSubscriptions?.find(u => u.id === selectedUserId);
    
    if (data?.sent > 0) {
      toast({
        title: 'Wysłano',
        description: `Powiadomienie wysłane do ${selectedUser?.email || 'wybranego użytkownika'} (${data.sent} urządzeń).`,
      });
    } else {
      toast({
        title: 'Brak aktywnych urządzeń',
        description: 'Użytkownik nie ma aktywnych subskrypcji push.',
        variant: 'destructive',
      });
    }
  } catch (error: any) {
    toast({
      title: 'Błąd',
      description: error.message || 'Nie udało się wysłać powiadomienia.',
      variant: 'destructive',
    });
  } finally {
    setSendingToSelected(false);
  }
};
```

**Nowy UI - Combobox z wyszukiwaniem:**
```tsx
{/* Sekcja wyboru użytkownika */}
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
              {usersWithSubscriptions?.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.email}
                  onSelect={() => {
                    setSelectedUserId(user.id === selectedUserId ? null : user.id);
                    setComboboxOpen(false);
                  }}
                >
                  <Check className={cn(
                    "mr-2 h-4 w-4",
                    selectedUserId === user.id ? "opacity-100" : "opacity-0"
                  )} />
                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                  {user.email}
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
      disabled={!selectedUserId || sendingToSelected || sendingToSelf || sendingToAll || !title}
    >
      {sendingToSelected ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <User className="w-4 h-4 mr-2" />
      )}
      Wyślij do wybranego
    </Button>
  </div>
</div>
```

---

## Schemat interfejsu

```text
┌─────────────────────────────────────────────────────────────┐
│  ✈ Test powiadomień                                         │
│  Wyślij testowe powiadomienie push do siebie lub wybranych  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tytuł powiadomienia          Treść powiadomienia           │
│  ┌───────────────────────┐   ┌───────────────────────────┐  │
│  │ Test powiadomienia    │   │ To jest testowe...        │  │
│  └───────────────────────┘   └───────────────────────────┘  │
│                                                             │
│  Wyślij do wybranego użytkownika                           │
│  ┌─────────────────────────────────┐  ┌──────────────────┐ │
│  │ 🔽 Wybierz użytkownika...       │  │ 👤 Wyślij do     │ │
│  └─────────────────────────────────┘  │   wybranego      │ │
│                                        └──────────────────┘ │
│                                                             │
│  ┌────────────────┐  ┌─────────────────────┐               │
│  │ 🔔 Wyślij do   │  │ 👥 Wyślij do        │               │
│  │   siebie       │  │   wszystkich        │               │
│  └────────────────┘  └─────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## Nowe importy

```tsx
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, User, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/admin/push-notifications/TestNotificationPanel.tsx` | Dodanie combobox z użytkownikami i przycisk "Wyślij do wybranego" |

---

## Oczekiwane rezultaty

1. **Lista użytkowników** - Combobox wyświetla tylko użytkowników z aktywnymi subskrypcjami push
2. **Wyszukiwanie** - Można wyszukiwać użytkowników po adresie email
3. **Wysyłka do wybranego** - Nowy przycisk wysyła powiadomienie do konkretnego użytkownika
4. **Informacja zwrotna** - Toast pokazuje email użytkownika i liczbę urządzeń
5. **Walidacja** - Przycisk jest nieaktywny gdy nie wybrano użytkownika lub brak tytułu
