
## Problem

W `PartnerMeetingBooking` (zakładka „Rezerwuj → Trójstronne / Konsultacje") pobierane są **wszyscy** liderzy z włączonym `tripartite_meeting_enabled` / `partner_consultation_enabled`, bez żadnego filtrowania po hierarchii. Dlatego np. `sebastiansnopek.eqology` widzi Dorotę Hamerską i Elżbietę Dąbrowską, mimo że nie są jego uplinem.

Oczekiwane zachowanie: użytkownik widzi tylko liderów, którzy są **powyżej niego w linii** (chain `upline_eq_id` z `profiles`), a lider może opcjonalnie „otworzyć" kalendarz dla wszystkich.

## Zmiany

### 1. Baza — nowa kolumna widoczności kalendarza

Migracja na `public.leader_permissions`:

- `calendar_visibility_scope text NOT NULL DEFAULT 'upline_only'` z CHECK w (`'upline_only'`, `'everyone'`).
- Krótki komentarz kolumny.

`upline_only` = kalendarz widoczny tylko dla użytkowników w downline lidera (czyli lider jest w ich uplinie). `everyone` = widoczny dla wszystkich zalogowanych.

### 2. Funkcja pomocnicza — chain uplinu bieżącego użytkownika

Nowa funkcja SQL `public.get_upline_user_ids(_user_id uuid)` (SECURITY DEFINER, `SET search_path = public`):

- Startuje od `profiles.upline_eq_id` użytkownika.
- Rekurencyjnie wspina się po `profiles` po `eq_id = poprzedni upline_eq_id`, max 20 poziomów, unikając cykli.
- Zwraca `TABLE(user_id uuid)` — wszystkich przodków (bez self).

GRANT EXECUTE dla `authenticated`.

### 3. Frontend — `PartnerMeetingBooking.loadPartners`

Po pobraniu `permissions` i `profiles` dokładam filtrowanie:

1. Wołam `supabase.rpc('get_upline_user_ids', { _user_id: user.id })` → `Set<uplineIds>`.
2. Pobieram też `calendar_visibility_scope` z `leader_permissions`.
3. Lider trafia na listę tylko, gdy:
   - `scope === 'everyone'`, **lub**
   - `perm.user_id` jest w `uplineIds`.
4. Admin (`userRole === 'admin'`) widzi wszystkich (bypass) — jak dziś przy innych podglądach.

Reszta logiki (filtrowanie po `has_availability || use_external_booking`, wykluczanie self) bez zmian.

### 4. Frontend — przełącznik dla lidera w `UnifiedMeetingSettingsForm`

W sekcji „Ustawienia kalendarza" (obok wyboru trybu wewnętrzny/Calendly) dodaję pole:

- Label: „Kto widzi Twój kalendarz spotkań indywidualnych?"
- `RadioGroup`:
  - **Tylko moja struktura (poniżej mnie)** — domyślne.
  - **Wszyscy zalogowani użytkownicy** — świadome „otwarcie" dla całej platformy.
- Krótki opis: „Zalecane: tylko struktura. Wybierz »Wszyscy«, jeśli chcesz udostępniać swój kalendarz również osobom spoza swojego downline'u."

Wartość ładowana z `leader_permissions.calendar_visibility_scope` i zapisywana w istniejącym `upsert` (linie 359–362).

Admin nie zmienia zachowania (i tak widzi wszystkich).

## Dlaczego przełącznik ma sens

Tak — użytkownik potrzebuje obu zachowań:

- **Domyślnie `upline_only`** rozwiązuje raportowany problem prywatności/porządku (Sebastian nie widzi Doroty ani Elżbiety).
- **Opcja `everyone`** zostawia furtkę dla liderów, którzy świadomie chcą być „partnerem prowadzącym" dla całej platformy (np. jako gość specjalny, mentor cross-team). Bez tego przełącznika stracilibyśmy dotychczasowe zachowanie w przypadkach, gdzie było pożądane; z przełącznikiem lider sam decyduje i decyzja jest jawna w jego panelu.

## Efekt końcowy (na przykładach z prośby)

Przy strukturze `dawidkowalczyk → doroty hamerskiej → elżbiety dąbrowskiej → sebastianasnopek.eqology`:

- `sebastiansnopek.eqology` widzi tylko `dawidkowalczyk` (upline_only na Dorocie i Elżbiecie).
- `elzbieta.dabrowska` widzi `dawidkowalczyk` (Dorota jej downline).  
  *Uwaga:* w treści prośby jest: „elzbieta dabrowska tylko dawid kowalczyk" — plan realizuje dokładnie ten warunek: pokazuje wyłącznie uplinie, więc Dorota (downline Elżbiety) nie będzie widoczna. Zgodne z prośbą.
- `dorota.hamerska` widzi `elzbieta.dabrowska`? Nie — Elżbieta jest jej downline. Zgodnie z prośbą pokazujemy tylko upline, więc Dorota zobaczy `dawidkowalczyk`.  
  *Rozbieżność do potwierdzenia:* w prośbie napisano „dorota hamerska powinna widzieć elżbieta dabrowska i dawid kowalczyk" — to oznaczałoby „upline + downline". Domyślnie plan realizuje **tylko upline** (spójne z pozostałymi przykładami). Jeśli intencją było „również lider widzi swój downline z włączonym kalendarzem", zmienimy regułę na „upline ∪ własny downline" — daj znać, którą wersję wdrożyć.

## Techniczne szczegóły

- Filtrowanie po stronie klienta (analogicznie jak dziś); RLS na `leader_permissions` już pozwala czytać publicznie interesujące pola.
- Nie ruszam RLS ani innych ścieżek (Admin, panele lidera, edge functions dla `check-google-calendar-busy` itd.).
- Brak wpływu na `leader_availability`, `events`, rezerwacje.
- Migracja obejmuje: `ALTER TABLE`, CHECK constraint, `CREATE FUNCTION get_upline_user_ids`, `GRANT EXECUTE`.
