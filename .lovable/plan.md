
# Dodanie linku do pelnej instrukcji w banerze PWA

## Problem

Baner instalacji PWA na dashboardzie pokazuje tylko krotka instrukcje dla wykrytej przegladarki (np. "Kliknij ikone w pasku adresu"), ale brakuje linku do pelnej strony z instrukcjami dla wszystkich przegladarek i systemow (strona `/install`).

## Rozwiazanie

Dodanie linku "Zobacz pelna instrukcje" do kazdego wariantu `renderContent()` w banerze, ktory prowadzi do strony `/install` z instrukcjami dla wszystkich platform (iOS Safari, Android Chrome, Edge, Opera, Safari macOS, Firefox itd.).

### Plik: `src/components/pwa/PWAInstallBanner.tsx`

W kazdym wariancie `renderContent()` (Edge, Chrome, Opera, Safari, iOS, Android, fallback) dodanie na koncu linku:

```
<a href="/install" className="text-xs text-primary underline">
  Zobacz instrukcje dla wszystkich przegladarek
</a>
```

Konkretne zmiany:

1. **iOS Safari** (linie 59-78): Dodanie linku pod istniejaca instrukcja
2. **Android Samsung Internet** (linie 81-91): Dodanie linku przed przyciskiem "Nie teraz"
3. **Android Chrome** (linie 95-106): Dodanie linku
4. **Edge desktop** (linie 109-128): Dodanie linku
5. **Chrome desktop** (linie 131-144): Dodanie linku
6. **Opera desktop** (linie 147-160): Dodanie linku
7. **Generic canInstall** (linie 163-180): Dodanie linku
8. **Safari macOS** (linie 183-196): Dodanie linku
9. **Fallback** (linie 199-216): Juz ma link do `/install` - zostaje bez zmian

Kazdy wariant bedzie mial strukture:
- Krotka instrukcja specyficzna dla przegladarki (jak jest teraz)
- Link "Instrukcje dla innych przegladarek" prowadzacy do `/install`
- Przyciski (Zainstaluj / Nie teraz)
