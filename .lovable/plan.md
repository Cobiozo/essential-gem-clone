## Problem

W `EventEditorPreview.tsx` podgląd biletów nie filtruje ich według pola `audience` ticketu. Filtr dotyczy tylko sekcji (`visible_to_guests`) oraz bloków (speakers/description), ale lista `tickets` jest renderowana w całości niezależnie od `previewMode`.

Dodatkowo publiczna strona (`PaidEventPage` + `PaidEventSidebar`) filtruje po `audience`, ale podgląd admina tego nie robi — dlatego "Widok gościa" pokazuje oba bilety.

## Fix (tylko UI podglądu, bez zmian w logice biznesowej)

**Plik:** `src/components/admin/paid-events/editor/EventEditorPreview.tsx`

1. Po pobraniu `tickets` dodać filtr zależny od `previewMode`:
   - `guest` → pokazuj tylko bilety z `audience IN ('all', 'guest_only')`
   - `admin` → pokazuj wszystkie bilety (jak teraz), ale wizualnie oznaczyć badge'em audience (`Goście` / `Zalogowani` / `Wszyscy`) żeby admin wiedział co kto zobaczy.

2. Renderować `filteredTickets` zamiast `tickets` w sekcji prawej kolumny.

3. Komunikat gdy w trybie `guest` po filtrze jest 0 biletów: "Niezalogowany gość nie zobaczy żadnego biletu na tej stronie."

## Co NIE zmieniamy

- Bez migracji DB.
- Bez zmian w `PaidEventPage.tsx`, `PaidEventSidebar.tsx`, edge functions, checkout — to działa już poprawnie.
- Bez zmian w `EventTicketsPanel.tsx` (admin form).
