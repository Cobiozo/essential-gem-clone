

# Plan: Rozbudowa widoku kontaktów z wydarzeń

## Zakres zmian

### 1. Usunąć "Dane pozyskane z formularza webinar..." z notatek
**Plik:** `supabase/functions/send-webinar-confirmation/index.ts`
- Linia 199/223/250: Zamienić `sourceNote` wstawiane do `notes` na `null`. Informacja o źródle kontaktu trafi do pola `contact_source` zamiast `notes`.
- Nowe kontakty: `contact_source: 'Formularz webinar'`, `notes: null`
- Reaktywacja: nie nadpisywać `notes`

### 2. Sekcja "Wydarzenia" (read-only) na dole formularza edycji
**Plik:** `src/components/team-contacts/PrivateContactForm.tsx`
- Na dole formularza (przed przyciskami), dodać read-only sekcję "Rejestracje na wydarzenia"
- Pobiera dane z `guest_event_registrations` po `email` kontaktu (nie po `team_contact_id`, bo kontakt mógł być przeniesiony)
- Wyświetla listę: nazwa wydarzenia, data, status (badge registered/cancelled)

### 3. Przycisk "Przenieś do Moja lista kontaktów"
**Pliki:** `EventGroupedContacts.tsx`, `useTeamContacts.ts`, `TeamContactsTab.tsx`

- Nowy przycisk w `EventGroupedContacts` przy każdym gościu: ikona `UserPlus` → "Przenieś do Mojej listy"
- Akcja `moveToOwnList` w hooku: ustawia kontaktowi flagę `moved_to_own_list: true` (nowa kolumna boolean, default false) w `team_contacts`
- Kontakt z `moved_to_own_list = true` pojawia się w "Moja lista kontaktów" zamiast "Z zaproszeń"
- W widoku wydarzeń: badge "W Mojej liście" przy kontaktach z `moved_to_own_list = true`
- Kontakt nadal zachowuje powiązania z `guest_event_registrations` — nowe rejestracje się dopisują

### 4. Zakładka "Usunięte" z 30-dniową retencją
**Pliki:** `TeamContactsTab.tsx`, `useTeamContacts.ts`

- Nowy sub-tab "Usunięte" obok "Moja lista kontaktów" i "Z zaproszeń na wydarzenia"
- `deleteContact` zamiast `is_active: false` → ustawia `deleted_at: now()` (nowa kolumna timestamp, nullable)
- Kontakty z `deleted_at IS NOT NULL` i `deleted_at > now() - 30 days` widoczne w zakładce "Usunięte"
- Każdy usunięty kontakt ma przycisk "Przywróć" (`deleted_at = null`) i info ile dni do trwałego usunięcia
- `fetchContacts` filtruje: `is_active = true AND deleted_at IS NULL` (główny widok) lub `deleted_at IS NOT NULL` (usunięte)
- Auto-cleanup po 30 dniach — istniejący system CRON/cleanup obsłuży to (lub ręcznie `is_active: false` po 30 dniach)

### 5. Migracja SQL
- `ALTER TABLE team_contacts ADD COLUMN moved_to_own_list BOOLEAN DEFAULT false;`
- `ALTER TABLE team_contacts ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;`

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| SQL migration | Kolumny `moved_to_own_list`, `deleted_at` |
| `supabase/functions/send-webinar-confirmation/index.ts` | `notes` → `contact_source`, nie nadpisuj notatek |
| `src/components/team-contacts/PrivateContactForm.tsx` | Sekcja "Rejestracje na wydarzenia" (read-only) |
| `src/components/team-contacts/EventGroupedContacts.tsx` | Przycisk "Przenieś", badge "W Mojej liście" |
| `src/hooks/useTeamContacts.ts` | `moveToOwnList`, `restoreContact`, filtrowanie `deleted_at`, fetch usunięte |
| `src/components/team-contacts/TeamContactsTab.tsx` | Sub-tab "Usunięte", logika przenoszenia |
| `src/integrations/supabase/types.ts` | Nowe kolumny w typach |

