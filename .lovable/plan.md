

# Plan: System Wiadomości Wewnętrznych w stylu Komunikatora

## Cel

Stworzenie nowego, jednolitego widoku komunikatora wewnętrznego podobnego do pokazanego screenshota - z panelem konwersacji po lewej stronie (z kategoriami ról + wątkami) i oknem czatu po prawej. System łączy istniejącą funkcjonalność role-based chat z nowoczesnym interfejsem.

---

## Analiza istniejącej infrastruktury

### Co już mamy:

| Element | Stan | Opis |
|---------|------|------|
| `role_chat_channels` | Gotowe | 6 kanałów: Admin→Partner, Admin→Specjalista, Admin→Client, Partner→Specjalista, Partner→Client, Specjalista→Client |
| `role_chat_messages` | Gotowe | Wiadomości z sender_id, sender_role, recipient_role, recipient_id, channel_id |
| `chat_permissions` | Gotowe | 10 rekordów definiujących kto może do kogo pisać |
| `private_chat_*` | Gotowe | System czatów 1:1 i grupowych |
| `user_notifications` | Gotowe | System powiadomień z real-time subscriptions |
| `useRoleChat` hook | Gotowe | Pobieranie kanałów, wiadomości, sendMessage, markAsRead |
| `useNotifications` hook | Gotowe | `sendNotification()` do wysyłania powiadomień |
| Hierarchia ról | Gotowe | Admin(100) → Partner(75) → Specjalista(50) → Client(25) |

### Co trzeba zbudować:

Nowy komponent `UnifiedChatWidget` z layoutem zgodnym z referencją - listą kanałów po lewej, oknem czatu po prawej.

---

## Architektura rozwiązania

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  UnifiedChatPage                                                             │
│  ┌─────────────────────────────┬────────────────────────────────────────────┐│
│  │  ConversationsList          │  ChatWindow                                ││
│  │  ┌───────────────────────┐  │  ┌────────────────────────────────────────┐││
│  │  │ [Szukaj wiadomości...]│  │  │  Partnerzy                          🔍 │││
│  │  └───────────────────────┘  │  ├────────────────────────────────────────┤││
│  │                             │  │                                        │││
│  │  ● Wszyscy                  │  │  DK  Dawid Kowalczyk  07:16           │││
│  │  ● Klienci                  │  │      ┌─────────┐                       │││
│  │  ● Liderzy (Partnerzy)      │  │      │  Hello  │                       │││
│  │  ● Specjaliści              │  │      └─────────┘                       │││
│  │  ● Partnerzy ← selected     │  │      👍 1                              │││
│  │    + Nowy wątek             │  │                                        │││
│  │                             │  │                                        │││
│  │  ─────────────────────────  │  │                                        │││
│  │  Prośby o czat              │  │                                        │││
│  │                             │  │                                        │││
│  │                             │  ├────────────────────────────────────────┤││
│  │                             │  │  📎  😊  🎤   Wpisz wiadomość...   ✈   │││
│  │                             │  └────────────────────────────────────────┘││
│  └─────────────────────────────┴────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Szczegółowy plan implementacji

### 1. Nowy hook: `useUnifiedChat`

Hook łączący dane z `useRoleChat` oraz rozszerzający funkcjonalność:

```typescript
// src/hooks/useUnifiedChat.ts

interface UnifiedChannel {
  id: string;
  type: 'role' | 'broadcast' | 'private';
  name: string;           // "Wszyscy", "Partnerzy", "Klienci"
  targetRole: string | null;  // null dla "Wszyscy"
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  canSend: boolean;       // czy user może wysyłać do tego kanału
  canReceive: boolean;    // czy user może odbierać z tego kanału
}

interface UnifiedMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderInitials: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
  isRead: boolean;
}

// Główne funkcje:
- getAvailableChannels(): UnifiedChannel[] - zwraca kanały widoczne dla roli
- getMessagesForChannel(channelId): UnifiedMessage[]
- sendToChannel(channelId, content): Promise<boolean>
- markChannelAsRead(channelId): void
- searchMessages(query): UnifiedMessage[]
```

