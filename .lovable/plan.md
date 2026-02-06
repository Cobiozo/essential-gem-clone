
# Plan naprawy: Przeciążenia, wycieki pamięci i zapętlenia

## Podsumowanie zidentyfikowanych problemów

| Priorytet | Problem | Lokalizacja | Wpływ |
|-----------|---------|-------------|-------|
| 🔴 KRYTYCZNY | Zapętlenie subskrypcji Realtime | `useUnifiedChat.ts` | Restart WebSocket przy każdej wiadomości |
| 🔴 KRYTYCZNY | Brak filtrów SQL w subskrypcjach | `useUnifiedChat.ts`, `useRoleChat.ts`, `usePrivateChat.ts` | Broadcast do wszystkich klientów |
| 🔴 KRYTYCZNY | Zduplikowana subskrypcja | `MessagesPage.tsx` | Podwójne subskrypcje Realtime |
| 🟠 WYSOKI | Wyciek pamięci - setTimeout bez cleanup | `NewsTicker.tsx` | Memory leak przy odmontowaniu |
| 🟠 WYSOKI | Przeciążenie listenerów | `TrainingModule.tsx` | 60 re-rejestracji/min dla `beforeunload` |
| 🟠 WYSOKI | Brak optimistic updates | `useUnifiedChat.ts`, `usePrivateChat.ts` | Re-fetch całej historii po wysłaniu |
| 🟡 ŚREDNI | Niestabilne zależności useEffect | `SecureMedia.tsx` | Częste remount listenerów wideo |

---

## Faza 1: Naprawa zapętlenia w useUnifiedChat (KRYTYCZNE)

### Problem
Zależności w `useEffect` subskrypcji (linia 752) zawierają `fetchMessages` i `fetchUnreadCounts`. 
Nowa wiadomość → `fetchUnreadCounts()` → zmiana `unreadCounts` → zmiana `channels` (useMemo) → zmiana `fetchMessages` (useCallback z `channels` w zależnościach) → restart useEffect → ponowna subskrypcja.

### Rozwiązanie
1. Użyć `useRef` dla funkcji fetch zamiast przekazywać je jako zależności
2. Dodać filtr SQL do subskrypcji
3. Stabilizować funkcje przez usunięcie zbędnych zależności

```typescript
// src/hooks/useUnifiedChat.ts

// Dodać refs dla stabilności
const fetchMessagesRef = useRef(fetchMessages);
const fetchUnreadCountsRef = useRef(fetchUnreadCounts);

useEffect(() => {
  fetchMessagesRef.current = fetchMessages;
}, [fetchMessages]);

useEffect(() => {
  fetchUnreadCountsRef.current = fetchUnreadCounts;
}, [fetchUnreadCounts]);

// Zmienić subskrypcję (linie 717-752)
useEffect(() => {
  if (!user || !enableRealtime) return;

  const channel = supabase
    .channel(`unified-chat-${user.id}`)  // Usunąć Date.now() - powoduje ciągłe resubskrybowanie
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'role_chat_messages',
        filter: `or(recipient_id.eq.${user.id},and(recipient_id.is.null,recipient_role.eq.${currentRole}))`,  // DODAĆ FILTR
      },
      (payload) => {
        const newMessage = payload.new as any;
        
        // Użyć refs zamiast funkcji z zależności
        fetchMessagesRef.current?.(selectedChannelId);
        fetchUnreadCountsRef.current?.();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user, enableRealtime, currentRole, selectedChannelId]);  // Usunąć fetchMessages i fetchUnreadCounts
```

---

## Faza 2: Usunięcie zduplikowanej subskrypcji z MessagesPage

### Problem
`MessagesPage.tsx` (linie 48-78) tworzy własną subskrypcję Realtime, podczas gdy `useUnifiedChat` (z `enableRealtime: true`) już to robi.

### Rozwiązanie
Usunąć zduplikowaną subskrypcję z `MessagesPage.tsx`:

```typescript
// src/pages/MessagesPage.tsx
// USUNĄĆ cały useEffect z liniami 48-78

// Zamiast:
useEffect(() => {
  if (!user) return;
  const channel = supabase
    .channel(`chat-notifications-${user.id}`)
    // ... subskrypcja
}, [user, permission, showNotification]);

// Powiadomienia przeglądarkowe obsłużyć w useUnifiedChat lub osobnym hooku
```

---

## Faza 3: Naprawa useRoleChat i usePrivateChat

