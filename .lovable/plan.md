

# Precyzyjne wskazywanie ikony instalacji w zaleznosci od przegladarki

## Podsumowanie

Rozbudowa detekcji przegladarki i dopasowanie pozycji animowanej strzalki do konkretnego miejsca, w ktorym dana przegladarka wyswietla ikone instalacji PWA.

## Lokalizacja ikony instalacji w roznych przegladarkach

| Przegladarka | Gdzie jest ikona | Pozycja strzalki |
|---|---|---|
| Chrome (desktop) | Prawa strona paska adresu (ikona monitora ze strzalka) | Gora-prawo, blisko paska adresu |
| Edge (desktop) | Prawa strona paska adresu (ikona "App available") | Gora-prawo, blisko paska adresu |
| Chrome (Android) | Menu (trzy kropki) prawy gorny rog | Gora-prawo z tekstem "Menu > Zainstaluj" |
| Samsung Internet | Menu (trzy kreski) prawy dolny rog | Dol-prawo |
| Safari (iOS) | Ikona "Udostepnij" (kwadrat ze strzalka) na dolnym pasku | Dol-srodek |
| Safari (macOS) | Brak natywnej ikony - menu Plik lub przycisk Share | Gora-lewo z instrukcja tekstowa |
| Firefox (desktop) | Brak natywnej obslugi PWA | Link do strony /install |
| Opera (desktop) | Prawa strona paska adresu (jesli wspierane) | Gora-prawo |

## Zmiany techniczne

### 1. Rozbudowa detekcji przegladarki (`usePWAInstall.ts`)

Dodanie szczegolowej detekcji przegladarki:

```
isChrome: boolean    // Chrome (nie Edge, nie Opera)
isEdge: boolean      // Microsoft Edge
isFirefox: boolean   // Firefox
isOpera: boolean     // Opera
isSamsungBrowser: boolean  // Samsung Internet
```

Detekcja oparta na `navigator.userAgent` - juz czesciowo zaimplementowana (isIOS, isAndroid, isSafari).

### 2. Warianty strzalki w banerze (`PWAInstallBanner.tsx`)

Zamiast dwoch wariantow (iOS / reszta), wprowadzenie 5-6 wariantow pozycji strzalki:

**a) Chrome/Edge/Opera desktop** (`canInstall = true`):
- Strzalka `ArrowUp` wyrownana do prawej (`justify-end pr-8`)
- Tekst: "Kliknij ikone instalacji w pasku adresu"
- Pozycja: prawy gorny rog ekranu

**b) Chrome Android** (`isAndroid && isChrome`):
- Strzalka `ArrowUp` skierowana w prawo-gore
- Tekst: "Menu (⋮) > Zainstaluj aplikacje"
- Pozycja: prawy gorny rog

**c) Samsung Internet Android** (`isSamsungBrowser`):
- Strzalka `ArrowDown` skierowana w prawo-dol
- Tekst: "Menu (☰) > Dodaj do ekranu"
- Pozycja: prawy dolny rog

**d) Safari iOS** (`isIOS`):
- Strzalka `ArrowDown` skierowana na dol-srodek
- Tekst: "Udostepnij > Dodaj do ekranu glownego"
- Pozycja: dolny srodek ekranu (nad paskiem Safari)

**e) Safari macOS** (`isSafari && !isIOS`):
- Strzalka `ArrowUp` skierowana w gore
- Tekst: "Dodaj do Docka z menu Plik lub przez przycisk Udostepnij"
- Pozycja: gora ekranu

**f) Firefox / inne** (fallback):
- Brak strzalki kierunkowej
- Tekst: "Ta przegladarka nie wspiera bezposredniej instalacji"
- Link: "Zobacz instrukcje" do /install

### 3. Pozycjonowanie strzalek niezaleznie od banera

Strzalki beda w osobnych kontenerach `fixed` z odpowiednim pozycjonowaniem:
- `fixed top-1 right-8` - dla Chrome/Edge desktop
- `fixed top-1 right-4` - dla Android Chrome (menu w prawym gornym rogu)
- `fixed bottom-16 right-4` - dla Samsung Internet
- `fixed bottom-12 left-1/2 -translate-x-1/2` - dla iOS Safari (srodek dolu)

Baner pozostanie w `fixed top-2 left-4 right-4 max-w-md mx-auto`.

## Pliki do edycji

1. **`src/hooks/usePWAInstall.ts`** - dodanie detekcji Chrome, Edge, Firefox, Opera, Samsung Internet
2. **`src/components/pwa/PWAInstallBanner.tsx`** - rozbudowa wariantow strzalek z precyzyjnym pozycjonowaniem per przegladarka

