

# Naprawa ucinania długich wiadomości w pasku informacyjnym

## Problem
W `TickerItem.tsx` linia 69: gdy `allowWrap = true` (tryb rotate/static), tekst dostaje klasy `truncate max-w-[75vw]` — co obcina długie wiadomości wielokropkiem. Dodatkowo kontener `RotatingContent` ma `overflow-hidden` i `min-h-[24px]` co ogranicza wysokość.

## Rozwiązanie

### Plik: `src/components/news-ticker/TickerItem.tsx`
**Linia 69** — usunąć `truncate max-w-[75vw]` gdy `allowWrap`, zastąpić klasami pozwalającymi na zawijanie:
```tsx
<span className={cn(!isScroll && allowWrap ? "whitespace-normal break-words" : (!isScroll ? "truncate" : ""))}>{item.content}</span>
```

### Plik: `src/components/news-ticker/NewsTicker.tsx`
**RotatingContent** (linia ~78-90) — usunąć `min-h-[24px]` i zmienić na `min-h-fit`, aby kontener rozszerzał się dla wieloliniowego tekstu. Zmienić `overflow-hidden` na brak overflow (lub `overflow-visible`).

Outer wrapper (linia 50): zmienić `max-w-full overflow-hidden` na `max-w-full` bez `overflow-hidden` w trybie rotate/static, aby tekst nie był ucinany.

