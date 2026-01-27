

# Plan: Osobna Strona Wiadomości w Stylu WhatsApp

## Wizualizacja proponowanego rozwiązania

### Layout pełnoekranowy (widok desktop)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🌿 PURE LIFE                    🔔  🌍PL  ◐  [Akademia]  [Strona główna]  [→ Wyloguj się]          │
├───────────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│                                   │                                                                 │
│  ← Powrót do pulpitu              │                       Partnerzy                              🔍 │
│                                   ├─────────────────────────────────────────────────────────────────│
│  ┌─────────────────────────────┐  │                                                                 │
│  │ 🔍 Szukaj rozmów...         │  │                                                                 │
│  └─────────────────────────────┘  │     DK   Dawid Kowalczyk                        Dzisiaj 07:16  │
│                                   │          ┌──────────────────────────────────────┐               │
│  KANAŁY                           │          │  Cześć! Jak mogę pomóc?              │               │
│  ─────────────────────────────    │          └──────────────────────────────────────┘               │
│                                   │          👍 1                                                   │
│  ● Wszyscy               •        │                                                                 │
│  ● Partnerzy            ← ●2      │                                                                 │
│  ● Specjaliści                    │               ┌──────────────────────────────────────┐          │
│  ● Klienci                        │               │  Dzięki, wszystko jasne!             │  Ty      │
│                                   │               └──────────────────────────────────────┘          │
│  ─────────────────────────────    │                                                    Dzisiaj 07:20│
│                                   │                                                                 │
│  OSTATNIE ROZMOWY                 │                                                                 │
│  ─────────────────────────────    │                                                                 │
│                                   │                                                                 │
│  👤 Anna Nowak                    │                                                                 │
│     Dzięki za info!   • 2h temu   │                                                                 │
│                                   │                                                                 │
│  👤 Jan Kowalski                  │                                                                 │
│     OK, rozumiem      • wczoraj   │                                                                 │
│                                   │                                                                 │
│                                   │                                                                 │
│                                   │                                                                 │
│                                   │                                                                 │
│                                   ├─────────────────────────────────────────────────────────────────│
│                                   │                                                                 │
│                                   │  📎  😊  🎤   Wpisz wiadomość...                        ✈       │
│                                   │                                                                 │
└───────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### Layout mobilny (responsive)

```text
┌────────────────────────────┐          ┌────────────────────────────┐
│  ← Wiadomości         🔍   │          │  ← Partnerzy          🔍   │
├────────────────────────────┤          ├────────────────────────────┤
│                            │          │                            │
│  🔍 Szukaj rozmów...       │          │  DK  Dawid Kowalczyk       │
│                            │   TAP    │      ┌──────────────┐      │
│  KANAŁY                    │  ───→    │      │ Cześć! Jak   │      │
│  ● Wszyscy            •    │          │      │ mogę pomóc?  │      │
│  ● Partnerzy         ●2    │          │      └──────────────┘      │
│  ● Specjaliści             │          │      👍 1                  │
│  ● Klienci                 │          │                            │
│                            │          │      ┌──────────────┐ Ty   │
│  OSTATNIE ROZMOWY          │          │      │ Dzięki!      │      │
│                            │          │      └──────────────┘      │
│  👤 Anna Nowak             │          │                            │
│     Dzięki za info!        │          │                            │
│                            │          ├────────────────────────────┤
│  👤 Jan Kowalski           │          │ 📎 😊 🎤 Wpisz...     ✈    │
│     OK, rozumiem           │          └────────────────────────────┘
└────────────────────────────┘
     LISTA                                      CZAT
```

---

## Zakres zmian

### 1. Nowa strona: `/messages` (MessagesPage.tsx)

Pełnoekranowa strona komunikatora z:
- **Header**: Prosty pasek z przyciskiem "Powrót do pulpitu" i tytułem "Wiadomości"
- **Sidebar (320px)**: Lista kanałów + ostatnie rozmowy z podglądem ostatniej wiadomości
- **Chat window**: Okno rozmowy z wybranym kanałem
- **Responsywność**: Na mobile - przełączanie między widokiem listy a czatem

### 2. Struktura nowej strony

```typescript
// src/pages/MessagesPage.tsx

const MessagesPage = () => {
  const navigate = useNavigate();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  
  const {
    channels,
    selectedChannel,
    messages,
    loading,
    selectChannel,
    sendMessage,
  } = useUnifiedChat({ enableRealtime: true });

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mini header - tylko link powrotu */}
      <header className="h-14 border-b flex items-center px-4 bg-background/95 backdrop-blur">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Powrót do pulpitu
        </Button>
        <h1 className="ml-4 font-semibold">Wiadomości</h1>
      </header>
      
      {/* Main content - 2 columns on desktop, switchable on mobile */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - kanały i rozmowy */}
        <MessagesSidebar 
          channels={channels}
          selectedChannel={selectedChannel}
          onSelectChannel={(id) => {
            selectChannel(id);
            setMobileView('chat'); // Switch to chat on mobile
          }}
          className={cn(
            'w-80 border-r',
            // Mobile: show only when mobileView === 'list'
            'max-md:absolute max-md:inset-0 max-md:w-full max-md:z-10',
            mobileView !== 'list' && 'max-md:hidden'
          )}
        />
        
        {/* Chat window */}
        <div className={cn(
          'flex-1 flex flex-col',
          mobileView !== 'chat' && 'max-md:hidden'
        )}>
          {selectedChannel ? (
            <FullChatWindow
              channel={selectedChannel}
              messages={messages}
              loading={loading}
              onSend={sendMessage}
              onBack={() => setMobileView('list')} // Mobile back button
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
};
```

