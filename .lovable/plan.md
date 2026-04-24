## Problem 1 — żółty "Czytaj więcej" na hover

Przycisk "Czytaj więcej" / "Zwiń" w `src/components/paid-events/public/PaidEventSpeakers.tsx` używa `Button variant="ghost"`. Wariant ghost ma globalnie ustawione `hover:bg-accent hover:text-accent-foreground` — w tym motywie kolor `accent` jest żółty (primary), przez co cały przycisk staje się żółty na żółtym tekście i tekst znika.

**Fix:** Nadpisać tło hover na neutralne i utrzymać kolor primary dla tekstu.

W `PaidEventSpeakers.tsx` na przycisku zmienić klasy:
- z: `mt-2 h-8 text-primary hover:text-primary`
- na: `mt-2 h-8 text-primary hover:text-primary hover:bg-primary/10`

Dzięki temu na hover pojawi się delikatne żółte podświetlenie (10% opacity), tekst pozostanie czytelny (primary), a nie zostanie nadpisany przez `accent-foreground`.

## Problem 2 — link do strony wydarzenia z formularza rejestracji

Strona `/events/:slug` (PaidEventPage) jest **publiczna** — niezalogowani widzą ją bez problemu. Wystarczy z formularza rejestracji (`src/pages/EventGuestRegistration.tsx`) dodać przycisk linkujący do tej strony.

Dane są już dostępne: pobierany rekord eventu zawiera pole `slug` (linia 274). 

**Fix:** Pod głównym przyciskiem submit (linia ~992, `<Button type="submit">`) dodać warunkowo dodatkowy outline button:

```tsx
{event.slug && (
  <Button
    type="button"
    variant="outline"
    className="w-full"
    onClick={() => window.open(`/events/${event.slug}`, '_blank')}
  >
    Dowiedz się więcej na temat wydarzenia
  </Button>
)}
```

Otwarcie w nowej karcie zachowuje stan formularza rejestracji.

## Pliki do edycji

1. `src/components/paid-events/public/PaidEventSpeakers.tsx` — naprawa hover na "Czytaj więcej" / "Zwiń".
2. `src/pages/EventGuestRegistration.tsx` — dodanie przycisku "Dowiedz się więcej na temat wydarzenia" pod przyciskiem rejestracji (otwiera `/events/{slug}` w nowej karcie, widoczne tylko gdy event ma slug).