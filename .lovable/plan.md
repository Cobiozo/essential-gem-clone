

# Uniwersalny edytor blokowy "Wsparcie i pomoc"

## Problem

Obecnie edytor ma sztywna strukture: naglowek na gorze, karty pod nim, boxy informacyjne nizej, formularz na dole. Kazda kategoria elementow (karty, pola, boxy) jest sortowalna tylko w obrebie swojej grupy. Nie mozna dodac dodatkowego naglowka pomiedzy kartami a formularzem, ani przesunac boxu informacyjnego nad karty.

## Rozwiazanie

Zastapic 3 oddzielne tablice JSONB (`custom_cards`, `custom_form_fields`, `custom_info_boxes`) **jedna ujednolicona tablica blokow** (`custom_blocks`), gdzie kazdy blok ma `type` okreslajacy jego rodzaj. Wszystkie bloki sa w jednej liscie, sortowalne drag-and-drop pomiedzy soba.

## Dostepne typy blokow

| Typ | Opis | Pola |
|---|---|---|
| `heading` | Naglowek (H1-H3) | text, level (h1/h2/h3), alignment |
| `text` | Opis / paragraf | text, alignment |
| `cards_group` | Grupa kart kontaktowych | cards[] (tablica kart jak dotychczas) |
| `info_box` | Box informacyjny | icon, title, content, visible |
| `form` | Formularz z polami | title, fields[], submit_text, success_msg, error_msg |
| `button` | Samodzielny przycisk/link | text, url, icon, variant |

## Zmiany w bazie danych

Nowa kolumna JSONB w tabeli `support_settings`:

```text
custom_blocks jsonb DEFAULT '[]'::jsonb
```

Struktura bloku:
```text
{
  "id": "block_abc123",
  "type": "heading",
  "position": 0,
  "visible": true,
  "data": { ... }  // dane specyficzne dla typu
}
```

Migracja: automatyczna konwersja istniejacych danych z `custom_cards`, `custom_form_fields`, `custom_info_boxes` do jednej tablicy `custom_blocks` przy pierwszym uruchomieniu.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| Migracja SQL | Dodac kolumne `custom_blocks` + migracja danych z 3 starych kolumn |
| `src/components/admin/SupportSettingsManagement.tsx` | Przepisac na system blokowy: jedna lista sortowalna, przycisk "+ Dodaj blok" z menu wyboru typu, kazdy blok edytowalny przez popover |
| `src/components/support/SupportFormDialog.tsx` | Renderowac bloki z `custom_blocks` zamiast z 3 oddzielnych tablic |

## Szczegoly techniczne - Edytor admina

### Przycisk dodawania
- Przycisk "+ Dodaj blok" na dole listy
- Po kliknieciu rozwija sie menu z dostepnymi typami (Naglowek, Tekst, Karty, Box informacyjny, Formularz, Przycisk)
- Nowy blok dodawany na koncu listy

### Drag-and-drop
- Jedna wspolna lista DnD dla wszystkich blokow
- Kazdy blok ma uchwyt do przeciagania (GripVertical)
- Bloki mozna dowolnie przesuwac wzgledem siebie

### Edycja blokow
- Klikniecie otwiera popover z polami specyficznymi dla danego typu
- Naglowek: tekst + poziom (h1/h2/h3) + wyrownanie
- Tekst: tresc (textarea) + wyrownanie
- Karty: wewnetrzna lista kart z mozliwoscia dodawania/usuwania (jak dotychczas, ale zagniezdzona)
- Box: ikona + tytul + tresc + widocznosc
- Formularz: tytul + lista pol + przycisk wysylania (jak dotychczas, ale jako blok)
- Przycisk: tekst + URL + ikona + wariant (primary/outline/ghost)

### Usuwanie i widocznosc
- Ikona kosza w popoverze kazdego bloku
- Przelacznik widocznosci dla kazdego bloku

### Auto-save
- Ten sam mechanizm debounce 1s, zapisujacy `custom_blocks` do bazy

## Szczegoly techniczne - Strona uzytkownika

- Iteracja po `custom_blocks` posortowanych wg `position`
- Filtrowanie `visible === true`
- Renderowanie odpowiedniego komponentu na podstawie `type`
- Formularz zbiera dane z blokow typu `form` i wysyla email

## Kompatybilnosc wsteczna

Jesli `custom_blocks` jest puste ale stare kolumny (`custom_cards`, `custom_form_fields`, `custom_info_boxes`) maja dane, system automatycznie zbuduje tablice blokow ze starych danych i zapisze ja.

