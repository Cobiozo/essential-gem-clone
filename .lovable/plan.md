
## Pelny audyt WebRTC -- zidentyfikowane problemy i plan naprawy

### Zidentyfikowane problemy

---

### 1. KRYTYCZNY: Brak wznawiania polaczenia po wyjsciu i powrocie (visibilitychange)

**Problem**: Gdy uzytkownik przechodzi na inna karte/aplikacje i wraca, polaczenia PeerJS moga byc w stanie "disconnected" lub "failed". Obecny kod probuje `peer.reconnect()` tylko na zdarzeniu `disconnected` PeerJS (linia 532-538), ale:
- Nie sprawdza stanu polaczen (`MediaConnection`) po powrocie
- Nie restartuje polaczen ktore sa w stanie "failed" lub "closed"
- Nie synchronizuje listy uczestnikow z baza danych po powrocie

**Rozwiazanie**: Dodac handler `visibilitychange` ktory po powrocie na karte:
1. Sprawdza `peer.disconnected` i wywoluje `reconnect()`
2. Iteruje po `connectionsRef` i sprawdza `peerConnection.iceConnectionState` -- jesli "failed"/"disconnected"/"closed" to zamyka stare polaczenie i nawiazuje nowe
3. Synchronizuje liste uczestnikow z bazy (`meeting_room_participants` where `is_active = true`) i nawiazuje polaczenia z brakujacymi peerami

**Plik**: `src/components/meeting/VideoRoom.tsx` -- nowy `useEffect` z handlerem `visibilitychange`

---

### 2. KRYTYCZNY: Widma uczestnikow po wyjsciu (ghost participants)

**Problem**: Gdy uczestnik zamknie karte/przegladarke:
- `beforeunload` uzywa `navigator.sendBeacon` ale z blednym naglowkiem -- sendBeacon nie obsluguje ustawiania naglowkow autoryzacji, wiec update w bazie moze sie nie wykonac (linia 306-308)
- Broadcast `peer-left` moze nie dojsc jesli Realtime channel juz jest zamkniety
- Nie ma mechanizmu cyklicznego czyszczenia widm z bazy

**Rozwiazanie**:
- **sendBeacon fix**: Dodac naglowki Supabase (apikey, Authorization) jako URL params lub uzyc Supabase REST z `Prefer: return=minimal` header w Blob
- **Heartbeat**: Dodac cykliczny (co 30s) update `last_seen_at` w `meeting_room_participants` + timestamp kolumna
- **Synchronizacja**: Przy `peer-joined` i przy powrocie z tla, sprawdzac `meeting_room_participants` i usuwac z lokalnej listy uczestnikow tych ktorych `is_active = false` lub `last_seen_at` jest starszy niz 60s
- **Cleanup na reconnect**: Przy detekcji polaczenia ktore sie nie odpowiada (timeout 15s juz istnieje) -- dodac tez update `is_active = false` w bazie

**Pliki**: 
- `src/components/meeting/VideoRoom.tsx` -- heartbeat interval, synchronizacja listy, fix sendBeacon

---

### 3. WAZNY: Czat nie dziala poprawnie

**Problem**: Czat opiera sie na `postgres_changes` (Realtime) do subskrypcji nowych wiadomosci. Potencjalne problemy:
- Brak reconnectu kanalu czatu po utracie polaczenia Realtime
- Wiadomosci gosci sa wstawiane z `guest_token_id` zamiast `user_id`, ale filtrowanie prywatnych wiadomosci (linia 162-165) porownuje `msg.user_id === userId` -- jesli goscowi jest przypisany `guestTokenId` jako `userId` prop (linia 813), ale w bazie jest w kolumnie `guest_token_id`, to filtrowanie widocznosci moze byc bledne
- Brak deduplication na poziomie optymistycznym (uzytkownik nie widzi swojej wiadomosci natychmiast -- musi czekac na INSERT z bazy)

**Rozwiazanie**:
- Dodac optimistic update: po wyslaniu wiadomosci, natychmiast dodac ja do `messages` state z tymczasowym ID
- Naprawic filtrowanie widocznosci dla gosci -- uwzglednic `guest_token_id` w porownaniu
- Dodac error boundary / reconnect logike dla kanalu Realtime czatu

**Plik**: `src/components/meeting/MeetingChat.tsx`

---

### 4. WAZNY: Polaczenie P2P gubi sie bez proby ponownego nawiazania

