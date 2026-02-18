
# Przekierowanie po opuszczeniu spotkania na pulpit glowny

## Problem

Po opuszczeniu lub zakonczeniu spotkania uzytkownik jest przekierowywany na `/events`, co prowadzi do strony "nie znaleziona" (widoczne na screenshocie). Powinien byc przekierowywany na pulpit glowny (`/dashboard`).

## Rozwiazanie

Zmiana jednej linii w pliku `src/pages/MeetingRoom.tsx`:

- Linia 111: zmiana `navigate('/events')` na `navigate('/dashboard')`

To dotyczy funkcji `handleLeave`, ktora jest przekazywana jako `onLeave` do komponentu `VideoRoom`. Obsluguje zarowno reczne opuszczenie spotkania jak i zakonczenie spotkania przez prowadzacego (event `meeting-ended`).
