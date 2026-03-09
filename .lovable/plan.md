

# Fix: LIVE slot — "TRWA" po lewej, czerwona pulsująca kropka + "LIVE" po prawej, nieskreślony ale nieklikaly

## Problem

Aktualnie trwający slot (np. 23:00) powinien:
- Wyświetlać **"TRWA"** po lewej stronie godziny
- Wyświetlać czerwoną pulsującą kropkę + **"LIVE"** po prawej stronie
- **Nie być przekreślony** — ale **nieklikaly** (disabled)
- Stać się przekreślony dopiero po upływie pełnego interwału (np. po 60 min)

Obecna logika: slot jest `now` tylko przez 2 minuty, potem `past` (przekreślony). Trzeba dodać stan pośredni.

## Zmiana w `AutoWebinarEventView.tsx`

### 1. Nowy status `ongoing`
`getSlotStatus` zwraca 4 statusy:
- `now` → pierwsze 2 minuty (LIVE, nieklikaly, nieprzekreślony) — **bez zmian**
- `ongoing` → **NOWY** — od 2 min do końca slotu (TRWA + LIVE, nieklikaly, nieprzekreślony)
- `past` → po zakończeniu slotu (przekreślony, nieklikaly)
- `future` → przyszłe (klikalne)

### 2. Rendering slotu `now` i `ongoing`
Oba statusy: disabled, nieprzekreślone, z czerwoną kropką + LIVE po prawej.
Dla `ongoing` dodatkowo "TRWA" po lewej.

### 3. Styl
- `now`/`ongoing`: `bg-primary/10 border border-primary/30 cursor-not-allowed`, bez `line-through`
- Czerwona pulsująca kropka: `bg-destructive animate-pulse`
- "LIVE" i "TRWA": `text-destructive font-semibold text-[9px]`

