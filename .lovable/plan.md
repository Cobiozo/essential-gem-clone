
# Poprawki wskaznikow PWA na Edge i Chrome desktop

## Problem 1: Edge desktop — wskaznik zaslania przycisk X banera
Skaczacy wskaznik `right-[220px]` naklada sie na przycisk zamykania (X) banera, ktory jest ustawiony na `right-[280px]`. Trzeba przesunac wskaznik bardziej w prawo, blizej faktycznej ikony instalacji w pasku adresu Edge.

## Problem 2: Chrome desktop — bledna instrukcja
Gdy Chrome ma dostepny prompt instalacji (`canInstall`), wskaznik poprawnie wskazuje ikone monitora obok gwiazdki. Ale gdy `canInstall` jest false, wyswietla sie "trzy kropeczki -> Zainstaluj" zamiast wskazywac ikone monitora ze strzalka w pasku adresu. Na screenie widac, ze ikona instalacji (monitor) jest dostepna — wiec Chrome desktop powinien zawsze wskazywac te ikone, nie menu z trzema kropkami.

## Zmiany techniczne

### Plik: `src/components/pwa/PWAInstallBanner.tsx`

**1. Edge desktop (obie wersje canInstall/no canInstall, linie 273-314):**
- Przesunac wskaznik z `right-[220px]` na `right-[140px]` — blizej prawego rogu, gdzie faktycznie znajduje sie ikona instalacji w Edge (widoczna na screenie)

**2. Chrome desktop no canInstall (linie 316-324):**
- Zmienic tekst z "trzy kropeczki -> Zainstaluj" na ikone monitora ze strzalka i tekst "Zainstaluj"
- Zmienic pozycje z `right-4` na `right-12` — aby wskazywac ikone monitora obok gwiazdki w pasku adresu
- Uzyc ikony `Download` zamiast tekstu "trzy kropeczki"
- Zmienic tresc banera w `renderContent()` (wariant Chrome desktop no canInstall, linie 131-144) — zamiast "Otworz menu i wybierz Zainstaluj aplikacje" na "Kliknij ikone instalacji w pasku adresu" (ikona monitora ze strzalka, obok gwiazdki)

### Szczegoly zmian:

**Wskaznik Edge (linie 275, 308):** `right-[220px]` zamienione na `right-[140px]`

**Wskaznik Chrome no canInstall (linie 317-323):**
```
if (isChrome && !isAndroid && !canInstall) {
  return (
    <div className={`fixed top-2 right-12 ${indicatorStyle}`}>
      <Download className="h-4 w-4" />
      <span className="text-xs font-bold">Zainstaluj</span>
      <ArrowUp className="h-5 w-5" />
    </div>
  );
}
```

**Tresc banera Chrome no canInstall (linie 131-144):**
Zamiana tekstu z "Otworz menu i wybierz Zainstaluj aplikacje" na "Kliknij ikone instalacji (monitor ze strzalka) w pasku adresu, obok gwiazdki."
