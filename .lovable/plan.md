

# Plan: Poprawki danych rejestracji i nazewnictwa auto-webinarów

## Zidentyfikowane problemy

### 1. Katarzyna Snopek — "Nie dołączył" mimo że oglądała
**Przyczyna**: Hook `useAutoWebinarTracking` (linia 39-45) szuka `guest_registration_id` po samym emailu (`eq('email', guestEmail)`), sortując po `created_at DESC` i biorąc `limit(1)`. Katarzyna zarejestrowała się 27.03 (registration `bf5f6b7b`), ale **nie obejrzała jeszcze tego webinaru**. Wcześniejsze widoki (spod tego samego emaila) są podpięte do **starszych** rejestracji (np. `5da28865`, `16606553`). Popover w `ContactEventInfoButton` szuka views po `guest_registration_id` = `bf5f6b7b` i nic nie znajduje → "Nie dołączył".

Dodatkowo: za każdym odtwarzaniem tworzonych jest wiele rekordów `auto_webinar_views` (5-10 na sesję) bo hook tworzy nowy rekord za każdym razem gdy `isPlaying` się zmieni.

### 2. Nazwa "Szansa Biznesowa" zamiast "Business Opportunity"
**Przyczyna**: W tabeli `events` tytuł to dosłownie `"Szansa Biznesowa"`. Nagłówek grupy bierze ten tytuł z `events.title`. To jest kwestia danych w DB — trzeba zmienić tytuł wydarzenia, ale też dodać mapowanie w UI na wypadek gdyby ktoś zmienił tytuł z powrotem.

## Rozwiązanie

### A. Naprawić powiązanie tracking → rejestracja (kluczowa poprawka)

**Plik: `src/hooks/useAutoWebinarTracking.ts`**
- Dodać parametr `guestRegistrationId: string | null` do hooka (zamiast szukać w DB po emailu)
- Usunąć lookup po emailu z `createView()` — bezpośrednio użyć przekazanego ID
- Dodać deduplikację: nie tworzyć nowego widoku jeśli `viewId.current` już istnieje (zapobiegnie wielokrotnym rekordom)

**Plik: `src/components/auto-webinar/AutoWebinarEmbed.tsx`**
- Przed wywołaniem `useAutoWebinarTracking`, pobrać `guest_registration_id` z bazy na podstawie emaila **I** `event_id` (z configu)
- Przekazać ten ID do hooka

**Plik: `src/pages/AutoWebinarPublicPage.tsx`**
- Bez zmian (email jest wystarczający do przekazania)

### B. Zmienić tytuł wydarzenia w UI

**Plik: `src/hooks/useTeamContacts.ts`** i/lub **`src/components/team-contacts/EventGroupedContacts.tsx`**
- Dodać mapowanie kategorii na wyświetlaną nazwę:
  - `business_opportunity` → "Business Opportunity"  
  - `health_conversation` → "Health Conversation"
- Użyć nazwy kategorii zamiast `events.title` w nagłówku grupy dla auto-webinarów
- Alternatywnie: zmienić tytuł w bazie danych (ale to mniej trwałe rozwiązanie)

### C. ContactEventInfoButton — poprawić powiązanie views z rejestracją

**Plik: `src/components/team-contacts/ContactEventInfoButton.tsx`**
- Popover już poprawnie szuka views po `guest_registration_id` (linia 72-75)
- Problem jest u źródła — tracking nie linkuje views do właściwej rejestracji
- Po poprawce A, dane same się naprawią dla nowych sesji

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `useAutoWebinarTracking.ts` | Przyjmować `guestRegistrationId` zamiast szukać po emailu; deduplikacja tworzenia widoków |
| `AutoWebinarEmbed.tsx` | Pobrać registration ID na podstawie emaila + event_id z configu; przekazać do hooka |
| `useTeamContacts.ts` | Mapować nazwy kategorii: BO → "Business Opportunity", HC → "Health Conversation" |
| `EventGroupedContacts.tsx` | Użyć zmapowanej nazwy kategorii jako tytułu grupy dla auto-webinarów |

## Uwagi
- Istniejące dane w `auto_webinar_views` z błędnymi `guest_registration_id` nie zostaną automatycznie naprawione — dotyczy to tylko nowych sesji
- Można opcjonalnie uruchomić migrację SQL, która naprawi istniejące powiązania

