

# Plan: Sekcja "Członkowie zespołu" w komunikatorze

## Cel

Dodanie trzeciej grupy w sidebarze komunikatora o nazwie "Członkowie zespołu" z rozwijaną listą, która zawiera:

1. **Upline (opiekun)** - wyraźnie oznaczony jako "Twój opiekun" - osoba będąca w strukturze powyżej aktualnego użytkownika
2. **Członkowie struktury (downline)** - użytkownicy wszystkich ról (partner, specjalista, klient) będący w strukturze organizacyjnej danego partnera

## Źródła danych

### Upline (opiekun)
Pobierany z `profiles` przez `upline_eq_id` aktualnego użytkownika - ten sam mechanizm co w `useOrganizationTree`.

### Downline (struktura)
Pobierany przez istniejącą funkcję RPC `get_organization_tree` z `profile.eq_id` jako root - zwraca wszystkich użytkowników w strukturze poniżej partnera.

---

## Architektura rozwiązania

```text
┌───────────────────────────────────┐
│  Konwersacje                      │
│  ┌─────────────────────────────┐  │
│  │ 🔍 Szukaj rozmów...         │  │
│  └─────────────────────────────┘  │
│                                   │
│  KANAŁY                           │
│  ● Specjaliści                    │
│  ● Klienci                        │
│                                   │
│  CZŁONKOWIE ZESPOŁU          ▼   │ ← nowa rozwijana sekcja
│  ┌─────────────────────────────┐  │
│  │ 👤 Jan Kowalski (Opiekun)   │  │ ← upline wyróżniony
│  │ ─────────────────────────   │  │
│  │ 👤 Anna Nowak • Partner     │  │ ← członkowie struktury
│  │ 👤 Piotr Wiśniewski • Spec  │  │
│  │ 👤 Maria Zielińska • Klient │  │
│  └─────────────────────────────┘  │
│                                   │
│  ODEBRANE                         │
│  ● Od Administratorów             │
└───────────────────────────────────┘
```

---

## Zakres zmian

### 1. Rozszerzenie typu `UnifiedChannel` w `useUnifiedChat.ts`

Dodanie nowego typu kanału `direct` dla wiadomości bezpośrednich 1:1:

```typescript
export interface UnifiedChannel {
  id: string;
  type: 'role' | 'broadcast' | 'private' | 'direct';  // + 'direct'
  name: string;
  targetRole: string | null;
  targetUserId: string | null;  // NOWE: dla wiadomości 1:1
  icon: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  canSend: boolean;
  canReceive: boolean;
  isIncoming: boolean;
  isUpline?: boolean;  // NOWE: wyróżnienie opiekuna
}
```

### 2. Nowy interfejs dla członków zespołu

```typescript
export interface TeamMemberChannel {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  eqId: string | null;
  avatarUrl: string | null;
  isUpline: boolean;
  level: number;
}
```

### 3. Rozszerzenie `useUnifiedChat` o pobieranie struktury

Dodanie funkcji do pobierania członków zespołu (upline + downline):

```typescript
// Pobierz upline (opiekuna)
const fetchUpline = async () => {
  if (!profile?.upline_eq_id) return null;
  
  const { data } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, eq_id, role, avatar_url')
    .eq('eq_id', profile.upline_eq_id)
    .eq('is_active', true)
    .single();
    
  return data;
};

// Pobierz downline (struktura)
const fetchDownline = async () => {
  if (!profile?.eq_id) return [];
  
  const { data } = await supabase.rpc('get_organization_tree', {
    p_root_eq_id: profile.eq_id,
    p_max_depth: 10
  });
  
  // Filtruj tylko członków poniżej roota (level > 0)
  return (data || []).filter(m => m.level > 0);
};
```

### 4. Nowy komponent `TeamMembersSection`

Rozwijana sekcja w sidebarze:

```typescript
// src/components/messages/TeamMembersSection.tsx

interface TeamMembersSectionProps {
  upline: TeamMemberChannel | null;
  members: TeamMemberChannel[];
  selectedUserId: string | null;
  onSelectMember: (userId: string) => void;
  searchQuery: string;
}

export const TeamMembersSection = ({
  upline,
  members,
  selectedUserId,
  onSelectMember,
  searchQuery,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Filtruj po wyszukiwaniu
  const filteredMembers = members.filter(m => 
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="...">
        <span>CZŁONKOWIE ZESPOŁU</span>
        <ChevronDown className={cn('...', isExpanded && 'rotate-180')} />
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        {/* Upline - wyróżniony */}
        {upline && (
          <>
            <TeamMemberItem 
              member={upline}
              isSelected={selectedUserId === upline.userId}
              onClick={() => onSelectMember(upline.userId)}
              badge="Opiekun"
            />
            <Separator className="my-1" />
          </>
        )}
        
        {/* Członkowie struktury */}
        {filteredMembers.map(member => (
          <TeamMemberItem 
            key={member.userId}
            member={member}
            isSelected={selectedUserId === member.userId}
            onClick={() => onSelectMember(member.userId)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
```

### 5. Komponent pojedynczego członka `TeamMemberItem`

