

## Naprawa widocznego kafelkowania tekstur materiałowych

### Problem
Tekstury materiałowe (marmur, beton, drewno, skóra, piasek, szum, papier, len, płótno) mają małe wymiary SVG (200-300px) i takie same `backgroundSize`, co powoduje widoczne powtarzanie kwadratów zamiast jednolitej płaszczyzny.

### Rozwiązanie
**Plik: `src/lib/bgPatterns.ts`** — dla 9 tekstur SVG-owych (noise, paper, linen, canvas, leather, wood, concrete, marble, sand):

1. Zwiększyć wymiary SVG z 200-300px do **1200x1200px** — wystarczająco duże, by wypełnić sekcję bez widocznych powtórzeń
2. Ustawić `backgroundSize: 'cover'` zamiast stałych wartości — SVG rozciągnie się na całą sekcję jako jedna płaszczyzna

Przykład zmiany (każda tekstura analogicznie):
```typescript
// PRZED:
const svg = `<svg ... width='200' height='200'>...<rect width='200' height='200' .../></svg>`;
return { backgroundImage: `url(...)`, backgroundSize: '200px 200px', opacity: op };

// PO:
const svg = `<svg ... width='1200' height='1200'>...<rect width='1200' height='1200' .../></svg>`;
return { backgroundImage: `url(...)`, backgroundSize: 'cover', opacity: op };
```

Dotyczy 9 tekstur materiałowych w jednym pliku. Wzory geometryczne (dots, grid, chevrons itd.) pozostają bez zmian — one z natury mają się powtarzać.

