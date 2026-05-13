# Przebudowa formularza "Dodaj kontakt prywatny"

## Cel
Bardziej profesjonalny, przejrzysty, jednostronicowy formularz na całą szerokość okna w desktopie, z gwiazdkami priorytetu kontaktu oraz możliwością dodania do 3 własnych pól (dowolna nazwa + dowolna treść).

## Zakres zmian (tylko UI/frontend + minimalna migracja DB)

### 1. Layout dialogu (desktop fullscreen, mobile bez zmian)
Plik: `src/components/team-contacts/TeamContactsTab.tsx` (linie 978 i 994)
- `DialogContent` zmieniamy z `max-w-2xl max-h-[90vh]` na pełnoekranowy w desktop:
  `max-w-[min(1400px,96vw)] w-[96vw] h-[92vh] max-h-[92vh] overflow-y-auto p-0 sm:p-0`
- Wewnątrz pojawia się sticky header (tytuł + opis + przycisk zamknięcia) i sticky footer (Zapisz / Anuluj). Treść formularza w środku, scrollowalna.

### 2. Nowy układ formularza – jedna strona, kolumny
Plik: `src/components/team-contacts/PrivateContactForm.tsx` – pełna refaktoryzacja prezentacji (logika walidacji i submitu bez zmian).

Sekcje w siatce `lg:grid-cols-12` z czytelnymi nagłówkami:
- **Dane kontaktu** (col-span 6): Imię*, Nazwisko*, Telefon, Email, Zawód, Adres
- **Klasyfikacja** (col-span 6):
  - **Priorytet kontaktu** – komponent gwiazdek 1–5 (`RatingElement`, label „Poziom zainteresowania" – jak na zrzucie)
  - Status relacji
  - Skąd jest kontakt
  - Zainteresowanie produktami
- **Pierwszy kontakt / Drugi kontakt** (col-span 6): Data utworzenia (read-only), Data pierwszego kontaktu, Wynik pierwszego kontaktu, Data drugiego kontaktu, Adnotacja po pierwszym kontakcie
- **Przypomnienie i kolejny kontakt** (col-span 6): Data kolejnego kontaktu, Data + godzina przypomnienia, Treść przypomnienia
- **Notatki z rozmów** (col-span 12): Textarea
- **Dodatkowe pola własne** (col-span 12): patrz pkt 4
- **Historia zaproszeń na eventy** (col-span 12, tylko w trybie edycji): bez zmian funkcjonalnie

W mobile wszystko spada do jednej kolumny (`grid-cols-1`).

### 3. Gwiazdki priorytetu
- Wykorzystujemy istniejący `src/components/elements/RatingElement.tsx` (`readonly={false}`, `max=5`).
- Nowe pole stanu `priority_level: number` (0–5, 0 = niezdefiniowane).
- Etykieta: „Poziom zainteresowania" (zgodnie ze zrzutem).

### 4. Pola własne (max 3)
- Nowy stan `custom_fields: Array<{ label: string; value: string }>` (max 3 wpisy).
- UI: lista wierszy (label input + textarea/value input + przycisk usuń) + przycisk „Dodaj pole" (ukryty po osiągnięciu limitu 3, z licznikiem „X/3").
- Walidacja: jeśli wiersz istnieje, `label` jest wymagany (max 60 zn.), `value` max 1000 zn.; puste wiersze są filtrowane przed zapisem.

### 5. Zapis – mapowanie do TeamContact
- `priority_level` i `custom_fields` zapisywane jako kolumny w `team_contacts` (patrz migracja).
- W payloadzie submitu dokładamy oba pola; reszta logiki (`handleSubmit`, walidacja dat, reminder) bez zmian.

### 6. Wyświetlanie
- `TeamContactsTable` / `TeamContactAccordion` / `ContactExpandedDetails`: dodać niewielkie pokazywanie gwiazdek priorytetu obok imienia (read-only `RatingElement`) oraz w widoku szczegółów listy pól własnych (label: value). To minimalne zmiany prezentacyjne, nie ruszamy filtrów ani logiki listy.

## Migracja bazy danych (minimalna, addytywna, nie narusza istniejących funkcji)
Tabela: `team_contacts`
```sql
ALTER TABLE public.team_contacts
  ADD COLUMN IF NOT EXISTS priority_level smallint NOT NULL DEFAULT 0
    CHECK (priority_level BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb;
```
- Pola opcjonalne, z bezpiecznymi defaultami → istniejące rekordy działają bez zmian.
- RLS: dziedziczy istniejące policies tabeli `team_contacts` (brak zmian).
- `custom_fields` walidowane po stronie klienta (max 3 elementy, max długości pól). Edge functions i CRON nie korzystają z tych pól, więc pozostają nietknięte.

## Gwarancja nienaruszalności
- Nie zmieniamy: logiki `useTeamContacts`, `TeamContactsTab` (poza rozmiarem dialogu), filtrów, eksportów, akordeonów, usuwania, historii, integracji z eventami, kontaktów typu `team_member` ani formularza `TeamContactForm`.
- Wszystkie nowe pola są opcjonalne.
- Stary `RatingElement` jest re-używany bez modyfikacji.

## Pliki do zmiany
- `src/components/team-contacts/PrivateContactForm.tsx` – refactor UI + nowe pola
- `src/components/team-contacts/TeamContactsTab.tsx` – rozmiar `DialogContent` (2 miejsca)
- `src/components/team-contacts/types.ts` – `priority_level`, `custom_fields` w `TeamContact`
- `src/components/team-contacts/TeamContactAccordion.tsx` / `ContactExpandedDetails.tsx` – pokazanie gwiazdek + listy pól własnych (read-only)
- Migracja SQL: dwie nowe kolumny w `team_contacts`

## Kolejność realizacji
1. Migracja DB (oczekuje zatwierdzenia).
2. Aktualizacja typów + formularza (gwiazdki, pola własne, fullscreen layout).
3. Lekkie zmiany prezentacyjne na liście kontaktów.
4. Test wizualny w preview + sanity-check zapisu i edycji.