### 3. Rozszerzony sidebar z podglądem ostatniej wiadomości

```typescript
// Każdy kanał pokazuje:
// - Nazwę kanału/osoby
// - Podgląd ostatniej wiadomości (skrócony)
// - Czas ostatniej wiadomości
// - Badge z liczbą nieprzeczytanych

<div className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
  <Avatar className="h-12 w-12">
    <AvatarFallback>PA</AvatarFallback>
  </Avatar>
  <div className="flex-1 min-w-0">
    <div className="flex justify-between items-center">
      <span className="font-medium">Partnerzy</span>
      <span className="text-xs text-muted-foreground">07:16</span>
    </div>
    <p className="text-sm text-muted-foreground truncate">
      Dawid: Cześć! Jak mogę pomóc?
    </p>
  </div>
  {unreadCount > 0 && (
    <Badge variant="destructive">{unreadCount}</Badge>
  )}
</div>
```

### 4. Aktualizacja nawigacji w DashboardSidebar

Zmiana ścieżki dla "Czat" z `/my-account?tab=communication` na `/messages`:

```typescript
// src/components/dashboard/DashboardSidebar.tsx
{ 
  id: 'chat', 
  icon: MessageSquare, 
  labelKey: 'dashboard.menu.chat', 
  path: '/messages',  // ← ZMIANA: osobna strona zamiast zakładki
},
```

### 5. Nowa trasa w App.tsx

```typescript
// src/App.tsx
const MessagesPage = lazyWithRetry(() => import("./pages/MessagesPage"));

// W Routes:
<Route path="/messages" element={<MessagesPage />} />
```

---

## Struktura plików

```text
src/pages/
└── MessagesPage.tsx              # NOWY: Pełnoekranowa strona komunikatora

src/components/messages/          # NOWY folder
├── MessagesSidebar.tsx           # Rozszerzony sidebar z podglądami
├── MessagesHeader.tsx            # Mini header z powrotem
├── FullChatWindow.tsx            # Pełnoekranowe okno czatu
├── ChannelListItem.tsx           # Element listy z podglądem
└── MobileBackButton.tsx          # Przycisk powrotu na mobile
```

---

## Sekcja techniczna

### Komponenty do utworzenia:

| Komponent | Opis |
|-----------|------|
| `MessagesPage.tsx` | Główna strona `/messages` z pełnoekranowym layoutem |
| `MessagesSidebar.tsx` | Sidebar z kanałami i podglądem ostatnich wiadomości |
| `FullChatWindow.tsx` | Okno czatu z przyciskiem powrotu na mobile |
| `ChannelListItem.tsx` | Element listy kanału z avatar, podglądem i czasem |

### Modyfikacje istniejących plików:

| Plik | Zmiana |
|------|--------|
| `src/App.tsx` | Dodanie trasy `/messages` |
| `src/components/dashboard/DashboardSidebar.tsx` | Zmiana path dla "Czat" na `/messages` |

### Responsywność:

- **Desktop (>768px)**: 2 kolumny obok siebie (sidebar 320px + chat flex-1)
- **Mobile (<768px)**: Przełączanie widoków list ↔ chat
- **Animacje**: Slide transition przy zmianie widoku na mobile

### Integracja z istniejącym kodem:

- Wykorzystanie `useUnifiedChat` hook bez zmian
- Wykorzystanie istniejących komponentów: `MessageBubble`, `MessageInput`
- Real-time i powiadomienia działają bez zmian
- `CommunicationCenter` w "Moje konto" pozostaje jako fallback

---

## Porównanie z obecnym rozwiązaniem

| Aspekt | Obecne (zakładka) | Nowe (osobna strona) |
|--------|-------------------|---------------------|
| Lokalizacja | `/my-account?tab=communication` | `/messages` |
| Wysokość | 600px (widget) | 100vh (pełny ekran) |
| Sidebar | Minimalistyczny | Rozszerzony z podglądem wiadomości |
| Mobile | Brak dedykowanego UX | Przełączanie list/chat |
| Nawigacja | Przez "Moje konto" | Bezpośredni link w sidebar |
| Styl | Widget osadzony | Samodzielna aplikacja jak WhatsApp |

---

## Zachowana funkcjonalność

- ✅ Role-based channels (Admin, Partner, Specjalista, Klient)
- ✅ Hierarchia uprawnień (kto może do kogo pisać)
- ✅ Real-time aktualizacje
- ✅ Powiadomienia z `user_notifications`
- ✅ Istniejący `useUnifiedChat` hook
- ✅ Stary `CommunicationCenter` pozostaje (backward compatibility)

