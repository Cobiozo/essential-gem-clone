

# Naprawa błędu: `Cannot read properties of null (reading 'visible_to_clients')`

## Problem
Nowo dodana sekcja widoczności i dat w dialogu edycji odwołuje się do `editingItem.visible_to_clients` bez sprawdzenia czy `editingItem` nie jest `null`. Gdy dialog jest zamknięty, `editingItem` jest `null` i aplikacja się crashuje.

## Rozwiązanie

### Plik: `src/components/admin/NewsTickerManagement.tsx`

Owinąć sekcję widoczności i dat (linie ~1263-1310) w warunek `{editingItem && (...)}`  — albo dodać optional chaining (`editingItem?.visible_to_clients`) do każdego odwołania.

Najprostsze podejście: cały blok widoczności i dat już jest wewnątrz `DialogContent`, który powinien renderować się tylko gdy `editingItem` istnieje. Trzeba sprawdzić czy dialog renderuje się warunkowo i dodać guard `editingItem &&` do sekcji widoczności/dat.

