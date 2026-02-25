

## Naprawa animacji omega-coin-flip

### Problem

Przycisk ma klase `transition-all duration-300` ktora przechwytuje wlasciwosc `transform` i blokuje animacje CSS `rotateY`. Transition i animation walcza o te sama wlasciwosc.

Dodatkowo `perspective` powinno byc na elemencie nadrzednym, nie na samym obracajacym sie elemencie.

### Rozwiazanie

**1. `src/components/MedicalChatWidget.tsx`**

- Usunac `transition-all duration-300` z przycisku i zastapic specyficznymi transitionami ktore nie obejmuja `transform`:
  - `transition-colors duration-300` (dla hover na gradiencie)
- Przeniesc `perspective` do wrappera `<div>`, a na przycisku zostawic tylko `transformStyle: preserve-3d`
- Otoczyc przycisk w `<div>` z `style={{ perspective: '600px' }}`

**2. Bez zmian w `tailwind.config.ts`** -- konfiguracja jest poprawna.

### Zmieniony przycisk (schemat)

```text
<div style={{ perspective: '600px' }}>
  <button
    className="... transition-colors duration-300 hover:scale-110
      ${isSpinning ? 'animate-omega-coin-flip' : ''}"
    style={{ transformStyle: 'preserve-3d' }}
  >
    ...
  </button>
</div>
```

Efekt: obrot 360 stopni w 2s, pauza 10s, powtarza sie.

