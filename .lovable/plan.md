

# Wewnetrzna integracja wideokonferencji WebRTC + PeerJS + Supabase

## Opis rozwiazania

Dodanie wbudowanego pokoju spotkań wideo opartego na WebRTC (PeerJS) z sygnalizacja przez Supabase Realtime i serwerem TURN z expressturn.com. Administrator bedzie mogl wybrac "Wewnetrzny pokoj spotkania" zamiast podawania linku Zoom przy tworzeniu webinaru lub spotkania zespolowego.

## Architektura

```text
+------------------+       +-------------------+       +------------------+
|   Admin Form     |       |  Supabase DB      |       |  ExpressTURN     |
| (WebinarForm /   |------>| events table      |       |  TURN Server     |
|  TeamTraining)   |       | + meeting_room_id |       +--------+---------+
+------------------+       +-------------------+                |
                                    |                           |
                           +--------v---------+        +--------v---------+
                           | Supabase Realtime |        | Edge Function    |
                           | (signaling)       |        | get-turn-creds   |
                           +--------+---------+        +------------------+
                                    |                           |
                           +--------v---------+                 |
                           |  VideoRoom.tsx    |<----------------+
                           |  PeerJS Client    |
                           |  (WebRTC P2P)     |
                           +------------------+
```

## Etapy implementacji

### 1. Baza danych - nowe kolumny w tabeli `events`

Dodac 2 kolumny:
- `use_internal_meeting` (boolean, default false) - flaga: czy uzywac wbudowanego pokoju
- `meeting_room_id` (text, nullable) - unikalny identyfikator pokoju (auto-generowany UUID)

### 2. Tabela `meeting_room_participants` - sledzenie uczestnikow

Nowa tabela do sygnalizacji i zarzadzania uczestnikami w pokoju:
- `id` (uuid PK)
- `room_id` (text, NOT NULL) - powiazanie z events.meeting_room_id
- `user_id` (uuid, FK profiles)
- `peer_id` (text) - PeerJS peer ID
- `display_name` (text)
- `joined_at` (timestamptz)
- `left_at` (timestamptz, nullable)
- `is_active` (boolean, default true)

RLS: Uczestnicy moga widziec innych w tym samym pokoju; wstawiac/aktualizowac swoje wlasne rekordy.

### 3. Edge Function: `get-turn-credentials`

Generuje efemeryczne poswiadczenia TURN z expressturn.com uzywajac shared secret (HMAC-SHA1):

- Wejscie: user_id (z JWT)
- Wyjscie: `{ iceServers: [{ urls, username, credential }] }`
- Secret: `EXPRESSTURN_SECRET` (do dodania w Supabase secrets)
- TTL: 24h

### 4. Secret: EXPRESSTURN_SECRET

Nowy secret z kluczem tajnym konta expressturn.com potrzebnym do generowania poswiadczen TURN.

### 5. Komponent VideoRoom

Nowy komponent React `src/components/meeting/VideoRoom.tsx`:

- Inicjalizacja PeerJS z ICE servers (STUN + TURN z edge function)
- Sygnalizacja przez Supabase Realtime (channel per room_id):
  - `peer-joined` - nowy uczestnik dolaczyl (broadcast peer_id)
  - `peer-left` - uczestnik opuscil pokoj
- Video/audio grid z automatycznym ukladem (1-4 uczestnikow: grid, 5+: speaker view)
- Kontrolki: mikrofon on/off, kamera on/off, udostepnianie ekranu, rozlacz
- Wyswietlanie nazw uczestnikow
- Responsywny layout (mobile-friendly)

### 6. Strona `/meeting-room/:roomId`

Nowa strona/route:
- Weryfikacja czy uzytkownik jest zalogowany
- Weryfikacja czy uzytkownik jest zarejestrowany na wydarzenie (lub jest adminem/hostem)
- Lobby z podgladem kamery przed dolaczeniem
- Pelny VideoRoom po dolaczeniu

### 7. Zmiany w formularzach (WebinarForm + TeamTrainingForm)

W sekcji "Zoom Link" dodac przelacznik (admin-only):

```text
[Toggle] Uzyj wewnetrznego pokoju spotkania
  |-- Wlaczony: ukrywa pole Zoom Link, auto-generuje meeting_room_id
  |-- Wylaczony: standardowe pole Zoom Link (bez zmian)
```

### 8. Zmiany w EventCard / EventDetailsDialog

Gdy `use_internal_meeting = true`:
- Zamiast "Dolacz do Zoom" pokazac "Dolacz do spotkania" (niebieski przycisk)
- Klikniecie otwiera `/meeting-room/{meeting_room_id}` w nowej karcie
- Host widzi dodatkowy przycisk "Rozpocznij spotkanie" (dziala jak Zoom Start URL)

## Zmiany techniczne

| Plik / Zasob | Zmiana |
|--------------|--------|
| **Migracja SQL** | Kolumny `use_internal_meeting`, `meeting_room_id` w events; tabela `meeting_room_participants` z RLS |
| **Secret** | `EXPRESSTURN_SECRET` - klucz tajny z expressturn.com |
| **supabase/functions/get-turn-credentials/index.ts** | Edge function generujaca TURN credentials (HMAC-SHA1) |
| **supabase/config.toml** | Wpis `[functions.get-turn-credentials]` z `verify_jwt = false` |
| **src/components/meeting/VideoRoom.tsx** | Glowny komponent wideokonferencji (PeerJS + Realtime) |
| **src/components/meeting/VideoGrid.tsx** | Grid video streamow z adaptive layout |
| **src/components/meeting/MeetingControls.tsx** | Pasek kontrolek (mute/unmute/share/leave) |
| **src/components/meeting/MeetingLobby.tsx** | Lobby z podgladem kamery przed dolaczeniem |
| **src/pages/MeetingRoom.tsx** | Strona route `/meeting-room/:roomId` |
| **src/App.tsx** | Dodanie route `/meeting-room/:roomId` |
| **src/components/admin/WebinarForm.tsx** | Toggle "Wewnetrzny pokoj" w sekcji Zoom Link |
| **src/components/admin/TeamTrainingForm.tsx** | Toggle "Wewnetrzny pokoj" w sekcji Zoom Link |
| **src/components/events/EventCard.tsx** | Przycisk "Dolacz do spotkania" zamiast Zoom |
| **src/components/events/EventCardCompact.tsx** | Przycisk "Dolacz do spotkania" |
| **src/components/events/EventDetailsDialog.tsx** | Przycisk "Dolacz do spotkania" + info o wewnetrznym pokoju |
| **src/types/events.ts** | Nowe pola w typach EventFormData/WebinarFormData |
| **package.json** | Dodanie `peerjs` jako dependency |

## Wymagania od uzytkownika

1. **Konto expressturn.com** - potrzebny shared secret (klucz tajny) z panelu expressturn.com
2. Po dodaniu secretu `EXPRESSTURN_SECRET` - implementacja moze byc ukonczona

## Ograniczenia i uwagi

- PeerJS dziala w trybie P2P (peer-to-peer) - optymalne dla 2-8 uczestnikow
- Dla wiekszych webinarow (50+ osob) P2P nie skaluje sie - zalecany Zoom/zewnetrzna platforma
- Supabase Realtime uzyty jako "signaling server" - zastepuje Socket.IO
- Nie wymaga wlasnego serwera PeerJS - uzywamy publicznego PeerJS Cloud (0.peerjs.com) lub opcjonalnie self-hosted
- Screen sharing wymaga HTTPS (produkcja spelnia ten wymog)

