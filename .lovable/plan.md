

# Podział "Z zaproszeń na wydarzenia" na dwie kategorie: BO i HC

## Cel
Zastąpić jeden przycisk "Z zaproszeń na wydarzenia" dwoma osobnymi:
- **Z zaproszeń na Business Opportunity**
- **Z zaproszeń na Health Conversation**

Kontakty będą automatycznie przypisywane do odpowiedniej kategorii na podstawie pola `category` w tabeli `auto_webinar_config`.

## Zmiany w bazie danych (migracja SQL)

Dodanie kolumny `category` do tabeli `auto_webinar_config`:
```sql
ALTER TABLE public.auto_webinar_config
ADD COLUMN category text NOT NULL DEFAULT 'business_opportunity';
```
Wartości: `'business_opportunity'` lub `'health_conversation'`.

## Zmiany w kodzie

### 1. `src/components/team-contacts/types.ts`
- Dodać `event_category?: string` do `EventRegistrationInfo` i `EventGroup`

### 2. `src/hooks/useTeamContacts.ts`
- W `fetchEventContactIds`: rozszerzyć select o `events(title, start_time, event_type)`, a następnie dla eventów typu `auto_webinar` pobrać kategorię z `auto_webinar_config` (osobne zapytanie batch po `event_id`).
- Zapisać `event_category` w każdym `EventRegistrationInfo`.
- W `buildEventGroups`: przekazać `event_category` do obiektu `EventGroup`.
- Wyeksportować dwie oddzielne mapy grup: `eventGroupedContactsBO` i `eventGroupedContactsHC`, filtrowane po `category`.
- Wyeksportować oddzielne sety contact IDs: `eventContactIdsBO` i `eventContactIdsHC`.

### 3. `src/components/team-contacts/TeamContactsTab.tsx`
- Zmienić typ `privateSubTab` aby obsługiwał `'events-bo'` i `'events-hc'` zamiast `'events'`.
- Zastąpić przycisk "Z zaproszeń na wydarzenia" dwoma przyciskami:
  - "Z zaproszeń na Business Opportunity" (badge z liczbą kontaktów BO)
  - "Z zaproszeń na Health Conversation" (badge z liczbą kontaktów HC)
- Filtrowanie `eventContacts` → podział na `eventContactsBO` i `eventContactsHC` na podstawie odpowiednich setów ID.
- Renderowanie `EventGroupedContacts` z odpowiednimi grupami dla każdej pod-zakładki.

### 4. `src/components/auto-webinar/AutoWebinarRoom.tsx` (opcjonalnie)
- Brak zmian — zakładki BO/HC w auto-webinar już istnieją.

## Pliki do modyfikacji
| Plik | Zmiana |
|---|---|
| Nowa migracja SQL | Dodanie kolumny `category` do `auto_webinar_config` |
| `src/components/team-contacts/types.ts` | Dodanie `event_category` do interfejsów |
| `src/hooks/useTeamContacts.ts` | Pobieranie kategorii, podział grup na BO/HC |
| `src/components/team-contacts/TeamContactsTab.tsx` | Dwa przyciski pod-zakładek, routing do odpowiednich grup |

