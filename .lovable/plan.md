

# Plan naprawy: spotkanie widoczne po zakończeniu + brak podglądu kamery w lobby

## Problem 1: Spotkanie nadal widoczne w widzetach po kliknieciu "Zakoncz spotkanie"

### Przyczyna
`handleEndMeeting` w `VideoRoom.tsx` ustawia tylko `is_active: false` na uczestnikach, ale **nie aktualizuje `end_time` w tabeli `events`**. Widgety dashboardu filtruja tak:

- **MyMeetingsWidget** (linia 90): `new Date(e.end_time) > new Date()` -- jesli oryginalny `end_time` jest w przyszlosci, spotkanie nadal sie wyswietla
- **CalendarWidget**: uzywa `useMeetingRoomStatus` (sprawdza `is_active` uczestnikow) -- ten widget powinien reagowac poprawnie po `handleEndMeeting`, ale MyMeetingsWidget nie

### Rozwiazanie
1. **VideoRoom.tsx** -- w `handleEndMeeting` dodac aktualizacje `end_time` w tabeli `events` na aktualny czas:
```
await supabase.from('events')
  .update({ end_time: new Date().toISOString() })
  .eq('meeting_room_id', roomId);
```
2. **VideoRoom.tsx** -- po zakonczeniu wyslac `window.dispatchEvent(new CustomEvent('eventRegistrationChange'))` zeby widgety odswiezyly dane (ten mechanizm juz istnieje w MyMeetingsWidget).
3. **MyMeetingsWidget** -- dodac subskrypcje `useMeetingRoomStatus` analogicznie do CalendarWidget, zeby wykrywac zmiane statusu uczestnikow w czasie rzeczywistym (bez czekania na refetch eventow).

---

## Problem 2: Brak podgladu kamery i testu mikrofonu w lobby

### Przyczyna
Zrzut ekranu pokazuje szary prostokat mimo wlaczonego przelacznika kamery. Kod lobby (`MeetingLobby.tsx`) ma:
- `getUserMedia` w `useEffect` (linia 41-69) -- jesli sie nie powiedzie, failuje cicho
- Brak jawnego wywolania `video.play()` po ustawieniu `srcObject` -- w niektorych przegladarkach wymagane
- Brak jakiegokolwiek wskaznika poziomu mikrofonu

### Rozwiazanie
1. **MeetingLobby.tsx** -- dodac jawne `videoRef.current.play().catch(...)` po ustawieniu `srcObject` (linia 72-74)
2. **MeetingLobby.tsx** -- dodac wizualny wskaznik poziomu mikrofonu (AudioContext + AnalyserNode):
   - Pasek poziomu glosnosci pod przelacznikiem mikrofonu
   - Aktualizowany w petli `requestAnimationFrame`
   - Zatrzymywany przy wylaczeniu mikrofonu lub opuszczeniu lobby
3. **MeetingLobby.tsx** -- dodac komunikat bledu jesli `getUserMedia` sie nie powiedzie (np. "Nie mozna uzyskac dostepu do kamery")

---

## Szczegoly techniczne

### Plik: `src/components/meeting/VideoRoom.tsx`
- W `handleEndMeeting` (linia 1833): dodac `supabase.from('events').update({ end_time: now }).eq('meeting_room_id', roomId)` przed `handleLeave()`
- Dodac `window.dispatchEvent(new CustomEvent('eventRegistrationChange'))` po zakonczeniu

### Plik: `src/components/dashboard/widgets/MyMeetingsWidget.tsx`
- Zaimportowac i uzyc `useMeetingRoomStatus` (jak CalendarWidget)
- Rozszerzyc filtrowanie `upcomingEvents` o logike "overtime" -- jesli `end_time` minal i `is_active` jest false, nie pokazywac

### Plik: `src/components/meeting/MeetingLobby.tsx`
- Dodac `play()` po `srcObject` assignment
- Dodac komponent wskaznika poziomu mikrofonu (AudioContext AnalyserNode)
- Dodac stan bledu kamery z komunikatem UX

### Pliki bez zmian
- `useMeetingRoomStatus.ts` -- dziala poprawnie, subskrybuje Realtime
- `CalendarWidget.tsx` -- juz poprawnie uzywa `useMeetingRoomStatus`
- `VideoBackgroundProcessor.ts` -- bez zmian
- `useVideoBackground.ts` -- bez zmian

