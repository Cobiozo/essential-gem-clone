## 1. Player — 3 prędkości (1×, 1.25×, 1.5×) z menu „trzy kropki" w prawym dolnym rogu

**Plik:** `src/components/SecureMedia.tsx`

- Usunąć obecną nakładkę w prawym górnym rogu z przyciskami `1×` / `1.5×`.
- Dodać nową nakładkę w prawym dolnym rogu wideo (`absolute bottom-2 right-2 z-20`), widoczną tylko gdy `allowedPlaybackRates.length > 1` i `videoReady`.
- Trigger: okrągły przycisk ~32px z ikoną `MoreVertical` (trzy pionowe kropki), tło `bg-black/50`, biały kolor, `backdrop-blur-sm`, `touchAction: 'manipulation'`.
- Po kliknięciu otwiera się `DropdownMenu` (shadcn) z opcjami wyfiltrowanymi z `allowedPlaybackRates`: `1×`, `1.25×`, `1.5×`. Zaznaczenie aktualnej prędkości (✓).
- Klik opcji wywołuje `handleSpeedChange(rate)` (już istnieje + ochrona `handleRateChange` przez `useRef` listy dozwolonych).

**Plik:** `src/pages/TrainingModule.tsx`

- Zmienić przekazywane `allowedPlaybackRates` z `[1, 1.5]` na `[1, 1.25, 1.5]` gdy `lesson.playback_speed_enabled === true`.

**Bez zmian:**
- `VideoControls.tsx` (pasek pod wideo) — pozostaje bez przycisków prędkości.
- Po zaliczeniu lekcji nadal działają natywne kontrolki przeglądarki.
- Logika zaliczenia (`currentTime` niezależny od prędkości) — bez zmian.
- Blokada przewijania w trybie restricted — bez zmian.

## 2. Filtr użytkowników po danych adresowych (Panel admina)

**Plik:** `src/pages/Admin.tsx` (sekcja „Zarządzanie użytkownikami", ~linia 4247)

- Dodać nowy stan: `userAddressFilter` (string) — pojedyncze pole tekstowe „Filtruj po adresie (miasto, kod, ulica, kraj)".
- Pole wyświetlone obok istniejącego pola „Szukaj użytkowników" lub pod nim (responsywnie: na desktopie obok, na mobile poniżej). Z ikoną `MapPin`.
- Rozszerzyć `filteredAndSortedUsers` (linia 1886) o dodatkowy filtr: jeśli `userAddressFilter` niepuste, przepuszczać tylko użytkowników, u których którekolwiek z pól `street_address`, `postal_code`, `city`, `country` zawiera (case-insensitive) wpisany fragment.
- Dodać `userAddressFilter` do tablicy zależności `useMemo`.
- Licznik „Wyświetlanie X z Y użytkowników" uwzględni nowy filtr automatycznie (warunek `userSearchQuery || userFilterTab !== 'all' || userAddressFilter`).

**Bez zmian w bazie danych** — pola adresowe już istnieją na profilu i są pobierane (linie 555–558).

## Pliki do edycji

- `src/components/SecureMedia.tsx` — nowa nakładka „⋮" w dolnym prawym rogu, usunięcie poprzedniej.
- `src/pages/TrainingModule.tsx` — tablica `[1, 1.25, 1.5]`.
- `src/pages/Admin.tsx` — stan filtra adresowego, pole input, warunek w `useMemo`.

## Poza zakresem

- Migracje bazy danych (nie są potrzebne).
- Zmiany w `SecureVideoControls.tsx` (nieaktywne w `TrainingModule`).
