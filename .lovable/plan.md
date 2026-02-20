
# Naprawa: "useCurrency must be used within a CurrencyProvider"

## Diagnoza — przyczyna błędu

Błąd pojawia się na stronie `/leader` (Panel Lidera), nie na `/specialist-calculator`.

Komponent `SpecialistCalculator` (z `src/components/specialist-calculator/SpecialistCalculator.tsx`) renderuje dzieci, które wywołują `useCurrency()`:
- `ResultCards.tsx` — linia 26: `const { formatAmount } = useCurrency();`
- `BottomSection.tsx` — linia 28: `const { currency, formatAmount } = useCurrency();`
- `IncomeChart.tsx` — linia 27: `const { formatAmount, symbol, convert } = useCurrency();`

Kalkulator działa na stronie `/specialist-calculator` bo:
```
SpecialistCalculatorPage → <CurrencyProvider> → <SpecialistCalculator /> ✅
```

Ale w `LeaderPanel.tsx` (linie 104 i 161) jest renderowany bez opakowywania w kontekst:
```
LeaderPanel → <SpecialistCalculator />  ← brak CurrencyProvider! ❌
```

`CommissionCalculator` (kalkulator influencerów) nie ma tego problemu, bo sam zawiera własny `CurrencyProvider` w środku (`src/components/calculator/CommissionCalculator.tsx`, linia 55).

## Rozwiązanie

Dwa miejsca wymagają naprawy:

### Opcja A (zalecana): Dodać `CurrencyProvider` wewnątrz komponentu `SpecialistCalculator`
Analogicznie do `CommissionCalculator`, sam komponent powinien być samowystarczalny — pobiera `eurToPlnRate` z ustawień i sam owija się `CurrencyProvider`. Dzięki temu działa poprawnie niezależnie od tego, gdzie jest użyty w drzewie komponentów.

### Opcja B: Owrappować w LeaderPanel
Owinąć każde użycie `<SpecialistCalculator />` w `LeaderPanel.tsx` przez `<CurrencyProvider>`. Ale to wymaga dodatkowego pobierania kursu w LeaderPanel, a przy przyszłych użyciach komponentu błąd może wrócić.

**Wybieramy Opcję A** — komponent staje się samowystarczalny, co jest bezpieczniejsze długoterminowo.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/specialist-calculator/SpecialistCalculator.tsx` | Dodanie własnego `CurrencyProvider` wewnątrz komponentu — analogicznie jak w `CommissionCalculator` |

## Szczegóły zmiany

`SpecialistCalculator` już pobiera `settings.eur_to_pln_rate` z hooków, więc ma dostęp do kursu wymiany. Wystarczy owrapować zwracany JSX w `CurrencyProvider`:

```typescript
// PRZED:
return (
  <div className="space-y-6">
    <ClientSlider ... />
    <ResultCards ... />
    <BottomSection ... />
    ...
  </div>
);

// PO:
return (
  <CurrencyProvider eurToPlnRate={settings.eur_to_pln_rate || 4.3}>
    <div className="space-y-6">
      <ClientSlider ... />
      <ResultCards ... />
      <BottomSection ... />
      ...
    </div>
  </CurrencyProvider>
);
```

Dodatkowa uwaga: gdy `SpecialistCalculator` jest renderowany wewnątrz `SpecialistCalculatorPage`, strona już posiada zewnętrzny `CurrencyProvider`. Zagnieżdżone Providery Reacta są obsługiwane poprawnie — wewnętrzny Provider nadpisuje zewnętrzny dla swoich dzieci. Nie powoduje to żadnego konfliktu ani podwójnego renderowania.

Po tej zmianie `SpecialistCalculator` będzie działał poprawnie zarówno na:
- `/specialist-calculator` (dedykowana strona)
- `/leader` → zakładka Kalkulator Specjalistów
- Każdym innym miejscu w aplikacji
