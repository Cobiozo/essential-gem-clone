
# Naprawa braku obrazu z kamery w lobby i pokoju spotkania

## Diagnoza

### Problem 1: Brak podgladu kamery w lobby (szary prostokat)
**Przyczyna**: `getUserMedia` jest wywolywane w `useEffect` (linia 46-68 w MeetingLobby.tsx). Nowoczesne przegladarki (szczegolnie mobilne) blokuja dostep do kamery/mikrofonu jesli nie jest wywolany bezposrednio z gestu uzytkownika (klikniecie/dotyk). Zgodnie z polityka autoplay/permissions: `getUserMedia` w `useEffect` moze zwrocic `NotAllowedError` lub po cichu nie dzialac.

Dodatkowo: nawet jesli strumien sie uruchomi, element `<video>` jest renderowany warunkowo (`videoEnabled && previewStream`) — jesli React przerenderuje komponent, referencja `videoRef` moze sie rozjechac.

### Problem 2: Brak obrazu uczestnikow w pokoju spotkania
**Przyczyna**: VideoRoom reuzywuje strumien z lobby (`initialStream`). Jesli lobby nie uzyskal strumienia (problem 1), `initialStream` jest `null`. Wtedy VideoRoom probuje `getUserMedia` w swoim `useEffect` (linia 776) — ale to tez jest poza gestem uzytkownika, wiec tez moze byc zablokowane.

Dla zdalnych uczestnikow: `showVideo` w VideoGrid (linia 198) sprawdza `stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live')`. Jesli zdalny uczestnik nie mial strumienia, warunek jest `false` i pokazuje sie avatar.

## Plan naprawy

### Plik: `src/components/meeting/MeetingLobby.tsx`

**A) Przesuniecie `getUserMedia` do gestu uzytkownika:**
- Zamiast wywoływac `getUserMedia` w `useEffect` automatycznie, dodac przycisk "Wlacz kamere i mikrofon" ktory uruchamia strumien z klikniecia.
- Jako fallback: nadal probowac w `useEffect`, ale z jasnym komunikatem bledu jesli sie nie uda.
- Gdy `getUserMedia` sie nie powiedzie w useEffect, wyswietlic przycisk "Zezwol na dostep do kamery" ktory wywola `getUserMedia` z gestu.

**B) Utrzymanie video ref stabilnosci:**
- Element `<video>` zawsze renderowac w DOM (z `hidden` class gdy kamera wylaczona), zeby `ref` sie nie gubil.
- Przenosimy warunek widocznosci z renderowania warunkowego na CSS (`className="hidden"`).

**C) Retry po odmowie uprawnien:**
- Jesli `getUserMedia` rzuci `NotAllowedError`, wyswietlic przycisk "Sprobuj ponownie" ktory wywola `getUserMedia` z kontekstu klikniecia.

### Plik: `src/components/meeting/VideoRoom.tsx`

**D) Zabezpieczenie inicjalizacji strumienia:**
- Jesli `initialStream` z lobby jest null/dead I `getUserMedia` w useEffect tez nie zadziala — wyswietlic toast z przyciskiem "Wlacz kamere" ktory manualnie wywola `reacquireLocalStream`.
- Dodac fallback: jesli strumien jest null po init, ustawic `isCameraOff=true` i `isMuted=true` zamiast calkowicie blokowac uczestnictwo — uzytkownik moze dolaczac bez kamery.

### Plik: `src/components/meeting/VideoGrid.tsx`

**E) Stabilnosc elementu video:**
- Upewnic sie ze `<video>` jest ZAWSZE w DOM (linia 204-216 juz to robi z `hidden` class). To jest OK.
- Dodac `video.play()` retry po `loadeddata` event, zeby odrobic ewentualny autoplay block.

## Pliki do modyfikacji
1. `src/components/meeting/MeetingLobby.tsx` — glowna zmiana (getUserMedia z gestu + fallback UI)
2. `src/components/meeting/VideoRoom.tsx` — fallback jesli strumien nie istnieje po init
3. `src/components/meeting/VideoGrid.tsx` — drobna poprawka retry play

## Bez zmian
- `VideoBackgroundProcessor.ts` — nie jest przyczyna braku obrazu
- `useVideoBackground.ts` — bez zmian
- `ParticipantsPanel.tsx` — bez zmian
- Caly flow PeerJS/sygnalizacja — bez zmian