### Problem
Brak filtrów SQL w subskrypcjach - każda wiadomość jest broadcastowana do wszystkich klientów.

### Rozwiązanie dla useRoleChat.ts (linie 164-201):

```typescript
// src/hooks/useRoleChat.ts
useEffect(() => {
  if (!user || !enableRealtime) return;

  const channel = supabase
    .channel(`role-chat-${user.id}`)  // Usunąć Date.now()
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'role_chat_messages',
        filter: `or(recipient_id.eq.${user.id},and(recipient_id.is.null,recipient_role.eq.${userRole}))`,  // DODAĆ FILTR
      },
      (payload) => {
        // ... handler
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user, userRole, enableRealtime]);  // Minimalne zależności
```

### Rozwiązanie dla usePrivateChat.ts (linie 590-641):

```typescript
// src/hooks/usePrivateChat.ts
// Dodać ref dla stabilności
const fetchThreadsRef = useRef(fetchThreads);
const markAsReadRef = useRef(markAsRead);

useEffect(() => {
  fetchThreadsRef.current = fetchThreads;
}, [fetchThreads]);

useEffect(() => {
  markAsReadRef.current = markAsRead;
}, [markAsRead]);

// Zmienić subskrypcję
useEffect(() => {
  if (!user || !enableRealtime) return;

  // Pobierz ID wątków użytkownika tylko raz
  const userThreadIds = threads.map(t => t.id);
  if (userThreadIds.length === 0) return;

  const channel = supabase
    .channel(`private-chat-${user.id}`)  // Usunąć Date.now()
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'private_chat_messages',
        filter: `thread_id=in.(${userThreadIds.join(',')})`,  // DODAĆ FILTR - tylko wątki użytkownika
      },
      async (payload) => {
        const newMessage = payload.new as PrivateChatMessage;
        
        if (selectedThread && newMessage.thread_id === selectedThread.id) {
          // Optimistic update zamiast fetch
          setMessages(prev => [...prev, newMessage]);
        }
        
        fetchThreadsRef.current?.();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user, enableRealtime, threads.length, selectedThread?.id]);  // Minimalne zależności
```

---

## Faza 4: Naprawa wycieku pamięci w NewsTicker

### Problem
`setTimeout` wewnątrz `setInterval` nie jest czyszczony przy odmontowaniu komponentu (linie 50-53).

### Rozwiązanie:

```typescript
// src/components/news-ticker/NewsTicker.tsx

const RotatingContent: React.FC<{ items: TickerItem[]; interval: number }> = ({ items, interval }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);  // DODAĆ REF

  useEffect(() => {
    if (items.length <= 1) return;

    const timer = setInterval(() => {
      setIsVisible(false);
      
      // Czyść poprzedni timeout jeśli istnieje
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setIsVisible(true);
      }, 200);
    }, interval * 1000);

    return () => {
      clearInterval(timer);
      // DODAĆ czyszczenie timeout przy odmontowaniu
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [items.length, interval]);

  // ... reszta komponentu
};
```

---

## Faza 5: Naprawa przeciążenia listenerów w TrainingModule

### Problem
`beforeunload` listener jest rejestrowany z zależnością `textLessonTime`, która zmienia się co sekundę.

### Rozwiązanie:
Użyć ref do przechowywania aktualnych wartości zamiast przekazywać je jako zależności:

```typescript
// src/pages/TrainingModule.tsx

// Dodać refs dla wartości używanych w beforeunload
const textLessonTimeRef = useRef(textLessonTime);
const currentLessonIndexRef = useRef(currentLessonIndex);
const lessonsRef = useRef(lessons);

// Synchronizować refs (bez wyzwalania efektu)
useEffect(() => {
  textLessonTimeRef.current = textLessonTime;
}, [textLessonTime]);

useEffect(() => {
  currentLessonIndexRef.current = currentLessonIndex;
}, [currentLessonIndex]);

useEffect(() => {
  lessonsRef.current = lessons;
}, [lessons]);

// Zmienić useEffect beforeunload (linie 422-491)
useEffect(() => {
  const handleBeforeUnload = async () => {
    const currentLesson = lessonsRef.current[currentLessonIndexRef.current];
    if (!user || !currentLesson) return;

    // PROTECTION: Never overwrite completed lessons
    const wasAlreadyCompleted = progressRef.current[currentLesson.id]?.is_completed;
    if (wasAlreadyCompleted) return;

    const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
    const currentVideoPos = videoPositionRef.current;
    const currentVideoDuration = videoDurationRef.current;
    const effectiveTime = hasVideo ? Math.floor(currentVideoPos) : textLessonTimeRef.current;
    
    // ... reszta logiki zapisu
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [user]);  // TYLKO user jako zależność - stabilny
```

