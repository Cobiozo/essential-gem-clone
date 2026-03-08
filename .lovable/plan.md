

# Plan: Poprawa kalendarza — więcej kropek + cieniowanie dni z wydarzeniami

## Problem
Kalendarz pokazuje max 3 kropki na dzień (`slice(0, 3)`), więc dni z >3 wydarzeniami nie odzwierciedlają rzeczywistej liczby. Ponadto brak wizualnego wyróżnienia dni z wydarzeniami — trudno je odróżnić na pierwszy rzut oka.

## Rozwiązanie

### `src/components/dashboard/widgets/CalendarWidget.tsx`

1. **Usunąć limit `slice(0, 3)`** — wyświetlać kropki dla wszystkich wydarzeń na dany dzień
2. **Przepełnienie kropek**: jeśli >4 wydarzenia → pokazać 4 kropki + małą liczbę (np. "+2") lub rozłożyć kropki w 2 rzędy (nad i pod cyfrą dnia)
3. **Cieniowanie dni z wydarzeniami** — dodać subtelne tło (np. `bg-muted/40` lub lekki gradient) do dni, które mają wydarzenia, w stylu zbliżonym do wrzuconego screena (lekko szare/podświetlone komórki)
4. **Zwiększyć wysokość komórki** z `h-8` na `h-10` aby zmieścić kropki bez nakładania się na cyfrę
5. **Układ kropek**: do 4 kropek — jeden rząd pod cyfrą; 5+ — dwa rzędy (3+reszta) lub rząd pod + rząd nad cyfrą dnia

### Szczegóły techniczne

```text
Komórka kalendarza (h-10):
┌─────────┐
│  ● ●    │  ← dodatkowe kropki (jeśli >4)
│   15    │  ← cyfra dnia
│ ● ● ● ●│  ← dolny rząd kropek (do 4)
└─────────┘
```

- Dni z wydarzeniami: `bg-muted/30 dark:bg-muted/20` — subtelne cieniowanie
- Dzień dzisiejszy: zachować istniejący `bg-accent` ale mocniejszy
- Weekend (Sb, Nd): delikatnie wyszarzone tło `text-muted-foreground/70`
- Usuniecie `slice(0, 3)` → wyświetlanie wszystkich kropek, z max ~6 w widoku (reszta jako "+N")

### Plik do edycji:
1. `src/components/dashboard/widgets/CalendarWidget.tsx` — sekcja renderowania dni (linie 378-410)

