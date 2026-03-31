

# Naprawa: przyciski edycji komunikatów nie widoczne

## Problem
W `NewsTickerManagement.tsx` linia 1142, kontener przycisków (`Switch`, `Pencil`, `Trash2`) nie ma klasy `shrink-0`. Przy długim tekście komunikatu, flexbox ściska przyciski do zera i znikają poza ekran.

## Rozwiązanie

### Plik: `src/components/admin/NewsTickerManagement.tsx`

**Linia 1142** — dodać `shrink-0` do kontenera przycisków:
```tsx
// Było:
<div className="flex items-center gap-2">

// Będzie:
<div className="flex items-center gap-2 shrink-0">
```

Jedna zmiana, jedna linia. Klasa `shrink-0` zapobiega kompresji kontenera przycisków przez flexbox.

