## Problem
„Failed to send a request to the Edge Function" przy klikaniu „Zarezerwuj miejsce" — funkcje `register-free-event-order` i `confirm-free-event-reservation` nie są wpisane w `supabase/config.toml`, więc nie są deployowane.

## Fix
Dopisać na końcu `supabase/config.toml`:

```toml
[functions.register-free-event-order]
verify_jwt = false

[functions.confirm-free-event-reservation]
verify_jwt = false
```

Oba endpointy są publiczne (gość niezalogowany rezerwuje / klika link z maila) — `verify_jwt = false`.

## Pliki
- `supabase/config.toml`