## Problem 1 — Treść maila wygląda tragicznie

W mailu w polu „opis" ląduje surowy HTML z opisu wydarzenia (`<span style="--tw-scale-x: 1; ...">…`). Funkcja `buildEmailHtml` bierze `event.description` i jedynie escape'uje HTML — więc wszystkie znaczniki i inline-style Tailwinda pokazują się jako tekst.

**Fix (`supabase/functions/process-event-email-campaigns/index.ts`):**
- Przed wstawieniem opisu do maila usunąć HTML:
  1. Usunąć `<style>…</style>` i `<script>…</script>` (wraz z zawartością).
  2. Zamienić `<br>`, `</p>`, `</div>`, `</li>` na `\n`.
  3. Usunąć wszystkie pozostałe tagi `<[^>]+>`.
  4. Zdekodować podstawowe encje (`&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`).
  5. Zredukować wielokrotne spacje/nowe linie, przyciąć do 500 znaków.
- Wynik renderować z zachowaniem akapitów: split po `\n\n` → osobne `<p>`, pojedyncze `\n` → `<br/>`.
- Zdeployować funkcję (`supabase--deploy_edge_functions`).

## Problem 2 — „duplicate key … event_registrations_event_user_no_date_key" przy ponownej rejestracji

W bazie na `public.event_registrations` istnieją TRZY unikalne indeksy, które sobie przeczą:

```
unique_user_event_occurrence_stable
  (user_id, event_id, COALESCE(occurrence_date,''), COALESCE(occurrence_time,''))
  WHERE status = 'registered'            ← poprawny, uwzględnia status

event_registrations_event_user_date_time_key
  (event_id, user_id, occurrence_date, occurrence_time)   ← BEZ filtra statusu

event_registrations_event_user_no_date_key
  (event_id, user_id) WHERE occurrence_date IS NULL AND occurrence_time IS NULL   ← BEZ filtra statusu
```

Wypisanie się ustawia `status='cancelled'` (soft delete — wiersz zostaje). Przy ponownym zapisie kod próbuje `INSERT` nowego wiersza (bo wyszukiwanie istniejącego wiersza filtruje po `occurrence_index`, więc czasem go nie znajduje) — i wpada na jeden z dwóch „twardych" indeksów, które nie patrzą na status. Stąd błąd `event_registrations_event_user_no_date_key`.

**Fix — migracja SQL:**

```sql
DROP INDEX IF EXISTS public.event_registrations_event_user_date_time_key;
DROP INDEX IF EXISTS public.event_registrations_event_user_no_date_key;
-- zostaje wyłącznie unique_user_event_occurrence_stable (partial WHERE status='registered'),
-- która pozwala mieć wiele rekordów 'cancelled' obok jednej aktywnej rejestracji.
```

To odblokowuje ponowną rejestrację po wypisaniu się — zarówno dla wydarzeń zwykłych, jak i cyklicznych (occurrence_date/time) — bez utraty historii anulowanych rejestracji (dalej trzymamy je do statystyk/CRM).

Nie ruszam logiki rejestracji w komponentach — problem jest po stronie schematu, nie kodu klienta.

## Pliki do zmiany
- `supabase/functions/process-event-email-campaigns/index.ts` — sanitizacja opisu + redeploy
- migracja SQL — DROP dwóch nadmiarowych unique indexów na `event_registrations`
