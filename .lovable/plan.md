## Diagnoza

Funkcja `register-free-event-order` działa poprawnie i zwraca 409 `already_registered` — dlatego we frontendzie pojawia się "Edge Function returned a non-2xx status code".

Powód: w bazie istnieje 7 starych zamówień dla `sebastiansnopek87@gmail.com` na to wydarzenie (event `c38f3e14…`) ze statusem `pending` (pozostałości z poprzedniego, płatnego trybu — sprzed przełączenia eventu na bezpłatny). Obecny dedup wyklucza tylko `cancelled/refunded/failed/expired`, więc `pending` blokuje nowe rezerwacje.

## Plan naprawy

1. **`supabase/functions/register-free-event-order/index.ts`** — zawęzić dedup: blokować tylko gdy istniejące zamówienie ma status istotny dla flow bezpłatnego, tj. `awaiting_email_confirmation` lub `confirmed`. Pozostałe (`pending`, `awaiting_transfer` itp. z dawnego trybu płatnego) ignorujemy.

   ```ts
   .in("status", ["awaiting_email_confirmation", "confirmed"])
   ```

2. **Migracja czyszcząca** — oznaczyć stare „martwe" zamówienia jako `cancelled`, żeby nie zaśmiecały statystyk:
   - `UPDATE paid_event_orders SET status='cancelled' WHERE event_id IN (SELECT id FROM paid_events WHERE is_free=true) AND status IN ('pending','awaiting_transfer') AND payment_provider <> 'free';`

3. Deploy edge function i weryfikacja przez ponowną próbę rezerwacji.

Bez zmian w UI ani logice płatnych eventów.