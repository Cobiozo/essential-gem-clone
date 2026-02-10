

# Poprawka animowanej strzalki instalacji PWA

## Problem

Strzalki wskazujace miejsce instalacji w przegladarce sa pozycjonowane na `top-1`, co moze powodowac, ze sa niewidoczne lub nachodzą na pasek adresu przegladarki. Na zrzucie ekranu (desktop Edge/Chrome) baner jest widoczny, ale brak skaczacej strzalki z napisem "Kliknij i zainstaluj" wskazujacej na ikone instalacji w pasku adresu.

## Rozwiazanie

### Plik: `src/components/pwa/PWAInstallBanner.tsx`

Zmiana pozycjonowania i stylu wszystkich wariantow strzalek, aby byly wyrazne i widoczne na kazdej platformie:

1. **Wszystkie strzalki**: Przesunac z `top-1` na `top-2` lub `top-3`, aby nie chowaly sie za paskiem przegladarki. Dodac wyrazniejszy styl - wieksza czcionke, mocniejsze tlo, wieksza strzalke.

2. **Desktop Chrome/Edge/Opera** (`canInstall`):
   - Pozycja: `fixed top-2 right-12` - celuje w prawy gorny rog, blisko ikon rozszerzen/instalacji
   - Tekst: "Kliknij i zainstaluj ↑" z animacja `animate-bounce`
   - Strzalka `ArrowUp` skierowana w gore

3. **Desktop Chrome/Edge bez `canInstall`** (brak natywnego prompta):
   - Pozycja: `fixed top-2 right-4` - celuje w menu przegladarki
   - Tekst: "Menu > Zainstaluj" z `ArrowUp`

4. **Android Chrome** (bez natywnego prompta):
   - Pozycja: `fixed top-2 right-2`
   - Tekst: "Menu (⋮) > Zainstaluj"

5. **Samsung Internet**:
   - Pozycja: `fixed bottom-16 right-4`
   - Tekst: "Menu (☰)"

6. **iOS Safari**:
   - Pozycja: `fixed top-2 right-2` (Share jest na gorze w nowym Safari)
   - Tekst: "Udostepnij"

7. **Safari macOS**:
   - Pozycja: `fixed top-2 right-24`
   - Tekst: "Udostepnij"

8. **Styl wskaznika**: Kazdy wskaznik bedzie mial wiekszy padding, wyrazniejsze tlo (`bg-primary text-primary-foreground` zamiast obecnego `bg-background/90`), i wieksza ikone strzalki (`h-7 w-7`), zeby byl dobrze widoczny na wszystkich urzadzeniach.

9. **Fallback** (Firefox/inne bez obslugi PWA): Brak strzalki - baner sam w sobie wystarczy z linkiem do `/install`.

### Zmiany w kodzie

- Linie 160-224: Przepisanie `renderArrowIndicator()` z wiekszymi, wyrazniejszymi elementami
- Kazdy wariant: wiekszy font (`text-sm` zamiast `text-xs`), mocniejsze kolory, wieksza strzalka
- Dodanie wariantu dla desktop Chrome/Edge bez `canInstall` (fallback do menu przegladarki)

### Pliki do edycji

- `src/components/pwa/PWAInstallBanner.tsx`

