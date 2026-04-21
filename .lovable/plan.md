
# Dodanie statusu „W kolejce — Do skontaktowania" w Status relacji

## Diagnoza
Status relacji w formularzu „Dodaj kontakt prywatny" pochodzi z `PrivateContactForm.tsx`. Lista wartości jest też powtórzona w filtrach, tabeli, accordion-ie i eksporcie. Po stronie bazy `team_contacts.relationship_status` ma CHECK constraint (`20260303204619`), który trzeba rozszerzyć o nową wartość `to_contact`, w przeciwnym razie INSERT/UPDATE z nową opcją zostanie odrzucony.

## Co zrobimy

### 1. Migracja DB — rozszerzenie CHECK constraint
Nowa migracja:
```sql
ALTER TABLE team_contacts DROP CONSTRAINT team_contacts_relationship_status_check;
ALTER TABLE team_contacts ADD CONSTRAINT team_contacts_relationship_status_check 
  CHECK (relationship_status = ANY (ARRAY[
    'observation', 'potential_client', 'potential_partner', 
    'closed_success', 'closed_not_now',
    'active', 'suspended',
    'to_contact'
  ]));
```

### 2. Typy TS — `src/components/team-contacts/types.ts`
Dodanie `'to_contact'` do unii `relationship_status`.

### 3. Formularz dodawania kontaktu — `PrivateContactForm.tsx`
W `<SelectContent>` dopisać jako pierwszą lub ostatnią opcję:
```tsx
<SelectItem value="to_contact">{tf('teamContacts.toContact', 'W kolejce - Do skontaktowania')}</SelectItem>
```

### 4. Filtry — `TeamContactFilters.tsx`
Analogicznie dodać `<SelectItem value="to_contact">…</SelectItem>` w bloku `contactType === 'private'`.

### 5. Etykiety i kolory (badge) w trzech miejscach
- `TeamContactAccordion.tsx` (`statusLabels`)
- `TeamContactsTable.tsx` (`statusLabels`)
- `TeamContactExport.tsx` (`getRelationshipLabel` — wszystkie 3 miejsca renderujące eksport)

Dodanie wpisu:
```ts
to_contact: { label: 'W kolejce - Do skontaktowania', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' }
```
oraz `case 'to_contact': return 'W kolejce - Do skontaktowania';` w eksporcie.

### 6. Tłumaczenia (PL/EN/DE/NO/IT/ES/FR/PT)
Dodać klucz `teamContacts.toContact` w istniejącym systemie tłumaczeń (analogicznie do `observation`, `potentialClient` itd.). Wartości:
- PL: „W kolejce - Do skontaktowania"
- EN: „In queue - To contact"
- DE: „In Warteschlange - Zu kontaktieren"
- NO: „I kø - Å kontakte"
- IT: „In coda - Da contattare"
- ES: „En cola - Por contactar"
- FR: „En file - À contacter"
- PT: „Na fila - A contactar"

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/<new>.sql` | Rozszerzenie CHECK o `to_contact` |
| `src/components/team-contacts/types.ts` | Dodanie `'to_contact'` do unii |
| `src/components/team-contacts/PrivateContactForm.tsx` | Nowa opcja w `<Select>` |
| `src/components/team-contacts/TeamContactFilters.tsx` | Nowa opcja w filtrach |
| `src/components/team-contacts/TeamContactAccordion.tsx` | Nowy wpis w `statusLabels` |
| `src/components/team-contacts/TeamContactsTable.tsx` | Nowy wpis w `statusLabels` |
| `src/components/team-contacts/TeamContactExport.tsx` | Nowy `case` w `getRelationshipLabel` |
| Tłumaczenia (`teamContacts.toContact`) | 8 języków |

## Efekt
W oknie „Dodaj kontakt prywatny" w polu „Status relacji" pojawi się dodatkowa opcja **„W kolejce - Do skontaktowania"**. Status ten będzie poprawnie zapisywany do bazy, wyświetlany jako kolorowy badge (bursztynowy) w tabeli i akordeonie kontaktów, dostępny w filtrach oraz eksporcie do PDF/HTML, a etykiety będą zlokalizowane we wszystkich obsługiwanych językach.
