## Problem

Aktualnie w `PaidEventHero.tsx` baner używa kombinacji `aspect-[21/9] min-h-[320px] md:min-h-[420px] max-h-[520px]` + mocnego gradientu `from-background/95 via-background/50`. Skutki widoczne na zrzucie:

1. Na desktopie w podglądzie admin (kontener ~870px) `aspect-[21/9]` daje ~373px wysokości, ale `min-h-[420px]` rozciąga kontener do 420px. `object-cover` przycina obraz nienaturalnie — widoczny jest tylko pas środka (stąd urwane "EQOLOGY" u góry).
2. Gradient `from-background/95 via-background/50` pokrywa ~60% wysokości baneru ciemnym tłem, więc tytuł wygląda jakby siedział na osobnym ciemnym pasku **pod** obrazkiem, zamiast być nałożony na żywy fragment zdjęcia.
3. W rezultacie podgląd admin i strona publiczna nadal się różnią wizualnie — proporcje obrazu i pozycja tytułu zależą od szerokości kontenera.

## Rozwiązanie

Zunifikować baner do **jednej deterministycznej proporcji** bez `min-h`, które łamie aspect ratio, oraz zmniejszyć gradient tak, aby pokrywał tylko dolną część (gdzie faktycznie siedzi tekst).

### Zmiany w `src/components/paid-events/public/PaidEventHero.tsx`

1. **Container baneru** — zastąpić:
   ```
   aspect-[21/9] min-h-[320px] md:min-h-[420px] max-h-[520px]
   ```
   na proporcję responsywną bez `min-h`:
   ```
   aspect-[16/9] sm:aspect-[2/1] lg:aspect-[21/9] max-h-[560px]
   ```
   - Mobile (16/9) → wyższy baner przy wąskim ekranie, czytelny tytuł.
   - Tablet (2/1) → wyważone proporcje.
   - Desktop ≥1024px (21/9) → szeroki cinematic baner.
   - Brak `min-h` = obraz nigdy nie jest sztucznie rozciągany ponad swoją proporcję, więc nie traci kompozycji.

2. **Gradient** — zastąpić:
   ```
   bg-gradient-to-t from-background/95 via-background/50 to-transparent
   ```
   na łagodniejszy, ograniczony do dolnych ~50%:
   ```
   bg-gradient-to-t from-background/85 via-background/40 to-transparent
   ```
   plus dodać explicit `h-1/2` overlay tylko na dole zamiast pełnego inset, aby górna część baneru pozostała w pełni widoczna.
   Konkretnie: drugi `<div>` (gradient) zmienić z `absolute inset-0` na `absolute inset-x-0 bottom-0 h-2/3` z gradientem `from-background/90 via-background/60 to-transparent`.

3. **Bottom content overlay** — bez zmian strukturalnych, ale dorzucić `text-shadow` (już mamy `drop-shadow-lg` na h1) i upewnić się, że padding bottom jest spójny: `pb-5 sm:pb-6 md:pb-8`.

### Zmiany w `src/components/admin/paid-events/editor/EventEditorPreview.tsx`

Bez zmian — `PaidEventHero` jest już używany identycznie jak na stronie publicznej, więc jednolite proporcje w komponencie automatycznie zsynchronizują oba widoki.

## Pliki edytowane

- `src/components/paid-events/public/PaidEventHero.tsx`

## Efekt

- Podgląd w edytorze i widok publiczny mają **identyczne** proporcje baneru przy każdej szerokości kontenera.
- Tytuł zawsze nakłada się na żywy fragment obrazu (nie na ciemny pasek).
- Górna część zdjęcia (np. logo/napis "EQOLOGY") pozostaje widoczna i nieprzycięta nienaturalnie.
- Tekst tytułu, opisu i metadanych pozostaje czytelny dzięki łagodnemu gradientowi i `drop-shadow`.
