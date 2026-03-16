

# Plan: Historia kontaktu + źródło zaproszenia

## Problem

1. `ContactEventHistory` (w formularzu edycji) nie rozróżnia, czy rejestracja pochodzi z zaproszenia partnera czy samodzielnej rejestracji
2. `InviteToEventDialog` nie loguje akcji zaproszenia do `team_contacts_history`
3. `TeamContactHistoryDialog` pokazuje tylko create/update/delete — nie widać zaproszeń ani rejestracji na wydarzenia

## Zmiany

### 1. `ContactEventHistory.tsx` — dodanie źródła rejestracji

- Dodać `source` do zapytania `guest_event_registrations`
- Wyświetlać badge: "Zaproszony przez partnera" (żółty) vs "Samodzielna rejestracja" (domyślny) obok statusu

### 2. `InviteToEventDialog.tsx` — logowanie do historii kontaktu

Po udanym zaproszeniu (`handleInvite`), dodać INSERT do `team_contacts_history`:
```typescript
await supabase.from('team_contacts_history').insert({
  contact_id: contact.id,
  change_type: 'event_invite',
  new_values: { event_title: event.title, event_id: event.id, event_date: event.start_time },
  changed_by: user.id,
});
```

### 3. `TeamContactHistoryDialog.tsx` — obsługa nowych typów zdarzeń

- Dodać obsługę `change_type: 'event_invite'` w `getChangeIcon` i `getChangeBadge`
- Dodać rendering dla wpisów typu `event_invite` (wyświetlanie tytułu i daty wydarzenia)
- Również pobrać rejestracje z `guest_event_registrations` (po email kontaktu) i scalić je z historią kontaktu w jeden timeline, sortowany chronologicznie
- Typy zdarzeń w historii: `created`, `updated`, `deleted`, `event_invite` (partner zaprosił), `event_registration` (gość zarejestrował się sam)

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/ContactEventHistory.tsx` | Dodanie `source` + badge źródła |
| `src/components/team-contacts/InviteToEventDialog.tsx` | INSERT do `team_contacts_history` po zaproszeniu |
| `src/components/team-contacts/TeamContactHistoryDialog.tsx` | Obsługa `event_invite` + merge rejestracji z `guest_event_registrations` w timeline |

Brak zmian w bazie — tabela `team_contacts_history` ma elastyczną strukturę (jsonb `new_values`, tekstowy `change_type`).

