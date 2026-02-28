
## Audyt systemu spotkan wewnetrznych + brakujace funkcje

### 1. Problem: Uczestnicy nie widoczni natychmiast po dolaczeniu

**Przyczyna**: Gdy nowy uczestnik dolaczy, flow jest nastepujacy:
1. Nowy peer rejestruje sie w `meeting_room_participants` (INSERT/UPSERT)
2. Kanai Supabase Realtime subskrybuje sie (`channel.subscribe`)
3. Dopiero PO subskrypcji (`SUBSCRIBED`) nastepuje broadcast `peer-joined`
4. Jednoczesnie nowy peer odpytuje DB o istniejacych uczestnikow i dzwoni do nich (`callPeer`)

Problem polega na **race condition**: miedzy momentem INSERT do bazy a momentem SUBSCRIBED moze uplynac 1-3 sekundy. W tym czasie:
- Istniejacy uczestnicy NIE widza nowego (bo broadcast jeszcze nie wyslany)
- Nowy uczestnik moze juz widziec istniejacych (bo odpytuje DB)

Dodatkowo, heartbeat (sync z baza) odbywa sie co **30 sekund** -- wiec jesli broadcast `peer-joined` zostanie stracony (np. chwilowy problem z kanalem), uczestnik pojawi sie dopiero po nastepnym heartbeat (do 30s).

**Naprawa**:
- Dodac obsluge zdarzenia Postgres Realtime (INSERT na `meeting_room_participants`) jako **drugi kanal sygnalizacji** -- gdy pojawi sie nowy wiersz w bazie, natychmiast sprobuj polaczyc sie z tym peerem (jesli jeszcze nie polaczony). To dziala niezaleznie od broadcast i eliminuje race condition.
- Zmniejszyc interwał heartbeat z 30s do 15s jako dodatkowe zabezpieczenie.

### 2. Brak funkcji: Rozmycie tla / Wirtualne tlo

**Stan obecny**: W kodzie NIE istnieje zadna implementacja rozmycia tla ani wirtualnych teł. Nie ma tez zadnych importow bibliotek do przetwarzania wideo (np. TensorFlow.js, MediaPipe).

**Plan implementacji**:

Rozmycie tla i wirtualne tla wymagaja przetwarzania kazdej klatki wideo w czasie rzeczywistym -- segmentacja osoby od tla za pomoca modelu ML i zastosowanie efektu (blur lub zamiana tla).

#### Technologia
- **@mediapipe/selfie_segmentation** lub **@mediapipe/tasks-vision** -- lekki model ML do segmentacji osoby/tla dzialajacy w przegladarce (WebAssembly + GPU)
- **OffscreenCanvas / Canvas 2D** -- rendering przetworzonego wideo
- **captureStream()** -- przechwycenie strumienia z canvas i przekazanie go do WebRTC zamiast oryginalnego

#### Architektura
1. Nowy komponent `VideoBackgroundProcessor` -- obsluguje pipeline: kamera -> segmentacja -> canvas (blur/obraz) -> MediaStream
2. Nowy hook `useVideoBackground` -- zarzadza stanem (off / blur / image), inicjalizacja modelu, cleanup
3. Modyfikacja `MeetingLobby.tsx` -- dodanie przycisku wyboru tla w lobby (podglad efektu przed dolaczeniem)
4. Modyfikacja `VideoRoom.tsx` -- integracja z procesorem, zamiana localStream na przetworzony stream
5. Modyfikacja `MeetingControls.tsx` -- dodanie przycisku "Tlo" z menu (Brak / Rozmycie / Obraz 1-3)

#### Wazne uwagi
- Wymaga zainstalowania pakietu `@mediapipe/tasks-vision` (~4MB model WASM)
- Zuzywa znacznie wiecej CPU/GPU -- nalezy dodac ostrzezenie dla slabszych urzadzen
- Model trzeba zaladowac asynchronicznie (pierwsze uzycie ~2-3s)
- Na urzadzeniach mobilnych moze byc zbyt wolne -- nalezy wykrywac i ew. wylaczac opcje

### 3. Podsumowanie audytu -- co juz dziala

| Funkcja | Status |
|---------|--------|
| Dolaczanie/opuszczanie pokoju | Dziala |
| WebRTC peer-to-peer video/audio | Dziala |
| Heartbeat + self-healing | Dziala (30s) |
| Wykrywanie aktywnego mowcy | Dziala (hystereza 2.5s) |
| Udostepnianie ekranu | Dziala |
| Czat w spotkaniu | Dziala |
| Panel uczestnikow | Dziala |
| Role (Host/Co-Host) | Dziala |
| Ustawienia spotkania (chat/mic/cam/screen) | Dziala |
| PiP (Picture-in-Picture) | Dziala |
| Tryb widoku (Speaker/Gallery/Multi-speaker) | Dziala |
| Tryb goscia | Dziala |
| TURN/STUN serwery | Dziala |
| Reconnect ICE/Peer | Dziala (max 3 proby) |
| Kanal reconnect (exponential backoff) | Dziala |
| **Natychmiastowe widzenie uczestnikow** | **BUG -- race condition** |
| **Rozmycie tla** | **BRAK** |
| **Wirtualne tlo** | **BRAK** |

### 4. Plan implementacji (kolejnosc)

#### Faza 1: Naprawa widocznosci uczestnikow
- **`VideoRoom.tsx`**: Dodac subskrypcje Postgres Realtime na tabele `meeting_room_participants` (INSERT z `is_active=true`). Gdy pojawi sie nowy wiersz z `peer_id` roznym od lokalnego, natychmiast wywolac `callPeer`. To eliminuje zaleznosc od broadcast i rozwiazuje race condition.
- **`VideoRoom.tsx`**: Zmniejszyc interwał heartbeat z 30000ms do 15000ms.

#### Faza 2: Rozmycie tla i wirtualne tla
- Zainstalowac `@mediapipe/tasks-vision`
- Utworzyc `src/components/meeting/VideoBackgroundProcessor.ts` -- klasa obslugujaca pipeline segmentacji
- Utworzyc `src/hooks/useVideoBackground.ts` -- hook React do zarzadzania efektami tla
- Utworzyc `src/components/meeting/BackgroundSelector.tsx` -- UI menu wyboru tla (Brak / Lekkie rozmycie / Mocne rozmycie / Obraz 1-3)
- Zmodyfikowac `MeetingLobby.tsx` -- dodac przycisk wyboru tla z podgladem
- Zmodyfikowac `VideoRoom.tsx` -- zastapic surowy localStream przetworzonym streamem
- Zmodyfikowac `MeetingControls.tsx` -- dodac przycisk "Tlo" w pasku kontrolnym
- Dodac 3-4 domyslne obrazy teł w `public/backgrounds/`

### Pliki do zmiany/utworzenia

| Plik | Operacja | Opis |
|------|----------|------|
| `src/components/meeting/VideoRoom.tsx` | Edycja | Postgres Realtime subscription + heartbeat 15s + integracja background |
| `src/components/meeting/VideoBackgroundProcessor.ts` | Nowy | Pipeline ML segmentacji + canvas rendering |
| `src/hooks/useVideoBackground.ts` | Nowy | Hook zarzadzania efektami tla |
| `src/components/meeting/BackgroundSelector.tsx` | Nowy | UI wyboru tla |
| `src/components/meeting/MeetingLobby.tsx` | Edycja | Przycisk tla w lobby |
| `src/components/meeting/MeetingControls.tsx` | Edycja | Przycisk tla w kontrolkach |
| `public/backgrounds/` | Nowy | 3-4 domyslne obrazy teł |