```typescript
// src/components/messages/TeamMemberItem.tsx

const ROLE_LABELS = {
  partner: 'Partner',
  specjalista: 'Specjalista',
  client: 'Klient',
};

export const TeamMemberItem = ({ member, isSelected, onClick, badge }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
      isSelected 
        ? 'bg-primary/10 border-l-2 border-primary' 
        : 'hover:bg-muted/50'
    )}
  >
    <Avatar className="h-9 w-9">
      <AvatarImage src={member.avatarUrl} />
      <AvatarFallback>
        {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium truncate">
          {member.firstName} {member.lastName}
        </span>
        {badge && (
          <Badge variant="secondary" className="text-xs">
            {badge}
          </Badge>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {ROLE_LABELS[member.role] || member.role}
        {member.eqId && ` • ${member.eqId}`}
      </span>
    </div>
  </button>
);
```

### 6. Modyfikacja `MessagesSidebar.tsx`

Dodanie sekcji "Członkowie zespołu" między "Kanały" a "Odebrane":

```typescript
// MessagesSidebar.tsx

export const MessagesSidebar = ({
  channels,
  selectedChannel,
  onSelectChannel,
  // NOWE propsy:
  teamMembers,
  upline,
  selectedDirectUserId,
  onSelectDirectMember,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="flex flex-col">
      {/* Header + Search */}
      
      <ScrollArea className="flex-1">
        {/* Kanały (outgoing) */}
        {outgoingChannels.length > 0 && (
          <div className="mb-4">
            <SectionHeader>Kanały</SectionHeader>
            {outgoingChannels.map(channel => (
              <ChannelListItem ... />
            ))}
          </div>
        )}
        
        {/* NOWA SEKCJA: Członkowie zespołu */}
        {(upline || teamMembers.length > 0) && (
          <TeamMembersSection
            upline={upline}
            members={teamMembers}
            selectedUserId={selectedDirectUserId}
            onSelectMember={onSelectDirectMember}
            searchQuery={searchQuery}
          />
        )}
        
        {/* Odebrane (incoming) */}
        {incomingChannels.length > 0 && (
          <div>
            <SectionHeader>Odebrane</SectionHeader>
            {incomingChannels.map(channel => (
              <ChannelListItem ... />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
```

### 7. Obsługa wiadomości bezpośrednich 1:1

Rozszerzenie `useUnifiedChat` o wysyłanie do konkretnego użytkownika:

```typescript
// W useUnifiedChat.ts

const sendDirectMessage = async (recipientId: string, content: string) => {
  // Użyj istniejącego systemu private_chat lub role_chat_messages z recipient_id
  const { error } = await supabase
    .from('role_chat_messages')
    .insert({
      sender_id: user.id,
      sender_role: currentRole,
      recipient_role: recipientRole, // rola odbiorcy
      recipient_id: recipientId,     // konkretny user
      content,
    });
    
  // Wyślij powiadomienie
  await supabase.from('user_notifications').insert({
    user_id: recipientId,
    notification_type: 'direct_message',
    title: `Wiadomość od ${senderName}`,
    message: content.substring(0, 100),
    link: '/messages',
    sender_id: user.id,
  });
};

const fetchDirectMessages = async (otherUserId: string) => {
  // Pobierz wiadomości gdzie sender/recipient to current user i otherUser
  const { data } = await supabase
    .from('role_chat_messages')
    .select('*')
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),` +
      `and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
    )
    .order('created_at', { ascending: true });
    
  return data;
};
```

---

## Widoczność funkcjonalności według roli

| Rola | Upline (opiekun) | Downline (struktura) |
|------|------------------|----------------------|
| **Admin** | Nie | Widzi wszystkich użytkowników (opcjonalnie) |
| **Partner** | Tak - jego opiekun | Wszyscy w jego strukturze |
| **Specjalista** | Tak - jego opiekun | Członkowie jego zespołu (jeśli ma) |
| **Klient** | Tak - jego opiekun | Brak (klient nie ma struktury) |

---

## Struktura nowych/modyfikowanych plików

```text
src/hooks/
└── useUnifiedChat.ts               # Rozszerzenie o teamMembers i directMessages

src/components/messages/
├── MessagesSidebar.tsx             # Dodanie sekcji TeamMembersSection
├── TeamMembersSection.tsx          # NOWY: rozwijana lista członków
├── TeamMemberItem.tsx              # NOWY: pojedynczy członek
├── ChannelListItem.tsx             # Bez zmian
├── FullChatWindow.tsx              # Dostosowanie do direct messages
└── index.ts                        # Eksport nowych komponentów

src/pages/
└── MessagesPage.tsx                # Przekazanie nowych propsów do sidebar
```

---

## Sekcja techniczna: Przepływ danych

1. **Inicjalizacja**: `useUnifiedChat` wywołuje `fetchTeamMembers()` przy mount
2. **Pobieranie upline**: Query do `profiles` po `upline_eq_id`
3. **Pobieranie downline**: RPC `get_organization_tree` z `eq_id` użytkownika
4. **Transformacja**: Mapowanie na `TeamMemberChannel[]`
5. **Renderowanie**: `TeamMembersSection` wyświetla listę z rozróżnieniem upline
6. **Wybór członka**: Ustawia `selectedDirectUserId` i przełącza widok czatu
7. **Wiadomości**: Pobiera/wysyła przez `role_chat_messages` z `recipient_id`

---

## Zachowana funkcjonalność

- Istniejące kanały role-based (Specjaliści, Klienci) działają bez zmian
- Powiadomienia real-time pozostają aktywne
- Hierarchia ról nadal kontroluje kto może do kogo pisać
- `private_chat_*` system pozostaje dla grup i specjalistów

