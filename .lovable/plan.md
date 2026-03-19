

# Plan: Naprawienie edytowalności nagłówka (HeaderSection) w podglądzie

## Problem
`HeaderSection` ma klasę `sticky top-0 z-50` — to powoduje, że:
1. Sekcja przyklejona do góry strony przesuwa się ponad toolbar edycyjny wrappera (`z-20`)
2. Hover toolbar jest niewidoczny / nieklikalny bo jest przykryty przez sticky header
3. Kliknięcie na header nie otwiera panelu edycji

## Rozwiązanie
W `TemplatePreviewPage.tsx` przekazywać do `HeaderSection` dodatkowy prop (np. `disableSticky`) lub owijać renderowanie headera tak, aby w trybie podglądu admin usunąć `sticky top-0 z-50`. Ponadto podnieść `z-index` toolbara w `SortableSectionWrapper` powyżej z-50.

### Zmiany:

**1. `HeaderSection.tsx`** — dodać prop `className` / `disableSticky` by warunkowo wyłączyć sticky:
```tsx
// Dodać prop disableSticky?: boolean
// Gdy true: usunąć sticky top-0 z-50 → position: relative
```

**2. `TemplatePreviewPage.tsx`** — przekazać `disableSticky` w renderSection:
```tsx
case 'header': return <HeaderSection config={cfg} partnerName="..." disableSticky />;
```

**3. `SortableSectionWrapper.tsx`** — podnieść z-index toolbara z `z-20` na `z-[60]` aby zawsze był nad sekcjami:
```tsx
// z-20 → z-[60]
```

