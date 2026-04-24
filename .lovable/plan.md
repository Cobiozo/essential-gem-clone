## Cel

W edytorze administratora podgląd banera ma wyglądać **identycznie** jak strona publiczna widziana przez niezalogowanego gościa. Tytuł i metadane (data, lokalizacja) mają być nałożone na obrazek banera (overlay z gradientem), a nie wyświetlane pod nim na osobnym czarnym tle.

## Diagnoza

`PaidEventHero` ma poprawną implementację — kiedy `bannerUrl` jest ustawione, używa kontenera `aspect-[21/9]` z absolutnie pozycjonowanym overlay'em tekstu na dole. Na stronie publicznej (`PaidEventPage`) działa to dobrze (image-932).

Problem leży w `EventEditorPreview` (image-933): na pierwszy rzut oka wygląda jakby tytuł był pod banerem. Faktycznie powodem jest to, że:

1. Prawy panel edytora (`ResizablePanel defaultSize={60}`) jest węższy niż okno publiczne, więc baner z `aspect-[21/9]` staje się stosunkowo niski (~320px). 
2. Na tej wysokości gradient `from-background via-background/70` pokrywa ponad 60% wysokości banera, tworząc dużą czarną strefę z tytułem, która optycznie wygląda jak osobna sekcja pod banerem — co wywołuje wrażenie "baner i tekst osobno".
3. Dodatkowo w podglądzie nie ma żadnego `cache-bust` ani odświeżania, ale to inny temat.

Rozwiązanie powinno zapewnić, że proporcje, gradient i pozycja overlay'a w trybie podglądu wyglądają tak samo jak na finalnej stronie publicznej.

## Plan zmian

### 1. `src/components/paid-events/public/PaidEventHero.tsx`
- Dodać minimalną wysokość banera (np. `min-h-[420px]` na desktop, `min-h-[320px]` na mobile), żeby przy wąskich kontenerach (jak prawy panel edytora ~750px) baner nie kurczył się do wysokości, w której gradient zjada cały obraz.
- Zachować `aspect-[21/9]` + `max-h-[520px]`, ale dodać też `min-h` aby utrzymać proporcję obrazu vs tekstu spójnie między widokami.
- Lekko zmniejszyć intensywność gradientu (`from-background/95 via-background/50 to-transparent`), aby na wąskim kontenerze obraz banera pozostawał wyraźnie widoczny pod tytułem.

### 2. `src/components/admin/paid-events/editor/EventEditorPreview.tsx`
- Usunąć/poluzować jakiekolwiek wymuszenie szerokości na poziomie `ScrollArea` aby `PaidEventHero` mógł renderować się tak samo jak na stronie publicznej (pełna szerokość kontenera, overlay tekstu na dole banera).
- Upewnić się, że `<div className="min-h-full bg-background">` nie psuje wewnętrznych stylów `aspect-ratio` banera.

### 3. Weryfikacja wizualna
- Po zmianach: w widoku publicznym (gość niezalogowany) i w panelu admina (`/admin?tab=paid-events` → edytor) tytuł, opis krótki, data i lokalizacja powinny być nałożone na ten sam obraz banera, na tym samym poziomie wysokości względnej, z identycznym gradientem.

## Pliki do modyfikacji

- `src/components/paid-events/public/PaidEventHero.tsx` — dostosowanie min-height i intensywności gradientu.
- `src/components/admin/paid-events/editor/EventEditorPreview.tsx` — drobne korekty kontenera podglądu (jeśli to konieczne).

Brak zmian w bazie danych.
