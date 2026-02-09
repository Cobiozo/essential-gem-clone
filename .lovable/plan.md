
# Poprawka banera PWA - widocznosc i tryb testowy

## Problem

Baner nie pojawia sie w podgladzie Lovable, poniewaz:
1. Podglad dziala w iframe - zdarzenie `beforeinstallprompt` nie wystrzeliwuje w iframe
2. Na desktopie (nie-iOS) warunek `!canInstall && !isIOS` powoduje ukrycie banera
3. Po opublikowaniu baner powinien dzialac, ale warto to zweryfikowac

## Proponowane zmiany

### 1. Zmiana logiki wyswietlania banera (`PWAInstallBanner.tsx`)

Zamiast calkowicie ukrywac baner gdy `beforeinstallprompt` nie jest dostepne, pokazac wersje z linkiem do strony `/install` (instrukcja recznej instalacji). Dzieki temu:
- Na Chrome/Edge: przycisk "Zainstaluj" (natywny prompt)
- Na Firefox/Safari desktop: link "Zobacz jak zainstalowac" kierujacy do `/install`
- Na iOS: instrukcja z ikonami Share/Dodaj do ekranu
- Baner bedzie widoczny dla **kazdego zalogowanego uzytkownika** na nie-standalone przegladarce

Zmiana warunku z linii 46:
```
// BYLO:
if (!canInstall && !isIOS) return null;

// BEDZIE:
// Baner pokazuje sie zawsze (jesli user zalogowany, nie zainstalowane, nie odrzucone)
// Rozna tresc w zaleznosci od platformy
```

### 2. Trzy warianty tresci banera

- **canInstall = true** (Chrome/Edge): przycisk "Zainstaluj" wywolujacy natywny dialog
- **isIOS = true**: instrukcja iOS (Udostepnij > Dodaj do ekranu)
- **Pozostale** (Firefox, Safari desktop, inne): tekst zachecajacy + link "Zobacz instrukcje" do `/install`

### 3. Pliki do edycji

- `src/components/pwa/PWAInstallBanner.tsx` - usunac restrykcyjny warunek, dodac trzeci wariant tresci z linkiem do /install

## Efekt

Baner bedzie widoczny dla kazdego zalogowanego uzytkownika ktory nie ma zainstalowanej aplikacji (niezaleznie od przegladarki), z odpowiednia trescia dopasowana do platformy.
