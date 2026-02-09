
# Poprawki banera instalacji PWA - pozycja i wskazowki

## Podsumowanie

Trzy zmiany w banerze instalacji PWA:
1. Przeniesienie banera z dolu na gore ekranu
2. Automatyczne ukrycie banera po przejsciu na strone `/install`
3. Dodanie animowanej strzalki wskazujacej na lewy gorny rog (pasek adresu przegladarki), gdzie znajduje sie ikona instalacji

## Zmiany techniczne

### 1. `src/components/pwa/PWAInstallBanner.tsx`

**Pozycja**: Zmiana z `fixed bottom-4` na `fixed top-4` z animacja `slide-in-from-top-4` (zamiast `slide-in-from-bottom-4`). Na mobilkach baner bedzie tuz pod paskiem przegladarki, co wizualnie sugeruje polaczenie z ikonami przegladarki.

**Ukrycie na /install**: Dodanie `/install` do listy sciezek, na ktorych baner sie nie wyswietla. Gdy uzytkownik kliknie "Zobacz instrukcje" i przejdzie na `/install`, baner automatycznie zniknie (bo React Router zmieni `location.pathname`).

**Wskaznik na ikone instalacji**: Dla wariantu desktop (nie iOS, nie Android) - dodanie animowanego elementu ze strzalka skierowana w gore-lewo z tekstem "Kliknij ikone instalacji w pasku adresu". Strzalka bedzie pulsowac/migac, aby przyciagnac uwage uzytkownika do odpowiedniego miejsca w przegladarce.

Na iOS strzalka wskazuje na ikone udostepniania (dol ekranu lub gorny prawy rog w zaleznosci od wersji Safari).

### 2. Szczegoly implementacji

Zmienione elementy w `PWAInstallBanner.tsx`:
- Linia 126: `fixed bottom-4` zmieniona na `fixed top-16` (pod headerem dashboardu) z `slide-in-from-top-4`
- Linia 57-58: Dodanie `'/install'` do listy sciezek ukrywajacych baner
- Nowy element UI: animowana strzalka (CSS `animate-bounce` lub custom animation) wskazujaca kierunek ikony instalacji w pasku przegladarki
- Na desktopie: strzalka w gore-prawo z tekstem "Szukaj ikony instalacji w pasku adresu"
- Na iOS: strzalka w dol (do ikony Share na dole Safari) lub w gore-prawo
- Tekst banera zaktualizowany aby jasno wskazywac co kliknac

### Pliki do edycji

- `src/components/pwa/PWAInstallBanner.tsx` - pozycja, ukrywanie na /install, animowana strzalka