---

## Faza 6: Dodanie optimistic updates

### Problem
Po wysłaniu wiadomości następuje pełny refetch historii zamiast lokalnej aktualizacji.

### Rozwiązanie dla useUnifiedChat (sendDirectMessage):

```typescript
// src/hooks/useUnifiedChat.ts - linia 256

// Zamiast:
await fetchDirectMessages(recipientId);

// Użyć optimistic update:
const optimisticMessage: UnifiedMessage = {
  id: crypto.randomUUID(),  // Tymczasowe ID
  channelId: null,
  senderId: user.id,
  senderName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
  senderAvatar: profile.avatar_url,
  senderInitials: `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`,
  senderRole: currentRole,
  content,
  createdAt: new Date().toISOString(),
  isOwn: true,
  isRead: true,
  messageType,
  attachmentUrl,
  attachmentName,
};

setMessages(prev => [...prev, optimisticMessage]);

// Fetch w tle dla synchronizacji ID z bazy (bez blokowania UI)
fetchDirectMessages(recipientId);
```

---

## Faza 7: Stabilizacja SecureMedia

### Problem
Duża liczba zależności w useEffect powoduje częste przeładowywanie listenerów wideo.

### Rozwiązanie:
Wydzielić logikę do mniejszych, wyspecjalizowanych hooków:

```typescript
// src/components/SecureMedia.tsx

// 1. Wydzielić logikę URL do osobnego hooka
const useSecureUrl = (mediaUrl: string) => {
  // ... logika pobierania signed URL
};

// 2. Wydzielić logikę buforowania do osobnego hooka
const useVideoBuffering = (videoElement: HTMLVideoElement | null) => {
  // ... logika smart buffering
};

// 3. Użyć stabilnych refs dla callbacków
const handlersRef = useRef({
  onTimeUpdate: onTimeUpdate,
  onPlayStateChange: onPlayStateChange,
  onDurationChange: onDurationChange,
});

useEffect(() => {
  handlersRef.current = { onTimeUpdate, onPlayStateChange, onDurationChange };
}, [onTimeUpdate, onPlayStateChange, onDurationChange]);

// 4. Jeden główny useEffect dla listenerów z minimalnymi zależnościami
useEffect(() => {
  if (!videoElement) return;
  
  const handlers = {
    timeupdate: () => handlersRef.current.onTimeUpdate?.(videoElement.currentTime),
    // ... pozostałe handlery
  };
  
  Object.entries(handlers).forEach(([event, handler]) => {
    videoElement.addEventListener(event, handler);
  });
  
  return () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      videoElement.removeEventListener(event, handler);
    });
  };
}, [videoElement]);  // TYLKO videoElement jako zależność
```

---

## Podsumowanie zmian

| Plik | Zmiana | Wpływ |
|------|--------|-------|
| `src/hooks/useUnifiedChat.ts` | Dodanie filtrów SQL, stabilizacja refs, usunięcie Date.now() | -90% ruchu WebSocket |
| `src/hooks/useRoleChat.ts` | Dodanie filtrów SQL, minimalne zależności | -90% ruchu WebSocket |
| `src/hooks/usePrivateChat.ts` | Dodanie filtrów SQL, optimistic updates, refs | -90% ruchu WebSocket |
| `src/pages/MessagesPage.tsx` | Usunięcie zduplikowanej subskrypcji | -50% subskrypcji |
| `src/components/news-ticker/NewsTicker.tsx` | Czyszczenie setTimeout w cleanup | Eliminacja memory leak |
| `src/pages/TrainingModule.tsx` | Użycie refs zamiast zależności w beforeunload | -99% re-rejestracji |
| `src/components/SecureMedia.tsx` | Wydzielenie hooków, stabilne refs | -80% remount listenerów |

---

## Oczekiwane rezultaty

1. **Redukcja ruchu sieciowego** o ~90% - filtry SQL eliminują broadcast
2. **Eliminacja memory leaks** - prawidłowe czyszczenie timerów
3. **Stabilne WebSocket** - brak ciągłych resubskrypcji
4. **Lepsza responsywność** - optimistic updates zamiast refetch
5. **Mniejsze zużycie CPU** - mniej re-renderów i przeładowań listenerów
