

# Plan: Rozszerzenie widoku rozwiniętego kontaktu + wynik pierwszego kontaktu

## 1. Nowe pole w bazie danych

Dodanie kolumny `first_contact_result` do tabeli `team_contacts`:

```sql
ALTER TABLE team_contacts 
ADD COLUMN first_contact_result text;
```

Wartości: `answered` (odebrał), `no_answer` (nie odebrane), `wrong_number` (błędny numer), `out_of_range` (poza zasięgiem).

## 2. Zmiany w plikach

### `types.ts`
- Dodanie `first_contact_result: string | null`

### `PrivateContactForm.tsx`
- Dodanie pola Select "Wynik pierwszego kontaktu" pod "Data pierwszego kontaktu" z 4 opcjami
- Uwzględnienie `first_contact_result` w formData i submitcie

### `TeamContactAccordion.tsx` — rozszerzony widok dla kontaktów prywatnych
Dodanie brakujących danych w expanded view:
- **Sekcja "Oś czasu"**: Data utworzenia (created_at), Data pierwszego kontaktu (added_at), Wynik pierwszego kontaktu (first_contact_result), Data drugiego kontaktu (second_contact_date)
- **Sekcja "Źródło kontaktu"**: Skąd jest kontakt (contact_source), Dlaczego chcesz się odezwać (contact_reason)
- **Sekcja "Adnotacje"**: Adnotacja po pierwszym kontakcie (first_contact_annotation)
- Istniejące sekcje (Kontakt, Produkty, Przypomnienia, Notatki) pozostają

### `useTeamContacts.ts`
- Uwzględnienie `first_contact_result` w `addContact`

### `supabase/types.ts`
- Regeneracja po migracji

## 3. Kompatybilność wsteczna
Wszystkie nowe pola są nullable — istniejące kontakty zachowują dane, nowe pola wyświetlają się jako puste do momentu edycji.