**Problem**: `handleCall` monitoruje ICE state i przy "failed" wywoluje `pc.restartIce()` (linia 584-586), ale:
- `restartIce()` samo w sobie nie wystarczy -- wymaga renegotiacji (nowego offer/answer), czego PeerJS nie robi automatycznie
- Nie ma fallbacku: jesli restartIce nie pomoze, polaczenie jest martwe ale uczestnik nadal widnieje na liscie
- Brak timeout na "disconnected" ICE state (moze trwac dlugo bez przeejscia do "failed")

**Rozwiazanie**:
- Po "failed" ICE state: zamknac stare polaczenie, usunac z `connectionsRef`, i nawiazac nowe przez `callPeer()` z opoznieniem 2s
- Po "disconnected" ICE state trwajacym > 10s: traktowac jak "failed"
- Dodac maksymalna liczbe prob reconnect (3x) zeby uniknac nieskonczonej petli

**Plik**: `src/components/meeting/VideoRoom.tsx` -- rozbudowa `handleCall` i `oniceconnectionstatechange`

---

### 5. SREDNI: Brak synchronizacji stanu mute/camera miedzy uczestnikami

**Problem**: Panel uczestnikow (`ParticipantsPanel`) wyswietla `isMuted` i `isCameraOff` ale te wartosci nie sa synchronizowane miedzy peerami. `isMuted` na liscie `participants` nigdy nie jest aktualizowane -- jest `undefined` po initial handshake.

**Rozwiazanie**: Broadcastowac zmiany mute/camera przez Realtime channel:
- Przy `handleToggleMute` i `handleToggleCamera`: wyslac broadcast `media-state-changed` z `{ peerId, isMuted, isCameraOff }`
- Subskrybowac to zdarzenie i aktualizowac `participants` state

**Plik**: `src/components/meeting/VideoRoom.tsx`

---

### 6. SREDNI: Memory leak w AudioContext (VideoGrid)

**Problem**: `useActiveSpeakerDetection` tworzy `AudioContext` i `AnalyserNode` dla kazdego uczestnika. Przy zmianie uczestnikow:
- Stare source/analyser sa usuwane, ale `MediaStreamAudioSourceNode.disconnect()` nie zwalnia docelowego strumienia
- `AudioContext` nigdy nie jest zamykany az do odmontowania calego komponentu

**Rozwiazanie**: Dodac czyszczenie `AudioContext` przy duzej liczbie zmian lub zamykanie po odmontowaniu (juz istnieje w liniach 272-282, ale warto dodac limit na ilosc kontekstow)

---

### 7. DROBNY: Brak obslugi host_user_id w sprawdzaniu uczestnikow przy hostUserId

**Problem**: `MeetingRoomPage` pobiera `host_user_id` z `events`, ale kolumna `host_user_id` moze byc pusta -- fallback na `created_by` (linia 119). To jest poprawne ale nie jest propagowane do czyszczenia uczestnikow.

---

### Plan implementacji (priorytet)

#### Faza 1: Naprawa krytycznych bledow
1. **Heartbeat + ghost cleanup** (VideoRoom.tsx)
   - Dodac interval co 30s aktualizujacy `last_seen_at` w `meeting_room_participants`
   - Przy synchronizacji listy filtrowac uczestnikow na podstawie `last_seen_at`

2. **Reconnect po visibilitychange** (VideoRoom.tsx)
   - Nowy useEffect: po powrocie na karte sprawdzic stan PeerJS i wszystkich polaczen
   - Ponowne nawiazanie zerwanych polaczen
   - Synchronizacja z baza danych

3. **Fix sendBeacon** (VideoRoom.tsx)
   - Poprawic sendBeacon aby uzywac REST API z apikey w URL

#### Faza 2: Naprawa czatu i P2P
4. **Chat fixes** (MeetingChat.tsx)
   - Optimistic updates
   - Fix filtrowania dla gosci
   - Reconnect kanalu Realtime

5. **Reconnect P2P po ICE failure** (VideoRoom.tsx)
   - Timer na "disconnected" state (10s -> treat as failed)
   - Re-call po "failed" z limitem prob
   - Broadcast `media-state-changed` dla synchronizacji mute/camera

#### Faza 3: Synchronizacja stanu
6. **Media state sync** (VideoRoom.tsx)
   - Broadcast mute/camera state
   - Aktualizacja participants list

### Podsumowanie zmian
- 2 pliki: `VideoRoom.tsx` (glowne zmiany), `MeetingChat.tsx` (czat)
- Brak zmian w edge functions
- Brak zmian w bazie danych (kolumna `last_seen_at` moze byc dodana opcjonalnie, ale mozna uzyc istniejacego `updated_at` z triggerem)
