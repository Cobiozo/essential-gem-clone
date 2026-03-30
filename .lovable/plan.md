

## Naprawa: kolor wzoru nie działa dla tekstur materiałowych

### Problem
Tekstury materiałowe (płótno, marmur, beton, drewno, skóra, szum, papier, len, piasek) ignorują parametr `col` (kolor) — ich `getCss` przyjmuje tylko `(op)`, nie `(op, col)`. SVG feTurbulence generuje własne kolory, więc zmiana koloru wzoru nie ma żadnego efektu.

### Rozwiązanie
**Plik: `src/lib/bgPatterns.ts`** — dla 8 tekstur SVG (noise, paper, linen, canvas, leather, wood, concrete, marble, sand):

1. Zmienić sygnaturę `getCss` z `(op)` na `(op, col)`
2. Dodać `backgroundColor: col` oraz `backgroundBlendMode: 'multiply'` do zwracanego obiektu CSS

Dzięki temu kolor użytkownika będzie nakładany na teksturę jako tint przez CSS blend mode — bez zmian w SVG.

```typescript
// Przykład (każda tekstura analogicznie):
// PRZED:
getCss: (op) => {
  const svg = `...`;
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundSize: 'cover',
    opacity: op,
  };
},

// PO:
getCss: (op, col) => {
  const svg = `...`;
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundSize: 'cover',
    opacity: op,
    backgroundColor: col,
    backgroundBlendMode: 'multiply',
  };
},
```

Uwaga: `fabric` (Materiał) już używa `col` poprawnie (CSS linear-gradient), więc nie wymaga zmian.

Zmiana dotyczy jednego pliku, 9 tekstur.

