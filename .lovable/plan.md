

# Plan: Rozbudowa systemu czatu - Opiekun, Czat grupowy, Powiadomienia

## Podsumowanie wymagań użytkownika

1. **Każdy może napisać do swojego opiekuna** - Użytkownicy mogą kontaktować się z osobą, która ich zaprosiła (upline)
2. **Opiekun może tworzyć czat grupowy** - Lider zespołu może zaznaczyć kilka osób ze swojej struktury i utworzyć wspólny czat
3. **Powiadomienia push/email** - Jeśli aplikacja jest w tle = powiadomienie przeglądarki; jeśli zamknięta = email z treścią wiadomości

---

## Część 1: Wiadomości do opiekuna

### Obecny stan
System już obsługuje tę funkcjonalność:
- `useUnifiedChat.ts` pobiera `upline` (opiekun) przez `profile.upline_eq_id`
- `TeamMembersSection.tsx` wyświetla opiekuna z etykietą "Opiekun"
- `sendDirectMessage()` pozwala wysłać wiadomość 1:1

### Weryfikacja
Na podstawie kodu widocznego w planie - ta funkcjonalność już działa. Użytkownik widzi opiekuna w sekcji "Członkowie zespołu" i może do niego napisać.

**Status: Już zaimplementowane - brak zmian**

---

## Część 2: Czat grupowy z zespołem

### Obecny stan
- `usePrivateChat.ts` już posiada funkcję `createGroupThread()` do tworzenia czatów grupowych
- Jednak ta funkcjonalność jest dostępna tylko dla administratorów w module "Pure - Kontakty"

### Wymagane zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/messages/TeamMembersSection.tsx` | Dodanie checkboxów i przycisku "Utwórz czat grupowy" |
| `src/hooks/useUnifiedChat.ts` | Rozszerzenie o obsługę czatów grupowych |
| `src/pages/MessagesPage.tsx` | Dodanie stanu dla wybranych członków zespołu |

### Szczegóły implementacji

**1. TeamMembersSection.tsx - dodanie trybu zaznaczania**

```tsx
interface TeamMembersSectionProps {
  // ... istniejące props
  selectionMode?: boolean;
  selectedMembers?: Set<string>;
  onToggleSelection?: (userId: string) => void;
  onCreateGroupChat?: () => void;
  canCreateGroups?: boolean; // Tylko opiekunowie (mają downline)
}

// W komponencie:
{canCreateGroups && (
  <Button 
    size="sm" 
    variant="outline"
    onClick={() => setSelectionMode(!selectionMode)}
  >
    {selectionMode ? 'Anuluj' : 'Wybierz wiele'}
  </Button>
)}

// Przy każdym członku downline:
{selectionMode && (
  <Checkbox 
    checked={selectedMembers.has(member.userId)}
    onCheckedChange={() => onToggleSelection(member.userId)}
  />
)}

// Przycisk tworzenia grupy gdy wybrano >1 osoby:
{selectionMode && selectedMembers.size > 1 && (
  <Button onClick={onCreateGroupChat}>
    Utwórz czat grupowy ({selectedMembers.size})
  </Button>
)}
```

**2. MessagesPage.tsx - stan dla zaznaczonych**

```tsx
const [selectedTeamMembers, setSelectedTeamMembers] = useState<Set<string>>(new Set());
const [selectionMode, setSelectionMode] = useState(false);
const [showGroupChatDialog, setShowGroupChatDialog] = useState(false);

const handleCreateGroupChat = async (subject: string, message: string) => {
  const threadData = {
    participant_ids: Array.from(selectedTeamMembers),
    subject,
    initial_message: message,
  };
  const thread = await createGroupThread(threadData);
  if (thread) {
    setSelectedTeamMembers(new Set());
    setSelectionMode(false);
  }
};

// Przekazanie do TeamMembersSection:
<TeamMembersSection
  canCreateGroups={teamMembers.length > 0}
  selectionMode={selectionMode}
  selectedMembers={selectedTeamMembers}
  onToggleSelection={(id) => {
    setSelectedTeamMembers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }}
  onCreateGroupChat={() => setShowGroupChatDialog(true)}
/>
```

**3. Dialog tworzenia czatu grupowego**

Nowy komponent: `src/components/messages/CreateGroupChatDialog.tsx`

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Nowy czat grupowy</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Input 
        placeholder="Temat rozmowy..." 
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <Textarea 
        placeholder="Pierwsza wiadomość..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="text-sm text-muted-foreground">
        Uczestnicy: {participantNames.join(', ')}
      </div>
    </div>
    <DialogFooter>
      <Button onClick={handleCreate}>Utwórz czat</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Część 3: Powiadomienia Push i Email

### Architektura

