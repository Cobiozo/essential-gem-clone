## Diagnoza

Sprawdziłem dane w bazie (`get_user_city_counts()`). Wartości w kolumnie `country` są w różnych językach/zapisach:

```
Polska(72), Niemcy(8), Deutschland(3), Holandia(3), Wielka Brytania(2),
Italia(2), Norge(2), Belgia(2), Austria(2), Norwegia(2), Portugal(1),
Slovensko(1), NIEMCY(1), United Kingdom(1), Jersey chanel island(1)
```

W `src/lib/countryFlags.ts` mapa `NAME_TO_ISO` nie zawiera wariantów takich jak `italia`, `norge`, `slovensko`. W rezultacie:

- World-atlas dla geografii Włoch zwraca nazwę „Italy" → `normalizeCountry("Italy").iso = "IT"` → `selectedIso = "IT"`.
- Punkty w DB mają `country = "Italia"` → `normalizeCountry("Italia").iso = null` (bo brak w mapie i długość ≠ 2).
- Filtr `visiblePoints` w `UserWorldMap.tsx`:
  ```ts
  points.filter((p) => normalizeCountry(p.country).iso === selectedIso)
  ```
  daje pustą tablicę → kropki znikają po kliknięciu kraju.

To samo dotyczy: Norge (NO), Slovensko (SK), Jersey chanel island (GB/JE).

## Fix

### 1) `src/lib/countryFlags.ts` — rozszerzyć `NAME_TO_ISO` o brakujące warianty
Dodać (w istniejących liniach + nowe):
- `italia: 'IT'` (Włochy po włosku)
- `norge: 'NO'`, `noreg: 'NO'` (Norwegia po norwesku)
- `slovensko: 'SK'` (Słowacja po słowacku)
- `jersey: 'GB'`, `'jersey chanel island': 'GB'`, `'jersey channel island': 'GB'`, `'channel islands': 'GB'`
- Inne częste warianty natywne: `česko: 'CZ'`, `cesko: 'CZ'`, `magyarország: 'HU'`, `magyarorszag: 'HU'`, `españa: 'ES'`, `espana: 'ES'`, `österreich: 'AT'`, `osterreich: 'AT'`, `belgique: 'BE'`, `belgië: 'BE'`, `nederland: 'NL'`, `suomi: 'FI'`, `sverige: 'SE'`, `danmark: 'DK'`, `eesti: 'EE'`, `lietuva: 'LT'`, `latvija: 'LV'`, `україна: 'UA'`, `ελλάδα: 'GR'`, `ellada: 'GR'`, `hellas: 'GR'`, `românia: 'RO'`, `romania: 'RO'` (już jest), `schweiz: 'CH'`, `suisse: 'CH'`, `svizzera: 'CH'`, `portugal: 'PT'` (już jest).

### 2) Bez zmian w `UserWorldMap.tsx`
Logika filtra jest poprawna — wystarczy uzupełnić słownik.

## Brak regresji
- Mapa to czysta funkcja czytająca tylko ten słownik; rozszerzenie nie zmienia istniejących mapowań.
- Inne miejsca w aplikacji używające `normalizeCountry`/`countryFlag` skorzystają z lepszego pokrycia (więcej krajów dostanie flagę i ISO).