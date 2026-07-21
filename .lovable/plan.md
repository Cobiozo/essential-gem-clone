## Plan wdrożenia (2 zadania)

### 1) Powiadomienie po zakończeniu przetwarzania serwerowego (upload wideo)

**`src/hooks/useLocalStorage.ts`**
- Dodaję etap uploadu: `uploadStage: 'idle' | 'transferring' | 'processing' | 'verifying' | 'done'` (nowy stan + zwrot z hooka).
- Przełączenie na `processing` gdy `xhr.upload.onprogress` osiągnie 100% (pasek stoi na 90%).
- Po `xhr.onload` → `verifying`, po pomyślnej weryfikacji → `done` (utrzymane ~800 ms, potem `idle`).

**`src/components/MediaUpload.tsx`**
- Pod paskiem osobne komunikaty per etap + `Tooltip` z pełnym opisem:
  - `transferring` — „Przesyłanie… {n}%"
  - `processing` — „Optymalizacja wideo na serwerze (H.264/AAC pod iPhone). Może potrwać kilka minut — nie zamykaj karty." + spinner
  - `verifying` — „Weryfikacja pliku…"
- Gdy `uploadStage` przechodzi z `processing/verifying` → `done` **i to było wideo**: dodatkowy toast **„Przetwarzanie zakończone — plik gotowy do publikacji"**, potem dotychczasowy toast „Sukces".

Bez zmian po stronie serwera — działa również z obecnym synchronicznym transkodowaniem (klient jasno informuje, że proces trwa i kiedy się skończył).

### 2) Osobna widoczność kalendarza: trójstronne vs konsultacje

**Migracja bazy** (przez `supabase--migration`)
- `leader_permissions`: dodanie kolumn `tripartite_visibility_scope` i `consultation_visibility_scope` (`text`, default `'upline_only'`, CHECK w `('upline_only','everyone')`).
- Backfill z istniejącego `calendar_visibility_scope` do obu nowych pól (zachowanie dotychczasowego zachowania).
- Starą kolumnę `calendar_visibility_scope` **zostawiam** (deprecated) — nie usuwam teraz, żeby nie zepsuć nieaktualnego kodu; docelowo do wygaszenia.

**`src/components/events/UnifiedMeetingSettingsForm.tsx`**
- Usuwam wspólny selektor „Kto widzi Twój kalendarz" z sekcji wspólnej.
- Dodaję **osobny selektor w każdej karcie** (Spotkanie trójstronne / Konsultacje dla partnerów) z tymi samymi dwiema opcjami: „Tylko moja struktura" / „Wszyscy zalogowani użytkownicy".
- Stany: `tripartiteVisibilityScope`, `consultationVisibilityScope`. Ładowane z nowych kolumn (fallback do `calendar_visibility_scope`, potem `'upline_only'`).
- `upsert` w `leader_permissions` zapisuje obie nowe kolumny; dodatkowo aktualizuję deprecated `calendar_visibility_scope` = `'everyone'` gdy którakolwiek jest `everyone`, w przeciwnym razie `upline_only` (kompatybilność wsteczna).

**`src/components/events/MeetingTypeCard.tsx`**
- Nowe propsy `visibilityScope`, `onVisibilityScopeChange` — renderuję radio wewnątrz karty.

**`src/components/events/PartnerMeetingBooking.tsx`**
- Poszerzam `SELECT` z `leader_permissions` o `tripartite_visibility_scope, consultation_visibility_scope`.
- Filtrowanie liderów: pole scope wybierane wg `meetingType` (fallback: `calendar_visibility_scope` → `'upline_only'`). Admin bypass i logika upline bez zmian.

**Typy Supabase** — po aprobacie migracji poczekam na regenerację `src/integrations/supabase/types.ts`, potem podpinam nowe kolumny.

### Poza zakresem
- Nie ruszam odtwarzacza, CRM, webinar-alertów, RLS.
- Bez zmian w server.js w tym kroku (asynchroniczne transkodowanie może dojść w osobnym zadaniu).

Kolejność w build:
1. Migracja SQL (kolumny + backfill).
2. Zmiany w `useLocalStorage` + `MediaUpload` (niezależne od migracji).
3. Po regeneracji typów — formularz + `PartnerMeetingBooking`.