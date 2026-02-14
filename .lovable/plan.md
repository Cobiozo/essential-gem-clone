

# Baner aktualizacji Service Worker — "Dostępna nowa wersja aplikacji"

## Problem
Obecny kod w `main.tsx` automatycznie wysyla `SKIP_WAITING` do nowego Service Workera, co powoduje ciche odswiezenie w tle. Uzytkownik nie widzi zadnego baneru z informacja o nowej wersji — bo taki komponent nie istnieje.

## Rozwiazanie

### 1. Nowy komponent `src/components/pwa/SWUpdateBanner.tsx`
Baner wyswietlany na dole ekranu (fixed bottom), wyglad jak na przykladowym screenshocie:
- Tekst: **"Dostepna nowa wersja aplikacji"** + "Odswiez strone, aby korzystac z najnowszej wersji."
- Przycisk: **"Odswiez"**
- Po kliknieciu: wysyla `SKIP_WAITING` do nowego SW, nasluchuje na `controllerchange` i wykonuje `window.location.reload()`
- Komponent nasluchuje na customowy event `swUpdateAvailable` emitowany z `main.tsx`

### 2. Zmiana logiki w `src/main.tsx`
Zamiast automatycznego `newWorker.postMessage('SKIP_WAITING')`, emitowanie zdarzenia:
```text
PRZED: newWorker.postMessage('SKIP_WAITING')  // cicha aktualizacja
PO:    window.dispatchEvent(new CustomEvent('swUpdateAvailable'))  // pokaz baner
```
Referencja do `registration` zapisana globalnie (np. `window.__swRegistration`), aby komponent mogl pozniej wyslac `SKIP_WAITING`.

### 3. Osadzenie baneru w `src/App.tsx`
Dodanie `<SWUpdateBanner />` na koncu drzewa komponentow, obok istniejacych elementow globalnych (Toaster, CookieBanner itp.).

## Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/pwa/SWUpdateBanner.tsx` | Nowy komponent — nasluchuje na `swUpdateAvailable`, wyswietla baner, po kliknieciu "Odswiez" aktywuje nowy SW i przeladowuje strone |
| `src/main.tsx` | Zamiana `SKIP_WAITING` na `dispatchEvent('swUpdateAvailable')`, zapis referencji do SW registration |
| `src/App.tsx` | Import i dodanie `<SWUpdateBanner />` |

## Przepływ

```text
1. Uzytkownik otwiera strone -> SW rejestruje sie
2. Nowa wersja SW wykryta (updatefound) -> nowy SW w stanie 'installed'
3. main.tsx emituje event 'swUpdateAvailable'
4. SWUpdateBanner nasluchuje -> wyswietla baner na dole ekranu
5. Uzytkownik klika "Odswiez"
6. Komponent wysyla SKIP_WAITING do nowego SW
7. Nasłuch na 'controllerchange' -> window.location.reload()
```

## Wyglad baneru
Baner uzywa istniejacych komponentow UI (Card/Alert) z Tailwind, fixed na dole ekranu z cienkim cieniem. Styl zbliżony do screenshota: bialy/jasny background, czarny tekst, przycisk "Odswiez" po prawej stronie.
