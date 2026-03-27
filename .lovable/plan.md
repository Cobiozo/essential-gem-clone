

# Plan: Poprawki kontaktów z auto-webinarów

## Zidentyfikowane problemy

1. **Nagłówek grupy pokazuje datę wydarzenia (09.03) zamiast daty rejestracji (27.03)** — Dla auto-webinarów wszystkie rejestracje mają ten sam `event_id`, więc `events.start_time` to data utworzenia wydarzenia, nie data slotu gościa. Nagłówek grupy powinien odzwierciedlać faktyczne daty rejestracji.

2. **Usunięte kontakty kolidują z nowymi rejestracjami** — `fetchEventContactIds` w `useTeamContacts.ts` pobiera rejestracje po `team_contact_id` bez sprawdzania czy kontakt jest usunięty (`deleted_at`). Usunięty kontakt nadal "zajmuje" rejestrację i może blokować wyświetlanie nowych.

3. **Popover (ContactEventInfoButton) pokazuje datę wydarzenia zamiast daty rejestracji** — `event_date` pochodzi z `events.start_time`, co dla auto-webinarów jest datą konfiguracji, nie datą sesji gościa.

## Rozwiązanie

### Plik: `src/hooks/useTeamContacts.ts`

**A. Filtrować usunięte kontakty w `fetchEventContactIds`:**
- Dodać JOIN z `team_contacts` aby wykluczyć kontakty z `deleted_at IS NOT NULL`
- Alternatywnie: po pobraniu danych, odfiltrować rejestracje których `team_contact_id` nie istnieje w aktywnych `contacts`

**B. Zmienić grupowanie auto-webinarów — grupuj po dacie rejestracji, nie po event_id:**
- Dla kontaktów z auto-webinarów (`event_category = 'business_opportunity' | 'health_conversation'` z auto_webinar_config): użyć `registered_at` jako daty grupy zamiast `events.start_time`
- Klucz grupy: zamiast samego `event_id`, użyć `event_id + data_rejestracji` (dzień), żeby rejestracje z różnych dni nie były w jednej grupie
- W `buildEventGroups`: gdy kategoria to BO/HC, generować klucz grupy jako `${event_id}::${registered_at_date}` i ustawić `date` grupy na `registered_at`

**C. Dodać `registered_at` do `EventRegistrationInfo`** (typ w `types.ts`) — już jest, ale nie jest używany w `buildEventGroups` do ustawiania daty grupy.

### Plik: `src/components/team-contacts/ContactEventInfoButton.tsx`

**D. Popover — pokazywać datę rejestracji (slot) zamiast `events.start_time`:**
- Pobrać `registered_at` z `guest_event_registrations` (już jest w query — trzeba dodać do select)
- Wyświetlać `registered_at` jako datę w popoverze zamiast `events.start_time`

### Plik: `src/components/team-contacts/EventGroupedContacts.tsx`

**E. Nagłówek grupy:**
- Data grupy będzie teraz poprawna (z `registered_at`), więc nagłówek automatycznie pokaże właściwą datę

### Plik: `supabase/functions/send-webinar-confirmation/index.ts`

**F. Nowy kontakt nie może kolidować z usuniętym:**
- Przy tworzeniu kontaktu auto-webinar (linia 298-337): system już zawsze tworzy nowy rekord (brak deduplikacji) — to jest OK
- Ale `guest_event_registrations.team_contact_id` starego (usuniętego) kontaktu nadal istnieje — trzeba upewnić się, że update `team_contact_id` na nowej rejestracji nie jest blokowany przez starą

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `useTeamContacts.ts` | Filtrować usunięte kontakty; grupować auto-webinary po dacie rejestracji |
| `ContactEventInfoButton.tsx` | Pokazywać `registered_at` zamiast `events.start_time` |
| `types.ts` | Ewentualne rozszerzenie `EventGroup` o flagę `isAutoWebinar` |

