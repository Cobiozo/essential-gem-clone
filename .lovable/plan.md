

# Naprawa 4 problemow w Meeting Room

## Problem 1: Brak detekcji aktywnego mowcy (czarny glowny ekran)

**Przyczyna:** VideoGrid przelacza aktywnego mowce tylko przez reczne klikniecie na miniaturke. Brak automatycznej detekcji dzwieku (Web Audio API).

**Naprawa w `VideoGrid.tsx`:**
- Dodac `AudioContext` + `AnalyserNode` do analizy poziomu dzwieku kazdego uczestnika
- Co ~300ms sprawdzac ktory uczestnik ma najwyzszy poziom audio
- Automatycznie przelaczac `activeSpeakerIndex` na mowce (z debounce 2s zeby nie skakalo)
- Domyslnie pokazywac pierwszego zdalnego uczestnika (index 1) zamiast lokalnego (index 0) jesli sa inni uczestnicy

## Problem 2: Czat nie wysyla wiadomosci

**Przyczyna:** RLS policy na `meeting_chat_messages` INSERT wymaga aktywnego rekordu w `meeting_room_participants`. Insert uczestnika w VideoRoom.tsx nie sprawdza bledu - jesli sie nie powiedzie (np. duplikat), czat nie zadziala.

**Naprawa w `VideoRoom.tsx`:**
- Dodac `upsert` zamiast `insert` dla `meeting_room_participants` (obsluga ponownego dolaczenia)
- Dodac logowanie bledu insertowania uczestnika
- Dodac retry jesli insert sie nie powiedzie

**Naprawa w `MeetingChat.tsx`:**
- Dodac lepszy error handling z konkretnym komunikatem RLS
- Pokazac przycisk "Sprobuj ponownie" zamiast automatycznego retry

## Problem 3: Kamera nie wlacza sie po wylaczeniu

**Przyczyna:** `handleToggleCamera` zmienia `track.enabled`, ale `VideoGrid` sprawdza `hasVideo` na obiekcie stream ktory nie zmienil referencji. React nie wie ze trzeba przerenderowac `VideoTile`, bo `participant.stream` to ten sam obiekt.

**Naprawa w `VideoRoom.tsx`:**
- Po toggle kamery wymusic aktualizacje `localStream` state nowa referencja: `setLocalStream(prev => prev ? new MediaStream(prev.getTracks()) : null)`
- To spowoduje re-render VideoTile z nowa referencja streamu

**Naprawa w `VideoGrid.tsx`:**
- Dodac dodatkowy `isCameraOff` prop do VideoTile zeby reagowal na zmiany stanu kamery niezaleznie od referencji streamu

## Problem 4: Lista uczestnikow i PiP

**Przyczyna PiP:** PiP wymaga aktywnego elementu `<video>` z dzialajacym streamem. Jesli glowny ekran jest czarny (problem 1), PiP tez nie zadziala.

**Naprawa:** Naprawienie problemu 1 (aktywny mowca) automatycznie naprawi PiP, bo bedzie dzialajacy stream w glownym video.

## Zmieniane pliki

### 1. `src/components/meeting/VideoGrid.tsx`
- Dodac active speaker detection z Web Audio API
- Dodac prop `isCameraOff` do VideoTile
- Domyslny active speaker = pierwszy zdalny uczestnik
- Wizualny wskaznik mowcy na miniaturce (zielona ramka)

### 2. `src/components/meeting/VideoRoom.tsx`
- `handleToggleCamera`: wymusic nowa referencje streamu po toggle
- Insert uczestnika: `upsert` zamiast `insert`, z error handling
- Przekazac `isCameraOff` do VideoGrid

### 3. `src/components/meeting/MeetingChat.tsx`
- Poprawic error handling - wyswietlic blad z RLS
- Nie kasowac inputa przed potwierdzeniem wysylki

