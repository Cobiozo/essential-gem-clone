

# Reorganizacja przycisków w sekcji "Kontakty prywatne"

## Problem

Obecnie w nagłówku karty jest zbyt wiele elementów w jednym rzędzie: tytuł, opis, toggle widoku, Filtry, Eksport, Dodaj kontakt — wszystko w jednym `flex-wrap`. Wygląda to chaotycznie, szczególnie przy mniejszych rozdzielczościach.

## Proponowane rozwiązanie

Przeorganizować nagłówek na **dwa wyraźne rzędy**:

```text
┌─────────────────────────────────────────────────────────────┐
│  🔗 Kontakty prywatne                    [+ Dodaj kontakt] │
│  Osoby spoza systemu - potencjalni klienci...               │
├─────────────────────────────────────────────────────────────┤
│  [⊞ ☰]   [▽ Filtry]  [↓ Eksport]         🔍 Szukaj...     │
├─────────────────────────────────────────────────────────────┤
│  Moja lista | Z zaproszeń BO | Z zaproszeń HC | ...        │
└─────────────────────────────────────────────────────────────┘
```

### Zmiany w `TeamContactsTab.tsx`:

1. **Rząd 1 (nagłówek)**: Tytuł + opis po lewej, przycisk "Dodaj kontakt" po prawej (jako jedyny przycisk primary, wyróżniony). To najważniejsza akcja — zasługuje na wyeksponowanie.

2. **Rząd 2 (toolbar)**: Nowy pasek narzędziowy między nagłówkiem a sub-tabami:
   - Lewa strona: toggle widoku (grid/list) + Filtry + Eksport — zgrupowane razem jako narzędzia pomocnicze
   - Prawa strona: pole wyszukiwania (jeśli istnieje) lub puste
   - Separator wizualny: lekki `border-b` lub `bg-muted/30` z paddingiem

3. **Rząd 3 (sub-taby)**: Bez zmian — kategorie kontaktów zostają pod toolbarem.

### Korzyści
- Jasna hierarchia: główna akcja (Dodaj) jest wyróżniona i łatwa do znalezienia
- Narzędzia (widok, filtry, eksport) są zgrupowane logicznie w osobnym pasku
- Mniej "tłoku" w nagłówku karty
- Lepiej skaluje się na mobile — toolbar może się zawinąć niezależnie od nagłówka

### Plik do edycji
| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/TeamContactsTab.tsx` | Reorganizacja nagłówka CardHeader na 2 rzędy + toolbar |

