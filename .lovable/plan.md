

## Plan: Walidacja kolejności dat w formularzu kontaktu

### Zmiana w `src/components/team-contacts/PrivateContactForm.tsx`

Dodać walidację dat w `handleSubmit` (przed linią 78, po walidacji reminder fields):

1. **second_contact_date >= added_at**: Jeśli `second_contact_date` jest wypełnione i jest wcześniejsze niż `added_at` (data pierwszego kontaktu) → błąd: "Data drugiego kontaktu nie może być wcześniejsza niż data pierwszego kontaktu."

2. **next_contact_date >= second_contact_date**: Jeśli oba wypełnione i `next_contact_date` < `second_contact_date` → błąd: "Data kolejnego kontaktu nie może być wcześniejsza niż data drugiego kontaktu."

3. **next_contact_date >= added_at** (fallback): Jeśli `next_contact_date` jest wypełnione ale `second_contact_date` nie, to `next_contact_date` >= `added_at`.

Walidacja porównuje stringi dat w formacie `YYYY-MM-DD` (porównanie leksykograficzne działa poprawnie dla tego formatu). Błąd wyświetlany inline w istniejącym alercie `error`.

Zakres: tylko `PrivateContactForm.tsx`, ~15 linii kodu walidacji.

