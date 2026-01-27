
# Plan naprawy obciętego layoutu News Ticker

## Zidentyfikowane problemy

Na podstawie zrzutów ekranu:

1. **Desktop (image-137)**: Prawa strona dashboardu jest obcięta - widżet "Postęp szkoleń" nie mieści się w widoku. Pasek informacyjny z animacją marquee powoduje problem z layoutem.

2. **Mobile (image-136)**: Tekst w pasku jest ucięty ("JŚCI WERYFIKACJI SWOJEGO NUMERU KONT"), nie zawija się prawidłowo w trybie statycznym.

## Przyczyny techniczne

### Problem 1: Marquee powoduje overflow

```
MarqueeContent:
├─ div.flex.overflow-hidden (kontener - OK)
│   └─ div.flex.animate-marquee.whitespace-nowrap (treść - PROBLEM)
│       └─ Zduplikowane elementy (item + item + item + ...)
```

Animacja `translateX(-50%)` przesuwa treść, ale parent container nie ogranicza prawidłowo szerokości. Klasa `whitespace-nowrap` jest poprawna dla marquee, ale kontener musi mieć jawne `max-width: 100%` lub `overflow-x: hidden`.

### Problem 2: StaticContent nie zawija tekstu

```tsx
// Obecny kod:
<div className="flex items-center justify-center flex-wrap gap-2">
  {items.slice(0, 3).map(item => <TickerItemComponent .../>)}
</div>
```

Komponent `TickerItemComponent` ma `whitespace-nowrap` na elementach, co uniemożliwia zawijanie w trybie statycznym.

### Problem 3: Szerokość kontenera głównego

`NewsTicker` używa tylko `overflow-hidden` bez ograniczenia szerokości:
```tsx
className="relative overflow-hidden rounded-lg ..."
```

Brakuje `max-w-full` lub `w-full` aby ograniczyć szerokość do rodzica.

---

## Rozwiązanie

### Zmiana 1: NewsTicker.tsx - główny kontener

Dodanie ograniczenia szerokości do kontenera głównego:

```tsx
// Linia 114-119 - dodać min-w-0 i max-w-full
className={cn(
  "relative overflow-hidden rounded-lg",
  "min-w-0 max-w-full w-full",  // ← NOWE
  "bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60",
  ...
)}
```

### Zmiana 2: MarqueeContent - kontener

Dodanie jawnego ograniczenia szerokości:

```tsx
// Linia 27 - główny kontener marquee
<div className="flex overflow-hidden relative w-full max-w-full">
```

### Zmiana 3: StaticContent - zawijanie tekstu na mobile

Zmiana logiki dla trybu statycznego na mobile:

```tsx
const StaticContent: React.FC<{ items: TickerItem[] }> = ({ items }) => {
  return (
    <div className="flex items-center justify-center flex-wrap gap-2 max-w-full">
      {items.slice(0, 3).map((item) => (
        <TickerItemComponent 
          key={item.id} 
          item={item} 
          allowWrap  // ← NOWY prop do kontroli zawijania
        />
      ))}
      ...
    </div>
  );
};
```

### Zmiana 4: TickerItem.tsx - obsługa zawijania

Dodanie prop `allowWrap` do kontroli `whitespace`:

```tsx
interface TickerItemProps {
  item: TickerItemType;
  className?: string;
  allowWrap?: boolean;  // ← NOWY prop
}

export const TickerItemComponent: React.FC<TickerItemProps> = ({ 
  item, 
  className,
  allowWrap = false  // domyślnie nowrap dla marquee
}) => {
  // ...
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2 mx-6",
        allowWrap ? "whitespace-normal" : "whitespace-nowrap",  // ← WARUNKOWE
        // Dla mobile w trybie static - mniejszy margin
        allowWrap && "mx-2 text-center flex-wrap",
        fontSizeClass,
        ...
      )}
    >
      ...
    </span>
  );
};
```

### Zmiana 5: RotatingContent - podobna logika

Dla trybu rotate również dodać obsługę zawijania na dłuższych tekstach:

```tsx
const RotatingContent: React.FC<{ items: TickerItem[]; interval: number }> = ({ items, interval }) => {
  // ...
  return (
    <div className="flex items-center justify-center min-h-[24px] max-w-full overflow-hidden">
      <div className={cn(...)}>
        <TickerItemComponent 
          item={items[currentIndex]} 
          allowWrap  // zawijaj tekst w rotate mode
        />
      </div>
    </div>
  );
};
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/news-ticker/NewsTicker.tsx` | Dodanie `min-w-0 max-w-full` do kontenera głównego, `max-w-full` do MarqueeContent, `allowWrap` w StaticContent i RotatingContent |
| `src/components/news-ticker/TickerItem.tsx` | Nowy prop `allowWrap` kontrolujący `whitespace-nowrap` vs `whitespace-normal` |

---

## Oczekiwany rezultat

1. **Desktop**: Pasek informacyjny nie będzie powodował rozszerzenia layoutu poza viewport - widżety po prawej stronie będą widoczne w całości

2. **Mobile (tryb statyczny/rotate)**: Długie komunikaty będą zawijane do nowej linii zamiast być obcinane

3. **Mobile (tryb scroll)**: Animacja marquee będzie działać poprawnie, treść będzie przesuwana w widocznym obszarze

---

## Techniczne szczegóły

### CSS Flexbox i overflow

Problem wynika z kombinacji:
- `flex` layout (domyślnie `flex-shrink: 1`, ale bez `min-width: 0`)
- `whitespace: nowrap` rozciąga element ponad kontener
- `overflow: hidden` na rodzicu nie pomaga jeśli dziecko ma większy min-width

Rozwiązanie: `min-w-0` resetuje minimalna szerokość flex item do 0, pozwalając na prawidłowe obcinanie.
