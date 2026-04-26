## Cel

Zastąpić tekstowe pole "Ikona (Lucide)" w edytorze sekcji eventu (zakładka **Sekcje** w edytorze paid event) wizualnym pickerem ikon z istniejącego komponentu `IconPicker` — żeby admin wybierał ikonę z listy zamiast wpisywać nazwę.

## Zmiana

W `src/components/admin/paid-events/editor/EventSectionsPanel.tsx` (sekcja `Ikona (Lucide)`, linie ~276–287):

1. Usunąć surowy `<Input>` do wpisywania nazwy ikony.
2. Wstawić `IconPicker` z `src/components/cms/IconPicker.tsx` jako trigger (przycisk z aktualnie wybraną ikoną + nazwą, lub "Wybierz ikonę" gdy puste).
3. Zachować dotychczasowe zachowanie zapisu — wartość trafia do `editingValue.icon_name` przez `setEditingValue(section.id, 'icon_name', name)` (`null` dla "Wyczyść").
4. Pod pickerem pokazać krótką podpowiedź: „Wybierz ikonę z listy lub wyszukaj." (zamiast linku do lucide.dev).

## Zachowanie

- Trigger renderowany jako `Button variant="outline"` z podglądem aktualnej ikony i jej nazwą.
- Popover otwiera istniejącą wyszukiwarkę z kategoriami (Popularne, UI, Strzałki, Komunikacja, Media, Zakupy, Social, Biznes, Lokalizacja, Pliki, Narzędzia).
- Po wybraniu ikony popover się zamyka, a w polu pojawia się ikona + nazwa.
- "Wyczyść" w pickerze ustawia `null` — sekcja będzie bez ikony.

## Pliki

- `src/components/admin/paid-events/editor/EventSectionsPanel.tsx` — podmiana inputu na `IconPicker`.

Brak zmian w bazie, brak nowych komponentów — wykorzystujemy istniejący `IconPicker`.