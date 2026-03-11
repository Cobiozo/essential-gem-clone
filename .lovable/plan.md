
# Usunięcie zbędnego toast "skopiuj ręcznie"

## Problem
Gdy automatyczne kopiowanie zawiedzie (mobile), pojawia się toast na dole ekranu z komunikatem "Kod: ZW-X4DAUH — skopiuj ręcznie przyciskiem poniżej". Jest zbędny — dialog i tak pozostaje otwarty z przyciskiem "Kopiuj wiadomość" i wygenerowaną wiadomością widoczną w textarea.

## Zmiana

### `src/pages/HealthyKnowledge.tsx` (linia 151)
Usunąć `toast.info(...)` w bloku `else` (gdy `success === false`). Dialog sam w sobie wystarczająco komunikuje stan — wiadomość jest widoczna + przycisk "Kopiuj wiadomość" jest dostępny.
