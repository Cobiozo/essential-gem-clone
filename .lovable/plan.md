

# Fix: Pasek informacyjny pokazuje tylko kropki zamiast treści

## Problem
Pasek informacyjny (News Ticker) w trybie "scroll" renderuje elementy z separatorami `•` między nimi. Na produkcji widoczne są tylko te separatory — treść elementów jest pusta lub niewidoczna.

## Prawdopodobna przyczyna
Źródło danych (prawdopodobnie Live Activity z RPC `get_ticker_live_activity` lub ogłoszenia z `news_ticker_items`) zwraca elementy z pustym polem `content`. Kod nie waliduje tego pola — dodaje element do listy nawet gdy `content` jest `null`, `""` lub `undefined`. W efekcie MarqueeContent renderuje wiele elementów z ikonkami i separatorami, ale bez tekstu.

Druga możliwość: jeśli admin ustawił `textColor` na kolor zbliżony do tła, tekst jest niewidoczny, ale separatory (które mają osobną klasę `text-muted-foreground/50`) pozostają widoczne.

## Plan naprawy

### 1. Walidacja — filtruj puste elementy (`useNewsTickerData.ts`)
Przed ustawieniem `setItems(allItems)` odfiltrować elementy bez treści:

```typescript
const validItems = allItems.filter(item => item.content && item.content.trim().length > 0);
validItems.sort((a, b) => b.priority - a.priority);
setItems(validItems);
```

### 2. Fix koloru tekstu — TickerItem nie powinien nadpisywać ustawionego koloru (`TickerItem.tsx`)
Klasa `text-foreground` na elemencie treści nadpisuje kolor ustawiony przez admina na kontenerze (inline `style.color`). Zmienić tak, aby `text-foreground` był stosowany tylko gdy nie ma custom koloru z ustawień:
- Usunąć `text-foreground` z domyślnych klas w `TickerItemComponent`
- Zostawić je jako fallback tylko gdy brak inline `color` na kontenerze

### 3. Separator też powinien dziedziczyć kolor (`NewsTicker.tsx`)
Separator `•` ma klasę `text-muted-foreground/50` — to kolor niezależny od ustawień admina. Jeśli admin ustawi `textColor`, separator powinien go też odziedziczyć z odpowiednią przezroczystością:

```typescript
<span className="mx-2 select-none" style={{ opacity: 0.5 }}>•</span>
```

### Pliki do zmiany
| Plik | Zmiana |
|------|--------|
| `src/components/news-ticker/useNewsTickerData.ts` | Filtrowanie pustych `content` przed `setItems` |
| `src/components/news-ticker/TickerItem.tsx` | Usunięcie nadpisania `text-foreground`, dziedziczenie koloru |
| `src/components/news-ticker/NewsTicker.tsx` | Separator dziedziczy kolor z ustawień |

3 pliki, 3 zmiany. Główna naprawa to walidacja pustych treści — reszta to zabezpieczenie na przyszłość.

