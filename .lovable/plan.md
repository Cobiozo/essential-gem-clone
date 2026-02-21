

# Rozbudowany edytor "Wsparcie i pomoc" - dynamiczne dodawanie elementow

## Problem

Obecnie edytor ma sztywno zakodowane 3 karty (Email, Telefon, Godziny pracy) i 4 pola formularza. Nie mozna dodawac nowych kart, pol, boxow informacyjnych ani przyciskow. Kazda karta ma dedykowane kolumny w bazie danych, co uniemozliwia rozszerzanie.

## Rozwiazanie

Przejsc z indywidualnych kolumn na dynamiczne tablice JSONB w bazie danych. Dzieki temu administrator bedzie mogl:
- Dodawac/usuwac karty kontaktowe (np. WhatsApp, Messenger, Adres biura)
- Dodawac/usuwac pola formularza
- Dodawac/usuwac boxy informacyjne
- Zarzadzac przyciskami

## Zmiany w bazie danych

Dodac 3 nowe kolumny JSONB do tabeli `support_settings`:

| Kolumna | Typ | Opis |
|---|---|---|
| `custom_cards` | jsonb | Tablica dynamicznych kart kontaktowych |
| `custom_form_fields` | jsonb | Tablica dynamicznych pol formularza |
| `custom_info_boxes` | jsonb | Tablica dynamicznych boxow informacyjnych |

Struktura `custom_cards`:
```text
[
  { "id": "card_1", "icon": "Mail", "label": "Email", "value": "support@...", "visible": true, "position": 0 },
  { "id": "card_2", "icon": "Phone", "label": "Telefon", "value": "+48...", "visible": true, "position": 1 },
  { "id": "card_3", "icon": "MessageCircle", "label": "WhatsApp", "value": "+48...", "visible": true, "position": 2 }
]
```

Struktura `custom_form_fields`:
```text
[
  { "id": "field_1", "label": "Imie i nazwisko", "placeholder": "Jan Kowalski", "type": "input", "required": true, "position": 0, "width": "half" },
  { "id": "field_2", "label": "Email", "placeholder": "jan@example.com", "type": "input", "required": true, "position": 1, "width": "half" },
  { "id": "field_3", "label": "Temat", "placeholder": "W czym mozemy pomoc?", "type": "input", "required": true, "position": 2, "width": "full" },
  { "id": "field_4", "label": "Wiadomosc", "placeholder": "Opisz problem...", "type": "textarea", "required": true, "position": 3, "width": "full" }
]
```

Struktura `custom_info_boxes`:
```text
[
  { "id": "box_1", "icon": "Info", "title": "Informacja", "content": "Odpowiedz moze...", "visible": true, "position": 0 }
]
```

## Migracja danych

Przy pierwszym zaladowaniu, jesli `custom_cards` jest puste, system automatycznie zmigruje dane z istniejacych kolumn (email_address, phone_number, working_hours itd.) do nowej struktury JSONB. Stare kolumny pozostana w bazie dla kompatybilnosci wstecznej.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| Migracja SQL | ALTER TABLE: dodac 3 kolumny JSONB z wartosciami domyslnymi |
| `src/components/admin/SupportSettingsManagement.tsx` | Przepisac na dynamiczne tablice z przyciskami "Dodaj karte", "Dodaj pole", "Dodaj box". Karty i pola sortowalne drag-and-drop, usuwalne, edytowalne inline |
| `src/components/support/SupportFormDialog.tsx` | Renderowac karty, pola i boxy z tablic JSONB zamiast ze sztywnych kolumn |

## Szczegoly techniczne - Edytor admina

### Panel kart kontaktowych
- Przycisk "+ Dodaj karte" pod siatka kart
- Kazda karta: ikona, etykieta, wartosc, widocznosc, usuwanie (ikona kosza)
- Drag-and-drop sortowanie (juz istniejacy mechanizm)
- Minimum 0 kart, brak gornego limitu

### Panel pol formularza
- Przycisk "+ Dodaj pole" pod polami
- Kazde pole: etykieta, placeholder, typ (input/textarea), wymagane (tak/nie), szerokosc (polowa/cala)
- Drag-and-drop sortowanie
- Przycisk usuwania na kazdym polu
- Minimum 1 pole

### Panel boxow informacyjnych
- Przycisk "+ Dodaj box" pod boxami
- Kazdy box: ikona, tytul, tresc, widocznosc
- Mozliwosc usuwania i sortowania

### Przycisk wysylania
- Edytowalny tekst, komunikat sukcesu i bledu (bez zmian)

### Auto-save
- Caly stan (wlacznie z tablicami JSONB) zapisywany automatycznie z debounce 1s (istniejacy mechanizm)

## Szczegoly techniczne - Strona uzytkownika (SupportFormDialog)

- Renderowanie kart z `custom_cards` zamiast hardkodowanych case-switch
- Renderowanie pol formularza z `custom_form_fields` z dynamicznym `formData`
- Renderowanie boxow z `custom_info_boxes`
- Kompatybilnosc wsteczna: jesli `custom_cards` jest puste, uzyj starych kolumn

