
# Poprawka wskaznika PWA na iOS - Safari vs Chrome

## Problem

Na iOS Safari przycisk "Udostepnij" znajduje sie na **dolnym** pasku narzedzi (srodek), ale skaczacy wskaznik jest ustawiony na `top-2 right-2` (gorny prawy rog). To prawidlowa pozycja tylko dla Chrome na iOS, gdzie przycisk udostepniania jest u gory.

## Rozwiazanie

Rozdzielic warunek `isIOS` w `renderArrowIndicator()` na dwa warianty:

1. **iOS Safari** (`isIOS && isSafari`): wskaznik na dole ekranu (`fixed bottom-16 left-1/2 -translate-x-1/2`) ze strzalka w dol (`ArrowDown`), wskazujacy na srodkowy przycisk udostepniania w dolnym pasku Safari.

2. **iOS Chrome / inne** (`isIOS && !isSafari`): wskaznik pozostaje na gorze (`fixed top-2 right-2`) ze strzalka w gore (`ArrowUp`), wskazujacy na ikone udostepniania w prawym gornym rogu.

## Zmiany techniczne

### Plik: `src/components/pwa/PWAInstallBanner.tsx`

**Import**: Dodanie `ArrowDown` z lucide-react (jesli jeszcze nie zaimportowany).

**W `renderArrowIndicator()` (linie 229-238)** — zamiana jednego bloku `if (isIOS)` na dwa:

```
// iOS Safari — przycisk Udostepnij na dolnym pasku
if (isIOS && isSafari) {
  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 ${indicatorStyle}`}>
      <Share className="h-4 w-4" />
      <span className="text-xs font-bold">Udostepnij</span>
      <ArrowDown className="h-5 w-5" />
    </div>
  );
}

// iOS Chrome / inne — przycisk Udostepnij na gornym pasku
if (isIOS) {
  return (
    <div className={`fixed top-2 right-2 ${indicatorStyle}`}>
      <Share className="h-4 w-4" />
      <span className="text-xs font-bold">Udostepnij</span>
      <ArrowUp className="h-5 w-5" />
    </div>
  );
}
```

Pozycja `bottom-20` zapewni, ze wskaznik bedzie tuz nad dolnym paskiem nawigacji Safari, a `left-1/2 -translate-x-1/2` wycentruje go nad przyciskiem udostepniania.
