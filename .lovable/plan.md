

# Plan: Reorganizacja sekcji dat w formularzu kontaktów prywatnych

## Nowe pola w bazie danych

Dodanie 2 kolumn do tabeli `team_contacts`:
- `second_contact_date` (date, nullable) — data drugiego kontaktu
- `first_contact_annotation` (text, nullable) — adnotacja po pierwszym kontakcie

SQL migration:
```sql
ALTER TABLE team_contacts 
ADD COLUMN second_contact_date date,
ADD COLUMN first_contact_annotation text;
```

## Zmiany w formularzu (`PrivateContactForm.tsx`)

Nowy układ sekcji (od góry):
1. **Data utworzenia kontaktu** — read-only, auto-wypełnione aktualnym czasem (`created_at` lub `new Date()` dla nowych kontaktów), wyświetlane jako sformatowana data+godzina (Warsaw)
2. **Data pierwszego kontaktu** — istniejące pole `added_at`
3. **Data drugiego kontaktu** — nowe pole `second_contact_date`
4. **Adnotacja po pierwszym kontakcie** — nowe pole tekstowe `first_contact_annotation` (textarea, placeholder: "Co musisz zapamiętać po ustaleniach pierwszego kontaktu...")

## Pliki do zmiany
- **SQL migration** — dodanie 2 kolumn
- **`src/components/team-contacts/types.ts`** — dodanie `second_contact_date` i `first_contact_annotation`
- **`src/components/team-contacts/PrivateContactForm.tsx`** — reorganizacja sekcji dat + nowe pola
- **`src/hooks/useTeamContacts.ts`** — uwzględnienie nowych pól w `addContact`/`updateContact`
- **`src/integrations/supabase/types.ts`** — regeneracja typów (po migracji)