### 2. Nowy komponent główny: `UnifiedChatWidget`

```typescript
// src/components/unified-chat/UnifiedChatWidget.tsx

export const UnifiedChatWidget = () => {
  // Stan
  const [selectedChannel, setSelectedChannel] = useState<UnifiedChannel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  
  // Hook
  const {
    channels,
    messages,
    loading,
    sendToChannel,
    markChannelAsRead,
    searchMessages,
  } = useUnifiedChat();
  
  // Layout: 2 kolumny - lista kanałów | okno czatu
  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      <ConversationsSidebar 
        channels={channels}
        selectedChannel={selectedChannel}
        onSelectChannel={setSelectedChannel}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <ChatWindow 
        channel={selectedChannel}
        messages={messages}
        onSend={sendToChannel}
        onMarkAsRead={markChannelAsRead}
      />
    </div>
  );
};
```

### 3. Komponent listy kanałów: `ConversationsSidebar`

```typescript
// src/components/unified-chat/ConversationsSidebar.tsx

// Struktura kanałów widocznych dla różnych ról:
// 
// ADMIN widzi:
//   • Wszyscy (broadcast do wszystkich ról)
//   • Klienci (broadcast do roli client)
//   • Specjaliści (broadcast do roli specjalista)
//   • Partnerzy (broadcast do roli partner)
//   • Prywatne wątki (z private_chat_threads)
//
// PARTNER widzi:
//   • Klienci (może wysyłać)
//   • Specjaliści (może wysyłać)
//   • Od Administratorów (odbiera)
//   • Prywatne wątki
//
// SPECJALISTA widzi:
//   • Klienci (może wysyłać)
//   • Od Administratorów (odbiera)
//   • Od Partnerów (odbiera)
//   • Prywatne wątki
//
// KLIENT widzi:
//   • Od Administratorów (odbiera)
//   • Od Partnerów (odbiera)
//   • Od Specjalistów (odbiera)
//   • Prywatne wątki
```

### 4. Komponent okna czatu: `ChatWindow`

```typescript
// src/components/unified-chat/ChatWindow.tsx

export const ChatWindow = ({ channel, messages, onSend, onMarkAsRead }) => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header z nazwą kanału i wyszukiwaniem */}
      <ChatHeader channel={channel} />
      
      {/* Lista wiadomości z auto-scroll */}
      <ScrollArea className="flex-1 p-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </ScrollArea>
      
      {/* Pole wprowadzania wiadomości */}
      {channel?.canSend && (
        <MessageInput onSend={onSend} />
      )}
    </div>
  );
};
```

### 5. Integracja z powiadomieniami

Przy wysyłaniu wiadomości automatycznie tworzony notification:

```typescript
// W useUnifiedChat.sendToChannel():

const sendToChannel = async (channelId: string, content: string) => {
  // 1. Zapisz wiadomość w role_chat_messages
  await supabase.from('role_chat_messages').insert({
    channel_id: channelId,
    sender_id: user.id,
    sender_role: userRole,
    recipient_role: channel.targetRole,
    recipient_id: null, // broadcast do roli
    content,
  });
  
  // 2. Wyślij powiadomienie do wszystkich użytkowników danej roli
  // Używamy target_role w user_notifications - istniejąca funkcjonalność!
  await supabase.from('user_notifications').insert({
    user_id: null, // broadcast - użyty będzie target_role
    target_role: channel.targetRole, // "partner", "specjalista", "client"
    sender_id: user.id,
    notification_type: 'role_chat_message',
    source_module: 'role_chat',
    title: `Nowa wiadomość od ${ROLE_LABELS[userRole]}`,
    message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    link: '/my-account?tab=communication',
  });
};
```

**Uwaga**: Obecny system już obsługuje `target_role` w `user_notifications` - powiadomienia są filtrowane w `useNotifications` (`or(target_role.is.null,target_role.eq.${currentRole})`).

