
## Naprawa: badge nieprzeczytanych wiadomosci czatu w webinarze

### Problem

Komponent `MeetingChat` jest renderowany tylko gdy `isChatOpen === true` (linia 1753 w VideoRoom.tsx):

```text
{isChatOpen && (user || guestMode) && (
  <MeetingChat ... onNewMessage={handleNewChatMessage} />
)}
```

Subskrypcja realtime na nowe wiadomosci (`supabase.channel`) zyje wewnatrz `MeetingChat`. Gdy czat jest zamkniety, komponent nie istnieje, subskrypcja nie istnieje, `onNewMessage` nigdy nie jest wywolywane -- badge zawsze pokazuje 0.

### Rozwiazanie

Wyniesc subskrypcje realtime z `MeetingChat` do `VideoRoom.tsx`, aby dzialala niezaleznie od tego czy panel czatu jest otwarty.

### Zmiany

**Plik: `src/components/meeting/VideoRoom.tsx`**

1. Dodac nowy `useEffect` z subskrypcja na `meeting_chat_messages` (INSERT, filter `room_id`), ktory:
   - Sprawdza czy wiadomosc nie jest od biezacego uzytkownika (porownanie `user_id` / `guest_token_id`)
   - Jesli czat jest zamkniety (`isChatOpenRef`), inkrementuje `unreadChatCount`
   - Uzyc `useRef` dla `isChatOpen` aby uniknac problemu stale closure w callbacku subskrypcji

2. Dodac `isChatOpenRef = useRef(isChatOpen)` synchronizowany przez `useEffect`:
   ```text
   const isChatOpenRef = useRef(isChatOpen);
   useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);
   ```

3. Nowy useEffect subskrypcji (obok istniejacego kodu):
   ```text
   useEffect(() => {
     const channel = supabase
       .channel(`meeting-chat-unread:${roomId}`)
       .on('postgres_changes', {
         event: 'INSERT',
         schema: 'public',
         table: 'meeting_chat_messages',
         filter: `room_id=eq.${roomId}`,
       }, (payload) => {
         const msg = payload.new;
         const isOwn = guestTokenId
           ? msg.guest_token_id === guestTokenId
           : msg.user_id === user?.id;
         if (!isOwn && !isChatOpenRef.current) {
           setUnreadChatCount(prev => prev + 1);
         }
       })
       .subscribe();
     return () => { supabase.removeChannel(channel); };
   }, [roomId, user?.id, guestTokenId]);
   ```

4. W `handleToggleChat` -- logika zerowania juz istnieje (linia 1592), wiec wystarczy zachowac obecne zachowanie.

**Plik: `src/components/meeting/MeetingChat.tsx`**

Bez zmian -- `onNewMessage` moze zostac jako dodatkowe zabezpieczenie (gdy czat jest otwarty i wiadomosc przyjdzie zanim subskrypcja z VideoRoom ja przetworzy), ale glowna logika nieprzeczytanych bedzie w VideoRoom.

### Podsumowanie

| Plik | Zmiana |
|------|--------|
| `VideoRoom.tsx` | Nowy useEffect z subskrypcja realtime na nowe wiadomosci czatu |
| `VideoRoom.tsx` | Nowy ref `isChatOpenRef` do sledzenia stanu panelu |

Jedna zmiana w jednym pliku, minimalne ryzyko regresji. Subskrypcja zyje przez caly czas trwania spotkania niezaleznie od widocznosci panelu czatu.
