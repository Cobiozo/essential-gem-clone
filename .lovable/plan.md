## Cel
1. W `Panel admin → Płatne wydarzenia → Formularze → Zgłoszenia` osoba zarejestrowana na platformie z rolą `guest` (np. Romanek Romanowski) jest dziś klasyfikowana jako "Partner". Trzeba ją rozpoznać jako **Gość PLC**.
2. Dodać trzecią zakładkę obok `Wszystkie / Goście / Partnerzy` — **Goście PLC**.
3. Na pasku bocznym pulpitu pod imieniem użytkownika z rolą `guest` zamienić etykietę "Gość" na **"Gość PLC"** (odróżnienie od gościa zewnętrznego z formularza).

## Zmiany w kodzie (tylko frontend)

### 1. `src/components/dashboard/UserProfileCard.tsx`
- W `getRoleDisplayName`: `case 'guest': return 'Gość PLC';`

### 2. `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx`
- Dociągnąć role z `user_roles` dla `submitterProfilesByEmail` (po `user_id`). Zbudować mapę `emailLower → role`.
- Wprowadzić trzy kategorie zamiast dwóch:
  - `external_guest` — email nie istnieje w `profiles`
  - `platform_guest` — email istnieje + rola = `guest` (lub `client`/`user` jeśli to też ma być traktowane jako "Gość PLC"; domyślnie tylko `guest`)
  - `partner` — email istnieje + rola ≠ `guest` (partner/specjalista/admin/itd.); zamówienia w `paid_event_orders` z `user_id` traktujemy jako partner tylko jeśli rola właściciela ≠ guest, inaczej jako platform_guest
- Zamienić stan `audience: 'all' | 'guests' | 'partners'` na `'all' | 'guests' | 'platform_guests' | 'partners'`.
- Dodać `audienceCounts.platformGuests`.
- W `TabsList` dodać czwartą zakładkę **"Goście PLC (n)"** między `Goście` a `Partnerzy`, z ikoną (np. `ShieldCheck` lub `UserCog`).
- W filtrowaniu `filtered` rozdzielić warunki dla trzech kategorii.
- W kolumnie `Osoba` zmienić badge — obecnie wyświetla się "Partner" dla każdego zarejestrowanego; dla `platform_guest` pokazać badge **"Gość PLC"** (np. wariant `outline` w innym kolorze), dla `partner` zostawić "Partner", dla `external_guest` — bez badge lub "Gość".

### 3. (Opcjonalnie) `src/components/admin/PaidEventsOrders.tsx`
- Dla spójności możemy też dodać badge "Gość PLC" obok obecnych "Zalogowany / Gość" — wymagałoby pobrania roli z `user_roles` po `user_id`. **Pomijam w tym planie** chyba że potwierdzisz, że chcesz to też tam.

## Bez zmian
- Brak migracji DB, brak zmian RLS, brak zmian edge functions.
- Klasyfikacja oparta o istniejące tabele `profiles` + `user_roles` (RLS już pozwala adminowi czytać role).

## Pytanie do potwierdzenia
- Czy do "Gość PLC" zaliczamy WYŁĄCZNIE rolę `guest`, czy także `client`/`user` (jeśli takie istnieją w systemie)? Domyślnie zakładam tylko `guest`.
