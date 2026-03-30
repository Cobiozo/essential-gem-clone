

## Usunięcie szarego overlay przy edycji sekcji w podglądzie szablonu

### Problem
Gdy klikasz "edytuj" na sekcji w podglądzie szablonu (`TemplatePreviewPage.tsx`), otwiera się boczny panel (`Sheet`) z domyślnym overlay `bg-black/80`, który zasłania i szarzy cały podgląd strony. Nie widać jak zmiany wpływają na wygląd.

### Rozwiązanie
Zmienić Sheet w `TemplatePreviewPage.tsx` tak, aby nie blokował interakcji z podglądem i nie wyświetlał ciemnego overlay:

**Plik: `src/pages/TemplatePreviewPage.tsx`**
- Dodać `modal={false}` do komponentu `<Sheet>` — wyłącza overlay i blokowanie tła
- Usunąć domyślny przycisk zamknięcia (X) z SheetContent (jest już własny "Zamknij" na dole)
- Opcjonalnie: dodać lekki cień zamiast overlay, by panel był wizualnie oddzielony

**Plik: `src/components/ui/sheet.tsx`**
- Dodać opcjonalną prop `hideOverlay` do `SheetContent`
- Gdy `hideOverlay=true`, nie renderować `<SheetOverlay />`

Efekt: boczny panel edycji otworzy się po prawej stronie, ale podgląd strony pozostanie w pełni widoczny z naturalnymi kolorami. Zmiany w edytorze będą natychmiast widoczne na podglądzie.

