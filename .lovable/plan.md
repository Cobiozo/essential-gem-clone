

## Naprawa wzorów/tekstur tła — podwójne kodowanie SVG

### Problem
W `src/lib/bgPatterns.ts` tekstury materiałowe (noise, paper, linen, leather, wood, concrete, canvas, marble, sand) mają błąd podwójnego kodowania URL:

```typescript
// filter='url(%23n)' — %23 to już zakodowany #
// Potem encodeURIComponent(svg) zamienia %23 na %2523 → filtr SVG nie działa
const svg = `...<rect filter='url(%23n)'/>...`;
return { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` };
```

Efekt: filtry `feTurbulence` nie działają, widać szary prostokąt zamiast tekstury. Dotyczy to zarówno podglądu w edytorze, jak i renderowania na stronie.

### Naprawa

**Plik: `src/lib/bgPatterns.ts`** — w każdej teksturze materiałowej (9 wzorów):
- Zamienić `%23` na `#` w referencjach filtrów SVG (np. `filter='url(#n)'`)
- Zachować `encodeURIComponent(svg)` — to poprawnie zakoduje `#` do `%23` raz

Dotyczy wzorów: `noise`, `paper`, `linen`, `canvas`, `leather`, `wood`, `concrete`, `marble`, `sand`.

Przykład zmiany (każdy wzór analogicznie):
```typescript
// PRZED (podwójne kodowanie):
const svg = `<svg ...><filter id='n'>...</filter><rect ... filter='url(%23n)'/></svg>`;
return { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` };

// PO (poprawne):
const svg = `<svg ...><filter id='n'>...</filter><rect ... filter='url(#n)'/></svg>`;
return { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` };
```

Zmiana dotyczy 9 linii w jednym pliku — zamiana `url(%23...)` na `url(#...)` w każdym z 9 wzorów materiałowych.