```text
Nowa wiadomość
      │
      ├─► Sprawdź: Czy odbiorca jest ONLINE i TAB aktywna?
      │       │
      │       ├─ TAK → Browser Notification (Web Notification API)
      │       │
      │       └─ NIE → Wyślij Email (Edge Function)
```

### Wymagane zmiany

| Plik/Zasób | Zmiana |
|------------|--------|
| `src/hooks/useNotifications.ts` | Dodanie logiki Web Push Notification |
| `src/hooks/useBrowserNotifications.ts` | Nowy hook - obsługa Notification API |
| `supabase/functions/send-chat-notification-email/` | Nowa Edge Function - email o wiadomości |
| Migracja bazy | Dodanie `last_seen_at` do profiles, tabela user_notification_preferences |

### 3.1 Powiadomienia przeglądarki (gdy w tle)

**Nowy hook: `src/hooks/useBrowserNotifications.ts`**

```tsx
export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return Notification.permission;
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted' && document.hidden) {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    }
  };

  return { permission, requestPermission, showNotification };
};
```

**Integracja w `useNotifications.ts`**

```tsx
// W subskrypcji real-time:
.on('INSERT', (payload) => {
  const notification = payload.new;
  
  // Pokazuj browser notification tylko gdy tab w tle
  if (document.hidden && permission === 'granted') {
    showNotification(notification.title, {
      body: notification.message,
      tag: notification.id, // Zapobiega duplikatom
      data: { link: notification.link },
    });
  }
});
```

### 3.2 Email gdy offline

**Nowa Edge Function: `supabase/functions/send-chat-notification-email/index.ts`**

```typescript
// Sprawdza czy użytkownik był nieaktywny >5 minut
// Jeśli tak - wysyła email z treścią wiadomości

serve(async (req) => {
  const { recipient_id, sender_name, message_content, message_type } = await req.json();
  
  // Sprawdź last_seen_at
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_seen_at, email')
    .eq('user_id', recipient_id)
    .single();
  
  const lastSeen = new Date(profile.last_seen_at);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  if (lastSeen < fiveMinutesAgo) {
    // Użytkownik offline - wyślij email
    await sendEmail({
      to: profile.email,
      subject: `Nowa wiadomość od ${sender_name}`,
      body: `${sender_name} wysłał Ci wiadomość:\n\n"${message_content}"`,
    });
  }
});
```

**Migracja bazy danych**

```sql
-- Śledzenie aktywności użytkownika
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- Preferencje powiadomień
CREATE TABLE user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_on_offline boolean DEFAULT true,
  browser_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
ON user_notification_preferences FOR ALL TO authenticated
USING (user_id = auth.uid());
```

**Aktualizacja last_seen_at**

W `src/App.tsx` lub dedykowanym hooku:

```tsx
useEffect(() => {
  if (!user) return;
  
  const updateLastSeen = () => {
    if (!document.hidden) {
      supabase.from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(() => {});
    }
  };
  
  // Aktualizuj co 2 minuty gdy aktywny
  const interval = setInterval(updateLastSeen, 2 * 60 * 1000);
  document.addEventListener('visibilitychange', updateLastSeen);
  
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', updateLastSeen);
  };
}, [user]);
```

**Wywołanie Edge Function przy wysyłaniu wiadomości**

W `useUnifiedChat.ts` → `sendDirectMessage()`:

```tsx
// Po zapisaniu wiadomości:
await supabase.functions.invoke('send-chat-notification-email', {
  body: {
    recipient_id: recipientId,
    sender_name: senderName,
    message_content: content,
    message_type: messageType,
  },
});
```

---

## Podsumowanie plików do modyfikacji/utworzenia

| Plik | Typ | Opis |
|------|-----|------|
| `src/components/messages/TeamMembersSection.tsx` | Modyfikacja | Tryb wyboru wielu, checkboxy |
| `src/components/messages/CreateGroupChatDialog.tsx` | Nowy | Dialog tworzenia czatu grupowego |
| `src/pages/MessagesPage.tsx` | Modyfikacja | Stan zaznaczenia, integracja dialogu |
| `src/hooks/useBrowserNotifications.ts` | Nowy | Obsługa Web Notification API |
| `src/hooks/useNotifications.ts` | Modyfikacja | Integracja push notifications |
| `src/hooks/useUnifiedChat.ts` | Modyfikacja | Wywołanie Edge Function email |
| `supabase/functions/send-chat-notification-email/` | Nowy | Edge Function wysyłająca email |
| Migracja SQL | Nowa | last_seen_at, user_notification_preferences |

---

## Priorytetyzacja

| Priorytet | Funkcjonalność | Złożoność |
|-----------|----------------|-----------|
| ✅ Gotowe | Wiadomość do opiekuna | - |
| 🔴 Wysoki | Czat grupowy z zespołem | Średnia |
| 🔴 Wysoki | Browser notifications (w tle) | Niska |
| 🟡 Średni | Email gdy offline | Średnia |

