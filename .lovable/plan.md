## Problem

W oknie edytora wydarzenia (Admin → Eventy → edycja) lewy panel z formularzem (zakładki: Główne / Sekcje / Bilety / Prelegenci) nie pozwala przewinąć zawartości w dół — pola na dole formularza (np. „Grafika banera", przycisk „Zapisz zmiany") są obcięte i niedostępne.

## Przyczyna

Klasyczny problem flexboxa w `EventEditorSidebar.tsx`:
- `<Tabs className="flex-1 flex flex-col">` oraz wewnętrzny `<ScrollArea className="flex-1">` nie mają klasy `min-h-0`
- Bez `min-h-0` element `flex-1` w kolumnie flex rozciąga się do wysokości swojej zawartości (zamiast ograniczyć się do dostępnej przestrzeni), więc `ScrollArea` nigdy nie aktywuje wewnętrznego scrolla

## Rozwiązanie

Drobna zmiana w pliku `src/components/admin/paid-events/editor/EventEditorSidebar.tsx`:

1. Dodać `min-h-0` do `<Tabs>` (`flex-1 flex flex-col min-h-0`)
2. Dodać `min-h-0` do `<ScrollArea>` (`flex-1 min-h-0`)
3. Upewnić się, że `TabsContent` nie wymusza dodatkowego marginesu psującego layout (jeśli trzeba — pozostawić `m-0`, już jest)

To naprawi przewijanie we wszystkich czterech zakładkach (Główne, Sekcje, Bilety, Prelegenci) — cała zawartość formularza będzie dostępna, łącznie z przyciskiem „Zapisz zmiany" na dole.

## Pliki do edycji

- `src/components/admin/paid-events/editor/EventEditorSidebar.tsx` (2 klasy CSS)