### 6. Rozszerzenie tabeli role_chat_messages (opcjonalne)

Dla funkcji reakcji (emoji 👍) i załączników możemy w przyszłości dodać:

```sql
-- Tylko jeśli potrzebne reakcje
ALTER TABLE role_chat_messages 
  ADD COLUMN reactions jsonb DEFAULT '{}';

-- Format: {"thumbs_up": ["user_id1", "user_id2"], "heart": ["user_id3"]}
```

Na razie pomijamy - skupiamy się na podstawowej funkcjonalności.

---

## Struktura plików do utworzenia

```text
src/components/unified-chat/
├── UnifiedChatWidget.tsx      # Główny komponent
├── ConversationsSidebar.tsx   # Lista kanałów po lewej
├── ChatWindow.tsx             # Okno czatu po prawej
├── ChatHeader.tsx             # Header z nazwą kanału
├── MessageBubble.tsx          # Pojedyncza wiadomość
├── MessageInput.tsx           # Pole wprowadzania
├── ChannelItem.tsx            # Element listy kanałów
└── index.ts                   # Eksporty

src/hooks/
└── useUnifiedChat.ts          # Hook łączący logikę czatu
```

---

## Integracja z istniejącym kodem

### Aktualizacja CommunicationCenter

Zamiana obecnych zakładek na nowy zunifikowany widok:

```typescript
// src/components/communication/CommunicationCenter.tsx

export const CommunicationCenter = () => {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <MessageSquare className="h-5 w-5 text-primary" />
          Centrum Komunikacji
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* NOWY: Zunifikowany widget czatu */}
        <UnifiedChatWidget />
      </CardContent>
    </Card>
  );
};
```

### Zachowanie starego kodu

Stare komponenty (`RoleChatWidget`, `RoleChatInbox`, `PrivateChatWidget`) pozostają jako fallback i mogą być używane w innych miejscach aplikacji.

---

## Widoczność kanałów według roli

| Rola użytkownika | Widoczne kanały | Może wysyłać do |
|------------------|-----------------|-----------------|
| **Admin** | Wszyscy, Partnerzy, Specjaliści, Klienci | Wszystkie |
| **Partner** | Specjaliści, Klienci, Od Administratorów | Specjaliści, Klienci |
| **Specjalista** | Klienci, Od Administratorów, Od Partnerów | Klienci |
| **Klient** | Od Specjalistów, Od Partnerów, Od Administratorów | Brak (tylko odbiór) |

---

## Real-time i powiadomienia

System wykorzysta istniejącą infrastrukturę:

1. **Real-time wiadomości** - subskrypcja `role_chat_messages` (już w `useRoleChat`)
2. **Powiadomienia** - zapis do `user_notifications` z `target_role`
3. **NotificationBell** - automatycznie pokaże nowe wiadomości

---

## Zakres zmian (bez naruszenia istniejącej funkcjonalności)

| Co się zmienia | Wpływ na istniejący kod |
|----------------|-------------------------|
| Nowe komponenty w `unified-chat/` | Brak - nowe pliki |
| Nowy hook `useUnifiedChat` | Brak - nowy plik |
| Zmiana w `CommunicationCenter` | Podmiana contentu na nowy widget |
| Stare komponenty | Pozostają jako fallback |
| Tabele w bazie | Bez zmian - wykorzystujemy istniejące |
| RLS policies | Bez zmian |
| Powiadomienia | Bez zmian - wykorzystujemy istniejące |

---

## Podsumowanie

Plan zakłada stworzenie nowoczesnego interfejsu komunikatora wykorzystującego w pełni istniejącą infrastrukturę bazy danych i hooków. Nowy widget będzie:

- Wizualnie zgodny z referencją (2-kolumnowy layout)
- Obsługiwał role: Admin, Partner, Specjalista, Klient
- Kanał "Wszyscy" dla broadcastów
- Zintegrowany z systemem powiadomień
- Bez naruszenia działania innych modułów aplikacji

