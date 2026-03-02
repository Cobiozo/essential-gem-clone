

# Naprawa wewnętrznych spotkań na PWA / mobilnych przeglądarkach

## Zdiagnozowane problemy

### Problem 1: `window.open('_blank')` i `target="_blank"` wyrzucają z PWA
Najkrytyczniejszy bug. W trybie standalone (PWA na iOS i Android), kliknięcie "Dołącz do spotkania" wywołuje `window.open('/meeting-room/...', '_blank')`, co:
- **iOS PWA**: otwiera Safari zamiast zostać w aplikacji -- użytkownik traci kontekst sesji, auth cookie, i wraca do strony logowania
- **Android PWA**: otwiera nową kartę w Chrome -- opuszcza aplikację PWA
- **Mobilne przeglądarki**: otwiera nową kartę, co na telefonach jest dezorientujące

Dotyczy 3 miejsc:
1. `EventCardCompact.tsx` linia 482: `window.open('/meeting-room/${meetingRoomId}', '_blank')`
2. `CalendarWidget.tsx` linia 196: `<a href="/meeting-room/..." target="_blank">`
3. `CalendarWidget.tsx` linia 212: `<a href="/meeting-room/..." target="_blank">`

### Problem 2: Brak obsługi `visibilitychange` w VideoRoom
Na mobilnych urządzeniach przełączenie aplikacji (np. powiadomienie) powoduje `visibilitychange` -> system może zamknąć kamierę/mikrofon. Wprawdzie jest `reacquireLocalStream`, ale brak jawnego handlera `visibilitychange` w `VideoRoom` oznacza, że re-acquire zależy wyłącznie od eventu `ended` na trackach, co nie zawsze się odpala na iOS.

### Problem 3: iOS autoplay policy w PWA
`video.play()` w lobby działa, ale w VideoRoom remote video elements mogą się nie odpalić w PWA standalone na iOS. Obecny mechanizm `touchstart/click -> play()` jest dobry, ale wymaga, aby użytkownik dotknął ekran po dołączeniu.

---

## Plan zmian

### Zmiana 1: Nawigacja wewnętrzna zamiast `_blank` (krytyczna)

**Plik: `src/components/events/EventCardCompact.tsx`**
- Zaimportować `useNavigate` z react-router-dom (lub użyć istniejącego importu)
- Zamienić `window.open('/meeting-room/${meetingRoomId}', '_blank')` na `navigate('/meeting-room/${meetingRoomId}')` -- nawigacja w ramach tej samej karty/PWA

**Plik: `src/components/dashboard/widgets/CalendarWidget.tsx`**
- Zamienić `<a href="/meeting-room/..." target="_blank">` na `<a href="/meeting-room/...">` (bez `target="_blank"`) we wszystkich wewnętrznych linkach do meeting-room
- Linki do Zoom/YouTube (zewnętrzne) zostawiamy z `target="_blank"` -- te powinny otwierać przeglądarkę

### Zmiana 2: Handler `visibilitychange` w VideoRoom (mobilna stabilność)

**Plik: `src/components/meeting/VideoRoom.tsx`**
- Dodać `useEffect` z listenerem `visibilitychange`:
  - Gdy `document.visibilityState === 'visible'`: sprawdzić czy tracks żyją, jeśli nie -> `reacquireLocalStream()`
  - Gdy `document.visibilityState === 'hidden'`: nic nie robić (nie zatrzymywać strumienia)
- To naprawi utratę kamery/mikrofonu po powrocie z powiadomienia na iOS/Android

### Zmiana 3: Automatyczne odpalanie remote video po powrocie z tła

**Plik: `src/components/meeting/VideoRoom.tsx`**
- W handlerze `visibilitychange` (z Zmiany 2), po `visible`: wykonać `document.querySelectorAll('video').forEach(v => v.play().catch(() => {}))` -- odpalić ewentualne zapauzowane remote video

---

## Pliki do zmiany
1. `src/components/events/EventCardCompact.tsx` -- zamiana `window.open` na `navigate`
2. `src/components/dashboard/widgets/CalendarWidget.tsx` -- usunięcie `target="_blank"` z wewnętrznych linków
3. `src/components/meeting/VideoRoom.tsx` -- dodanie handlera `visibilitychange`

## Oczekiwane rezultaty
- Kliknięcie "Dołącz do spotkania" w PWA na iPhone/Android otwiera pokój spotkania w ramach aplikacji
- Powrót z powiadomienia na telefonie automatycznie przywraca kamerę i mikrofon
- Remote video nie zatrzymuje się po przełączeniu aplikacji

