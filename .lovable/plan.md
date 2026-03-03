
# Naprawa: dodanie `potential_client` do CHECK constraint

## Problem
Kolumna `relationship_status` w tabeli `team_contacts` ma CHECK constraint ograniczający dozwolone wartości. Wartość `potential_client` nie jest w nim uwzględniona.

Obecne dozwolone wartości:
`active`, `suspended`, `closed_success`, `closed_not_now`, `observation`, `potential_partner`, `potential_specialist`

## Plan
1. Migracja SQL: usunąć stary CHECK constraint i dodać nowy z wartością `potential_client` (zamiast starego `potential_specialist`).

```sql
ALTER TABLE team_contacts DROP CONSTRAINT team_contacts_relationship_status_check;
ALTER TABLE team_contacts ADD CONSTRAINT team_contacts_relationship_status_check 
  CHECK (relationship_status = ANY (ARRAY[
    'observation', 'potential_client', 'potential_partner', 
    'closed_success', 'closed_not_now',
    'active', 'suspended'
  ]));
```

Żadne zmiany w kodzie nie są potrzebne — UI już wysyła `potential_client`, wystarczy zaktualizować constraint w bazie.
