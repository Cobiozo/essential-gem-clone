
# Kolorystyka lekcji w liście: żółta/zielona ramka + czerwone ikonki

## Co się zmieni

Na stronie modułu szkoleniowego (`TrainingModule.tsx`) lista lekcji (zarówno mobilna jak i desktopowa) otrzyma nową kolorystykę:

1. **Aktualnie oglądana lekcja** -- żółta ramka (`border-yellow-500`) + lekkie żółte tło
2. **Zaliczona lekcja** -- zielona ramka (`border-green-500`) + lekkie zielone tło  
3. **Niezaliczona lekcja (nie bieżąca)** -- brak kolorowej ramki, ale ikonki (kamerka, kłódka, dokument) w kolorze **czerwonym**

## Szczegóły techniczne

### Plik: `src/pages/TrainingModule.tsx`

**Zmiana w klasach CSS przycisków lekcji** (dwa miejsca: mobilna lista ~linia 1351 i desktopowa ~linia 1414):

Obecna logika:
```
isCurrent  -> 'border-primary bg-primary/5'
isLocked   -> 'border-muted bg-muted/30 cursor-not-allowed opacity-60'
default    -> 'border-border hover:border-primary/50'
```

Nowa logika:
```
isCurrent    -> 'border-yellow-500 bg-yellow-500/10'        (żółta ramka)
isCompleted  -> 'border-green-500 bg-green-500/5'           (zielona ramka)
isLocked     -> 'border-border bg-muted/30 cursor-not-allowed opacity-60'  (bez kolorowej ramki)
default      -> 'border-border hover:border-yellow-500/50'  (bez ramki, hover żółty)
```

**Zmiana kolorów ikonek** (dwa miejsca: mobilna ~linia 1360 i desktopowa ~linia 1422):

Obecne:
- Kłódka: `text-muted-foreground`
- Kamerka/inne: brak koloru (domyślny)

Nowe:
- Kłódka (`Lock`): `text-red-500`
- Ikonki mediów (kamerka `Video`, `Volume2`, `File`, `FileText`): `text-red-500` -- zmiana w `getMediaIcon` lub bezpośrednio w renderze dla niezaliczonych lekcji
- Zaliczone (`CheckCircle`): zostaje `text-green-600` (bez zmian)

**Zmiana w `getMediaIcon`** -- nie zmieniamy samej funkcji, ale w renderze dodajemy czerwony kolor do spanu owijającego ikonkę gdy lekcja nie jest zaliczona:
```tsx
<span className="flex-shrink-0 text-red-500">{getMediaIcon(lesson.media_type)}</span>
```

## Podsumowanie zmian
- 1 plik: `src/pages/TrainingModule.tsx`
- 2 sekcje (mobilna + desktopowa lista lekcji) -- identyczne zmiany w obu
- Zmiana klas CSS ramek (border) i tła (bg) przycisków lekcji
- Zmiana koloru ikonek kłódki i mediów na czerwony dla niezaliczonych lekcji
