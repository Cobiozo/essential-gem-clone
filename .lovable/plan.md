
## Problem: Administrator widzi kontakty wszystkich użytkowników zamiast swoich

### Diagnoza

W `useTeamContacts.ts` (linia 68-71) zapytanie filtruje po `user_id` **tylko** gdy admin ręcznie wybierze użytkownika w filtrach. Domyślnie, ponieważ RLS pozwala adminowi widzieć WSZYSTKIE rekordy, admin widzi kontakty prywatne i członków zespołu **wszystkich użytkowników** pomieszane razem.

Wynik: admin ma 2 kontakty prywatne, ale widzi 11 (wszystkich użytkowników). W członkach zespołu widzi 142 rekordów zamiast swoich.

### Plan naprawy

#### Zmiana 1: Domyślne filtrowanie po user_id dla admina

**Plik: `src/hooks/useTeamContacts.ts`** (linia 68-71)

Zmienić logikę filtrowania:

```text
// PRZED (błędne):
if (isAdmin && filters.userId) {
  query = query.eq('user_id', filters.userId);
}

// PO (poprawne):
if (isAdmin) {
  // Admin domyślnie widzi swoje kontakty
  // Może przełączyć na innego użytkownika przez filtr
  query = query.eq('user_id', filters.userId || user.id);
} 
// Dla nie-adminów RLS już filtruje po user_id
```

Dzięki temu:
- Admin domyślnie widzi **swoje** kontakty prywatne i członków zespołu
- Admin może wybrać innego użytkownika w filtrach, aby zobaczyć jego kontakty
- Zaproszeni goście na webinary (zapisani z `invited_by_user_id` = admin's ID) będą widoczni w kontaktach prywatnych admina

### Weryfikacja

Kontakty admina w bazie danych:
- 1x team_member (Sebastian Snopek)
- 2x private (Kinga Testujący2, katarzyna Snopek test)

Po zmianie admin zobaczy dokładnie te rekordy domyślnie.
