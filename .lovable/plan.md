

# Poprawki wskaznika PWA - precyzja Edge + instrukcje per przeglądarka

## Problem 1: Strzalka w Edge wskazuje za daleko w prawo

Na zrzucie widac, ze ikona instalacji Edge (trzy kwadraciki z plusem) jest w pasku adresowym, na lewo od ikon rozszerzen — mniej wiecej w okolicy `right-[220px]`. Obecne `right-[140px]` jest za blisko prawej krawedzi.

**Zmiana**: Przesunac strzalke Edge na `right-[220px]` i dodac dedykowana ikonke (Grid2x2Plus z lucide lub emoji ⊞) zamiast ogolnej Download, aby uzytkownik jasno widzial, czego szukac.

## Problem 2: Baner powinien miec instrukcje dedykowane kazdej przegladarce

Obecny `renderContent()` dla `canInstall` pokazuje ogolny tekst "Szybki dostep z ekranu glownego". Trzeba rozdzielic na warianty per przeglądarka z konkretnymi instrukcjami:

### Nowa logika `renderContent()`:

1. **iOS Safari**: "Kliknij Udostepnij → Do ekranu glownego" (juz jest OK)
2. **Android Samsung Internet**: "Menu na dolnym pasku → Dodaj strone do → Ekran startowy" (juz jest OK)
3. **Android Chrome (bez prompta)**: "Menu ⋮ → Zainstaluj aplikacje" (juz jest OK)
4. **Edge desktop (canInstall)**: "Kliknij ikone ⊞ w pasku adresu, aby zainstalowac" + przycisk Zainstaluj
5. **Chrome desktop (canInstall)**: "Kliknij ikone instalacji w pasku adresu" + przycisk Zainstaluj
6. **Opera desktop (canInstall)**: "Kliknij ikone instalacji w pasku adresu" + przycisk Zainstaluj
7. **Edge desktop (bez canInstall)**: "Kliknij ikone ⊞ w pasku adresu"
8. **Chrome desktop (bez canInstall)**: "Menu ⋮ → Zainstaluj aplikacje"
9. **Opera desktop (bez canInstall)**: "Menu → Zainstaluj aplikacje"
10. **Safari macOS**: "Udostepnij → Dodaj do Docka" (juz jest OK)
11. **Firefox / inne**: Link do /install (juz jest OK)

### Zmiana w `renderContent()`:

Dodanie warunkow `isEdge`, `isChrome`, `isOpera` przed ogolnym `canInstall`, aby kazda przegladarka miala wlasna instrukcje z odpowiednia ikona.

## Problem 3: Strzalka Opera nie wyswietla sie

Opera moze nie emitowac `beforeinstallprompt`, wiec `canInstall` jest `false`. Wariant `isOpera && !canInstall` juz istnieje w kodzie (linia 249), wiec strzalka powinna sie pokazywac. Potencjalny problem: Opera moze byc wykrywana jako Chrome. Sprawdze kolejnosc detekcji w `usePWAInstall` — `isOpera` jest sprawdzane przed `isChrome`, wiec to powinno dzialac. Dodam `console.log` do debugowania w komentarzu.

## Zmiany techniczne

### Plik: `src/components/pwa/PWAInstallBanner.tsx`

1. **Strzalka Edge**: zmiana pozycji z `right-[140px]` na `right-[220px]` (oba warianty: canInstall i bez)
2. **Ikona Edge w strzalce**: zmiana z `<Download>` na tekst "⊞" lub import `LayoutGrid` z lucide + PlusSquare, aby symbolizowac ikone Edge
3. **renderContent() - rozbicie warunku `canInstall`**: 
   - Dodanie `if (isEdge && !isAndroid && canInstall)` z tekstem "Kliknij ikone ⊞ w pasku adresu" + przycisk Zainstaluj
   - Dodanie `if (isEdge && !isAndroid && !canInstall)` z tekstem "Kliknij ikone ⊞ w pasku adresu"
   - Dodanie `if (isChrome && !isAndroid && !canInstall)` z tekstem "Menu ⋮ → Zainstaluj"
   - Dodanie `if (isOpera && !isAndroid && !canInstall)` z tekstem "Menu → Zainstaluj"
   - Ogolny `canInstall` pozostaje jako fallback dla Chrome/Opera desktop z promptem
4. **Baner pozycja**: przesunac jeszcze bardziej w lewo na desktopie — `right-[260px]` lub wiecej, aby nie nachodzil na strzalke w Edge

### Kolejnosc warunkow w `renderContent()`:

```
1. isIOS
2. isAndroid && isSamsungBrowser
3. isAndroid && isChrome && !canInstall
4. isEdge && !isAndroid (canInstall lub nie)
5. isChrome && !isAndroid && !canInstall
6. isOpera && !isAndroid && !canInstall
7. canInstall (ogolny fallback - Chrome/Opera z promptem)
8. isSafari && !isIOS
9. fallback (Firefox/inne → link /install)
```

### Plik do edycji

- `src/components/pwa/PWAInstallBanner.tsx`

