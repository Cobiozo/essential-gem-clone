

# Plan: Formatowanie eksportu Excel + orientacja pozioma Word

## Zmiany w `TeamContactExport.tsx`

### 1. Excel — formatowanie jak HTML
Obecnie `json_to_sheet` generuje surowy arkusz bez stylów. SheetJS w wersji community (0.18.5) nie obsługuje stylów komórek (kolory, obramowania). Zamiast tego wygeneruję Excel z HTML tabeli — `XLSX.utils.table_to_sheet()` na elemencie HTML z inline styles, co pozwoli zachować:
- Zielone nagłówki (`#4CAF50`, biały tekst)
- Obramowania komórek
- Naprzemienne kolory wierszy
- Auto-dopasowanie szerokości kolumn (`!cols`)

Podejście: Utworzę tymczasowy element `<table>` w DOM z tym samym formatowaniem co HTML export, użyję `table_to_sheet` do konwersji, a potem ustawię `!cols` na odpowiednie szerokości.

**Uwaga**: SheetJS community nie wspiera pełnych stylów w `.xlsx`. Alternatywa — wyeksportować jako `.xls` (format HTML), który Excel otworzy z pełnym formatowaniem (kolory, obramowania). Zmienię rozszerzenie na `.xls` dla zachowania formatowania identycznego jak HTML.

### 2. Word — orientacja pozioma
Dodać w sekcji `<head>` dokumentu Word directive MS Office:
```xml
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:SpellingState>Clean</w:SpellingState>
    <w:GrammarState>Clean</w:GrammarState>
  </w:WordDocument>
</xml>
```
I w CSS:
```css
@page { size: landscape; margin: 1cm; }
```

## Plik do zmiany
- `src/components/team-contacts/TeamContactExport.tsx` — obie zmiany

