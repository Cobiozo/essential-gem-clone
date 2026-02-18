
# Naprawa Meeting Room - kompleksowy plan

## Zidentyfikowane problemy

### 1. TURN server - bledna konfiguracja
Edge function `get-turn-credentials` generuje credentials z `EXPRESSTURN_SECRET`, ale wysyla je na serwery `a.relay.metered.ca` (Metered.ca). Te credentials nie beda dzialac na serwerach Metered.ca bo sa generowane z innego sekretu. Skutek: polaczenia WebRTC nie przechodza przez TURN relay, co powoduje przerywanie obrazu/dzwieku.

**Naprawa:** Zmienic adresy TURN w edge function na serwery expressturn.com LUB uzyc API expressturn.com do pobrania aktualnych credentials.

### 2. PeerJS - brak reconnection i error recovery
- Brak obslugi rozlaczenia peera (peer disconnect/reconnect)
- Brak timeout na polaczenia
- Brak periodycznego sprawdzania stanu polaczenia
- Gdy peer sie rozlaczy, nie jest usuwany z listy uczestnikow

**Naprawa:** Dodac reconnection logic, connection health check, i timeout handling w VideoRoom.tsx.

### 3. Czat - problem z RLS policies
Tabela `meeting_chat_messages` ma zduplikowane i sprzeczne polityki:
- `Users can read meeting chat messages` (public, auth.uid() IS NOT NULL)  
- `Users can read chat in their rooms` (authenticated, sprawdza meeting_room_participants)
- `Users can send meeting chat messages` (public)
- `Users can send chat messages` (authenticated)

Dwie polityki SELECT sa PERMISSIVE (OR logic), wiec ta z `public` roles nadpisuje restrykcyjna. Ale INSERT z `public` role moze nie dzialac prawidlowo.

**Naprawa:** Usunac zduplikowane polityki, zostawic tylko te z `authenticated`.

### 4. Cleanup / opuszczanie spotkania
- `cleanup()` probuje wyslac broadcast na kanale ktory moze juz nie istniec
- Brak zabezpieczenia przed wielokrotnym wywolaniem cleanup
- `handleLeave` nie obsluguje bledow
- Brak event listenera na `beforeunload` (zamkniecie karty)

**Naprawa:** Dodac cleanup guard, beforeunload handler, i robust error handling.

### 5. Brak mozliwosci zakonczenia spotkania
- Nie ma funkcji "zakoncz spotkanie dla wszystkich"
- Nie ma mechanizmu informowania uczestnikow o zakonczeniu

**Naprawa:** Dodac broadcast event `meeting-ended` i obsluge go po stronie uczestnikow.

### 6. Video nie dostosowany do ekranu
- VideoTile nie ma mirror dla lokalnego video
- Brak responsive dostosowania siatki video

**Naprawa:** Dodac `scaleX(-1)` transform dla lokalnego video i poprawic responsive layout.

## Plan zmian

### Krok 1: Naprawic edge function get-turn-credentials
**Plik:** `supabase/functions/get-turn-credentials/index.ts`
- Dodac fallback STUN servers
- Uzyc poprawnych adresow TURN kompatybilnych z EXPRESSTURN_SECRET
- Dodac wiecej serwerow STUN jako backup

### Krok 2: Przepisac VideoRoom.tsx z robustnymi mechanizmami
**Plik:** `src/components/meeting/VideoRoom.tsx`
- Dodac `beforeunload` event listener dla cleanup
- Dodac guard przeciw wielokrotnemu cleanup
- Dodac reconnection logic dla PeerJS
- Dodac broadcast `meeting-ended` event (dla hosta)
- Dodac nasluchiwanie na `meeting-ended` (dla uczestnikow)
- Poprawic error handling w callPeer i handleCall
- Dodac connection health monitoring (ping/pong przez data channel)
- Dodac timeout na polaczenia ktore nie odpowiadaja

### Krok 3: Poprawic VideoGrid.tsx
**Plik:** `src/components/meeting/VideoGrid.tsx`
- Dodac mirror transform (`scaleX(-1)`) dla lokalnego video
- Poprawic responsive layout thumbnails
- Naprawic problem z brakiem video gdy track jest disabled

### Krok 4: Poprawic MeetingControls.tsx
**Plik:** `src/components/meeting/MeetingControls.tsx`
- Dodac przycisk "Zakoncz spotkanie" (widoczny tylko dla hosta/tworca)
- Dodac responsive layout na mobile (scroll horizontal jesli za duzo przyciskow)

### Krok 5: Naprawic MeetingRoom.tsx (strona)
**Plik:** `src/pages/MeetingRoom.tsx`
- Przekazac info o tym czy user jest hostem do VideoRoom
- Poprawic nawigazje po opuszczeniu (navigate na /events zamiast navigate(-1))

### Krok 6: Naprawic RLS policies czatu
**Migracja SQL:**
- Usunac zduplikowane polityki z roli `public`
- Zostawic tylko polityki dla `authenticated`

### Krok 7: Poprawic MeetingChat.tsx
**Plik:** `src/components/meeting/MeetingChat.tsx`
- Dodac error handling przy wysylaniu wiadomosci
- Dodac retry logic
- Poprawic realtime subscription (filtr na room_id)

## Kolejnosc implementacji

1. Migracja SQL (RLS policies) - usuniecie duplikatow
2. Edge function (TURN credentials) - poprawne adresy
3. VideoRoom.tsx - glowna logika z reconnection i cleanup
4. VideoGrid.tsx - mirror i responsive
5. MeetingControls.tsx - przycisk zakonczenia
6. MeetingRoom.tsx - host info i nawigacja
7. MeetingChat.tsx - error handling

## Uwagi techniczne

- PeerJS pozostaje jako warstwa WebRTC (nie zmieniamy na Jitsi/VDO.Ninja jak w referencyjnym kodzie - to bylaby zbyt duza zmiana)
- Skupiamy sie na naprawie istniejacego kodu, nie na przepisywaniu od zera
- TURN credentials sa kluczowe - bez nich polaczenia miedzy roznymi sieciami nie dzialaja
- Referencyjny kod uzytkownika uzywa `MeetingRoomWrapper` i `useVideoRoom` hook ktore nie istnieja w tym projekcie - te wzorce nie sa bezposrednio przenoszone, ale logika host/participant flow zostanie zaadaptowana
