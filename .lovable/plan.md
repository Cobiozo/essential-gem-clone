## Problem

Po kliknięciu w link potwierdzający rejestrację (CTA z e-maila) użytkownik widzi stronę z komunikatem:

> „Teraz oczekujemy na płatność na dane wskazane w wysłanym e-mailu. Po zaksięgowaniu wpłaty otrzymasz bilet…"

Ten tekst pojawia się również dla wydarzeń **bezpłatnych** (np. „Kompleksowe szkolenie test"), choć powinien być pokazywany tylko przy wydarzeniach **płatnych**.

## Analiza

W pliku `src/pages/EventFormConfirmPage.tsx` (linie 66–75) logika rozgałęzienia już istnieje – używa flagi `isFree` zwracanej przez edge function `confirm-event-form-email`. Funkcja czyta `paid_events.is_free` z bazy.

Najprawdopodobniej dla tego wydarzenia rekord `paid_events` ma `is_free = false`, mimo że bilety mają cenę 0 PLN. Trzeba ustalić warunek „darmowe" bardziej odpornie, żeby ekran zawsze pasował do realnej natury wydarzenia.

## Plan zmian

### 1. `supabase/functions/confirm-event-form-email/index.ts`
Wzmocnić wyliczanie `is_free`:
- nadal czytać `paid_events.is_free`,
- dodatkowo, jeśli `is_free` jest `false`/`null`, sprawdzić `paid_event_tickets` dla tego `event_id` (aktywne, `deleted_at IS NULL`) – jeśli wszystkie mają `price_pln = 0` (lub nie ma w ogóle płatnych biletów), traktować wydarzenie jako bezpłatne i zwrócić `is_free: true`.
- Zwracać też pomocnicze `is_free_effective` (alias, ten sam boolean) w odpowiedzi – nazwę zostawiamy `is_free` dla kompatybilności z frontem.

### 2. `src/pages/EventFormConfirmPage.tsx`
Tylko kosmetycznie doprecyzować teksty (logika warunkowa już jest poprawna):

- **Wariant BEZPŁATNY** (`is_free === true`):
  - Nagłówek: „Twoje dane i rejestracja zostały poprawnie potwierdzone"
  - Bez akapitu o płatności.
  - Stopka: „Dziękujemy i do zobaczenia na wydarzeniu!"
  - (usuwamy obecny tekst „Sprawdź skrzynkę e-mail, ponieważ na nią dostałeś bilet…" – użytkownik prosi o sam komunikat „dziękujemy"; bilet i tak przychodzi mailem, ale ekran ma być zwięzły).

- **Wariant PŁATNY** (`is_free === false`):
  - Nagłówek bez zmian.
  - Akapit: „Teraz oczekujemy na płatność na dane wskazane w wysłanym e-mailu. Po zaksięgowaniu wpłaty otrzymasz bilet uprawniający do uczestnictwa w wydarzeniu."
  - Stopka: „Dziękujemy i do zobaczenia na wydarzeniu!"

Komunikat „(Twoja rejestracja była już potwierdzona wcześniej.)" zostaje dla obu wariantów, gdy `state === 'already'`.

### 3. Deploy
Po zmianach: `deploy_edge_functions` dla `confirm-event-form-email`.

## Pliki do zmiany
- `supabase/functions/confirm-event-form-email/index.ts`
- `src/pages/EventFormConfirmPage.tsx`

Bez zmian w bazie danych ani innych komponentach.
