

# Fix: Ucięcie prawego boku strony na iPadzie

## Problem

Zidentyfikowałem 3 przyczyny:

1. **Literówka w CSS** — linia 629 w `EventCardCompact.tsx` ma klasę `line-clamp-2mp-2mp-2` zamiast `line-clamp-2`. To powoduje, że klasa nie działa i tytuł nie jest poprawnie ograniczany.

2. **Brak overflow na opisie** — opis wydarzenia (HTML z `dangerouslySetInnerHTML`, linia 697-700) ma klasę `prose` ale brak `overflow-hidden break-words`. Długi tekst z pogrubieniami i bez spacji może wychodzić poza kontener.

3. **Brak overflow na karcie** — sam kontener karty (`border rounded-lg bg-card`, linia 608) nie ma `overflow-hidden`, więc nic nie obcina zawartości wychodzącej poza granice.

## Rozwiązanie

### `src/components/events/EventCardCompact.tsx`:

**Linia 608** — dodać `overflow-hidden` do kontenera karty:
```
className={`border rounded-lg bg-card overflow-hidden transition-all ...`}
```

**Linia 629** — naprawić literówkę:
```
line-clamp-2mp-2mp-2 → line-clamp-2
```

**Linia 698** — dodać overflow do opisu:
```
className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert overflow-hidden break-words"
```

### Pliki do edycji:
- `src/components/events/EventCardCompact.tsx` — 3 poprawki (literówka, overflow na karcie, overflow na opisie)

