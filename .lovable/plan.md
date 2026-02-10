
# Naprawa dzwoneczka powiadomien

## Problem
Dashboard uzywa komponentu `NotificationBell` (z pliku `NotificationBell.tsx`), a nie `NotificationBellEnhanced.tsx` ktory byl edytowany. Dlatego zmiany nie sa widoczne.

## Rozwiazanie
Zamiast zmieniać importy, nalezy zastosowac poprawki bezposrednio w uzywanym komponencie `NotificationBell.tsx`:

### Plik: `src/components/notifications/NotificationBell.tsx`

1. **Pulsowanie dzwoneczka** — dodanie `animate-pulse` gdy `unreadCount > 0` (linia 53)
2. **Szersza ramka popovera** — zmiana `w-80` na `w-96` (linia 64)
3. **Pelna tresc tytulow** — zmiana `truncate` na `line-clamp-2` w tytule (linia 103)
4. **Przeniesienie "Oznacz wszystkie" do stopki** — usuniecie z naglowka (linie 69-74), dodanie stale widocznej stopki z przyciskami "Zobacz wszystkie" i "Odczytaj wszystkie"

### Zakres zmian
- 1 plik: `src/components/notifications/NotificationBell.tsx`
