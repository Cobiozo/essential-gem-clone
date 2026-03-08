

# Plan: Widok zaproszonych gości z kontekstem wydarzenia + Powiadomienia

## Aktualny stan
- Sub-tab "Z zaproszeń na wydarzenia" już istnieje w Pure-kontakty i filtruje kontakty powiązane z `guest_event_registrations`
- `ContactEventInfoButton` (popover) pokazuje na jakie wydarzenia jest zarejestrowany dany kontakt
- **Brak:** informacji o wydarzeniu widocznej bezpośrednio w liście (bez klikania)
- **Brak:** powiadomienia in-app/push do zapraszającego po rejestracji gościa

## Zmiany

### 1. Rozszerzyć dane w hooku `useTeamContacts.ts`
Zamiast pobierać tylko `team_contact_id`, pobrać pełne dane rejestracji z nazwą wydarzenia:

```typescript
// Fetch: team_contact_id, event_id, events(title, start_time), first_name, status
```

Zwrócić mapę `eventContactDetails: Map<string, EventRegistrationInfo[]>` (contact_id → lista wydarzeń).

### 2. Wyświetlać kontekst wydarzenia inline w liście
W sub-tabie "Z zaproszeń na wydarzenia":
- Pod każdym kontaktem (w accordion i tabeli) wyświetlić badge/chip z nazwą wydarzenia i datą
- Nie wymaga nowej tabeli — dane już są w `guest_event_registrations` z FK do `events`

### 3. Powiadomienie in-app do zapraszającego
W Edge Function `send-webinar-confirmation/index.ts`, po dodaniu kontaktu do `team_contacts`, wstawić rekord do `user_notifications`:

```typescript
await supabase.from('user_notifications').insert({
  user_id: invitedByUserId,
  notification_type: 'guest_registered',
  source_module: 'events',
  title: `Nowa rejestracja: ${firstName} ${lastName}`,
  message: `${firstName} ${lastName} zarejestrował(a) się na "${eventTitle}" z Twojego zaproszenia.`,
  link: '/my-account?tab=team-contacts&subTab=private',
  metadata: { event_id: eventId, guest_email: email }
});
```

### 4. Web Push do zapraszającego
Wywołać `send-push-notification` Edge Function dla `invitedByUserId` po zapisie powiadomienia.

### Pliki do edycji:
1. `src/hooks/useTeamContacts.ts` — rozszerzyć `fetchEventContactIds` o dane wydarzeń
2. `src/components/team-contacts/TeamContactsTab.tsx` — przekazać dane wydarzeń
3. `src/components/team-contacts/TeamContactAccordion.tsx` — wyświetlić inline badge z wydarzeniem
4. `src/components/team-contacts/TeamContactsTable.tsx` — wyświetlić kolumnę z wydarzeniem
5. `supabase/functions/send-webinar-confirmation/index.ts` — dodać powiadomienie in-app + push

Nie wymaga migracji bazy — wszystkie potrzebne kolumny i FK już istnieją.

