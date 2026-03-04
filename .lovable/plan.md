
Cel: usunąć blokadę zapisu kontaktu przy edycji i pokazać użytkownikowi precyzyjny błąd pola formularza.

Do I know what the issue is? Tak. Aktualny błąd wynika z niepoprawnego składania offsetu strefy czasu dla `reminder_date` w `PrivateContactForm.tsx` (powstaje np. `2026-03-08T10:00:00+0:+1`, co Supabase odrzuca jako invalid timestamp with time zone).

Zakres zmian (bez migracji DB):
1) `src/components/team-contacts/PrivateContactForm.tsx`
- Zastąpić ręczne budowanie offsetu (`Intl.DateTimeFormat + padStart`) bezpieczną konwersją datetime:
  - użyć `fromZonedTime` z `date-fns-tz` dla strefy `Europe/Warsaw`
  - zapisywać `reminder_date` jako poprawne ISO (`toISOString()`).
- Dodać walidację wejścia przed submit:
  - `reminder_date` musi mieć format `YYYY-MM-DD`
  - `reminder_time` musi mieć format `HH:mm`
  - jeśli niepoprawne: zablokować zapis i pokazać błąd pod sekcją przypomnienia.
- Rozszerzyć obsługę błędów API:
  - jeśli backend zwróci błąd związany z timestamp/time zone, pokazać czytelny komunikat przy polu przypomnienia (nie tylko ogólny alert).

2) `src/hooks/useTeamContacts.ts`
- W `updateContact` i `addContact` zachować obecne zwracanie `false/null`, ale przekazać bardziej szczegółowy komunikat błędu do formularza (np. przez `throw` albo ustandaryzowany obiekt wyniku), aby formularz mógł wskazać problem konkretnego pola.
- Nie zmieniać logiki historii (już jest non-blocking).

3) `src/components/team-contacts/TeamContactsTab.tsx`
- Utrzymać zamykanie modala tylko po realnym sukcesie.
- Dopilnować, by błąd z `updateContact` trafiał z powrotem do `PrivateContactForm` (zamiast samego `false` bez kontekstu).

Wpływ na istniejące kontakty:
- Działa dla już utworzonych rekordów bez migracji.
- Po edycji starego kontaktu nowy zapis `reminder_date` będzie już zawsze poprawny.
- Lista i powiadomienia będą aktualizowane poprawnie, bo zapis przestanie być odrzucany przez parser timestamptz.

Plan testów po wdrożeniu:
1) Edycja istniejącego kontaktu z ustawionym przypomnieniem (data + godzina) → zapis OK.
2) Edycja istniejącego kontaktu bez przypomnienia → zapis OK.
3) Wprowadzenie błędnej godziny/daty (symulacja) → komunikat przy polu przypomnienia.
4) Sprawdzenie, że modal zamyka się tylko po sukcesie.
5) Weryfikacja end-to-end: edycja kontaktu → odświeżenie listy → rozwinięcie kontaktu → zgodność danych osi czasu i przypomnienia.
