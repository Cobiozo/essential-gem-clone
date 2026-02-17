

# Naprawa dlugiego buforowania przy wznawianiu od 8:24

## Diagnoza

Gdy wideo wznawia od pozycji 504s (8:24):
1. `isInitialBuffering = true` — blokuje przycisk Play i pokazuje "Buforowanie..."
2. Przegladarka wysyla `canplaythrough` / `canplay` event — znaczy ze mozna odtwarzac
3. ALE handler `handleCanPlay` sprawdza `bufferedAheadValue >= targetBuffer * 0.7` — jesli bufor przy 504s jest jeszcze maly, flaga zostaje `true`
4. Uzytkownik widzi "Buforowanie 81%" mimo ze przegladarka jest gotowa do odtwarzania

**Glowny problem:** `handleCanPlay` powinien **bezwarunkowo** zdjac `isInitialBuffering` — jesli przegladarka mowi "can play", to znaczy ze moze odtwarzac. Sprawdzanie bufora jest redundantne i blokujace.

## Rozwiazanie

W `handleCanPlay` (linia ~713): jesli `isInitialBuffering` jest true, **zawsze** ustawic na false — bez sprawdzania progow bufora. Przegladarka sama wie kiedy ma wystarczajaco danych.

## Zmiany techniczne

### `src/components/SecureMedia.tsx`

**handleCanPlay (~linia 765):** Zmiana warunkowego odblokowania na bezwarunkowe:

```text
PRZED:
  if (isInitialBuffering && (bufferedAheadValue >= targetBuffer * 0.7 || progress >= 70)) {
    console.log('[SecureMedia] Initial buffer complete via canPlay');
    setIsInitialBuffering(false);
  }

PO:
  if (isInitialBuffering) {
    console.log('[SecureMedia] Initial buffer complete via canPlay (browser ready)');
    setIsInitialBuffering(false);
  }
```

Logika w `handleProgress` (~linia 810) zostaje bez zmian — to jest dodatkowy fallback gdyby `canPlay` nie wystrzelil.

## Wplyw

- Wideo zacznie sie odtwarzac natychmiast po `canPlay` event, bez czekania na procent bufora
- Na wolnych sieciach smart buffering (`handleWaiting`) nadal zadziala jesli wideo sie zacina po starcie
- Zero ryzyka regresji — `canPlay` jest standardowy event przegladarki oznaczajacy gotowosc

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Bezwarunkowe zdejmowanie `isInitialBuffering` w `handleCanPlay` |
