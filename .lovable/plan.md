
# Plan: Definitywna naprawa szerokości News Ticker

## Zidentyfikowany problem

Animacja marquee używa `translateX(-50%)` z `whitespace-nowrap`, co powoduje że zawartość animowana rozciąga się na pełną szerokość tekstu (znacznie szerszą niż kontener). Mimo `overflow-hidden`, sam element rozciąga layout rodzica.

### Przyczyna techniczna:
```
Card (col-span-full)
└── CardContent (overflow-hidden) ← działa
    └── div (w-full max-w-full) ← nie wystarczy
        └── NewsTicker (overflow-hidden) ← nie wystarczy
            └── MarqueeContent (flex)
                └── div (animate-marquee whitespace-nowrap) ← PROBLEM
                    └── Zduplikowany tekst rozciąga parent
```

## Rozwiązanie: Absolutne pozycjonowanie animacji

Zmiana podejścia - kontener będzie miał ustaloną wysokość, a animowana zawartość będzie pozycjonowana absolutnie wewnątrz niego.

### Zmiana w `src/components/news-ticker/NewsTicker.tsx`

MarqueeContent:

```tsx
const MarqueeContent = ({ items, speed }) => {
  return (
    // Kontener z ustaloną wysokością i relative
    <div className="relative w-full h-6 overflow-hidden">
      {/* Animowany element absolutnie pozycjonowany */}
      <div
        className="absolute left-0 top-0 flex animate-marquee whitespace-nowrap"
        style={{ animationDuration: `${duration}s` }}
      >
        {[...items, ...items].map(...)}
      </div>
    </div>
  );
};
```

Kluczowe zmiany:
1. Zewnętrzny div: `relative w-full h-6 overflow-hidden` - ustala granice
2. Wewnętrzny div: `absolute left-0 top-0` - nie rozciąga rodzica
3. Animacja `translateX(-50%)` działa w nieskończoność bez wpływu na layout

### Zmiana animacji w `tailwind.config.ts`

Upewnienie się, że animacja działa poprawnie z absolutnym pozycjonowaniem - bez zmian w keyframes, tylko dodanie `will-change: transform` dla płynności.

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/news-ticker/NewsTicker.tsx` | Przepisanie MarqueeContent z absolutnym pozycjonowaniem |

## Kod rozwiązania

```tsx
// MarqueeContent - nowa wersja
const MarqueeContent: React.FC<{ items: TickerItem[]; speed: number }> = ({ items, speed }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [animationDuration, setAnimationDuration] = useState(30);

  useEffect(() => {
    if (contentRef.current) {
      const contentWidth = contentRef.current.scrollWidth / 2;
      const duration = contentWidth / speed;
      setAnimationDuration(Math.max(10, duration));
    }
  }, [items, speed]);

  return (
    <div className="relative w-full h-6 overflow-hidden">
      <div
        ref={contentRef}
        className="absolute left-0 top-0 flex animate-marquee whitespace-nowrap will-change-transform"
        style={{ animationDuration: `${animationDuration}s` }}
      >
        {[...items, ...items].map((item, i) => (
          <TickerItemComponent key={`${item.id}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
};
```

## Oczekiwany rezultat

1. News Ticker będzie ograniczony do szerokości WelcomeWidget
2. Animacja marquee będzie płynnie przewijać tekst bez rozciągania layoutu
3. Tekst nie będzie wystawał poza widoczny obszar karty
