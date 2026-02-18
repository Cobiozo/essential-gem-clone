

# Przywrocenie promptu instalacji PWA (Chrome / Android)

## Diagnoza

Manifest (`manifest.json`), ikony PWA, service worker (`sw-push.js`) i jego rejestracja w `main.tsx` sa poprawnie skonfigurowane. Kod spelnia wszystkie wymagania Chrome do wyzwolenia zdarzenia `beforeinstallprompt`:
- manifest z `name`, `short_name`, `start_url`, `display: standalone`, ikonami 192px i 512px
- service worker z obsluga `fetch`
- strona serwowana po HTTPS

Prawdopodobna przyczyna: stary service worker w cache przegladarki blokuje aktualizacje. Rozwiazanie to wymuszenie aktualizacji przez zwiekszenie wersji cache.

## Plan zmian

### 1. Zwiekszenie wersji cache w `sw-push.js`

Zmienic nazwe glownego cache statycznego z `purelife-static-v2` na `purelife-static-v3`. To wymusi usuniecie starego cache i ponowne pobranie manifestu oraz ikon.

**Plik:** `public/sw-push.js`
- Linia 7: `purelife-static-v2` -> `purelife-static-v3`
- Linia 10: Zaktualizowac tablice `ALL_CACHES` odpowiednio

### 2. Dodanie `screenshots` do manifestu (wymagane od Chrome 118+ na Android)

Od Chrome 118 na Androidzie, brak pola `screenshots` w manifescie moze powodowac wyswietlenie mniej widocznego "mini-infobar" zamiast pelnego promptu instalacji. Dodanie co najmniej jednego screenshotu powoduje wyswietlenie pelnego, ladniejszego dialogu instalacji ("richer install UI").

**Plik:** `public/manifest.json`
- Dodac pole `screenshots` z co najmniej jednym zrzutem ekranu (mozna uzyc istniejacego obrazu OG lub jednego ze zdjec referencyjnych)

**Uwaga:** Puste `screenshots: []` blokuje prompt calkowicie (naprawione wczesniej). Natomiast calkowity brak pola `screenshots` jest bezpieczny - prompt dziala, ale bez rozszerzonego dialogu.

### 3. Sprawdzenie czy stara wersja SW nie blokuje promptu

Dodac log diagnostyczny w service workerze przy aktywacji, zeby potwierdzic ze nowa wersja zostala zaladowana.

## Podsumowanie

Zmiany sa minimalne (2 pliki, kilka linii). Glownym celem jest wymuszenie odswiezenia service workera przez zmiane wersji cache, co powinno przywrocic zdarzenie `beforeinstallprompt` w Chrome i na Androidzie.

