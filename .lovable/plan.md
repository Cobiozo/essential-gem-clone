## Cel

1. Naprawi膰 b艂膮d usuwania biletu (FK `paid_event_orders_ticket_id_fkey` RESTRICT) przez wdro偶enie soft-delete.
2. Dla wydarze艅 oznaczonych jako bezp艂atne (`is_free = true`) prze艂膮czy膰 sekcj臋 "Bilety" w tryb "Rezerwacje" 鈥� bez ceny i metod p艂atno艣ci.

---

## 1. Soft-delete biletu

### Migracja
- `paid_event_tickets`: doda膰 kolumn臋 `deleted_at timestamptz NULL` (je艣li brak) oraz indeks cz臋艣ciowy na `(event_id) WHERE deleted_at IS NULL`.
- Pozosta膰 przy `is_active boolean` jako flaga publicznej widoczno艣ci; `deleted_at` oznacza "usuni臋ty z panelu admina".

### Frontend (`PaidEventTicketsTab` / komponent biletu w edytorze)
- Przycisk **Usu艅** wywo艂uje `UPDATE paid_event_tickets SET deleted_at = now(), is_active = false WHERE id = ?` zamiast `DELETE`.
- Lista bilet贸w w edytorze filtruje `deleted_at IS NULL`.
- Publiczne zapytanie (`PaidEventPage`, `PurchaseDrawer`) ju偶 filtruje `is_active = true` 鈥� dodatkowo doda膰 `deleted_at IS NULL` dla pewno艣ci.
- Toast po sukcesie: "Bilet zosta艂 zarchiwizowany. Istniej膮ce zam贸wienia pozostaj膮 nienaruszone."

### RLS / GRANT
- Bez zmian (UPDATE dla adminow贸w ju偶 istnieje).

---

## 2. Tryb "Rezerwacja" dla wydarze艅 bezp艂atnych

### Edytor (zak艂adka **Bilety**)
Gdy `event.is_free === true`:
- Nag艂贸wek zak艂adki: **"Rezerwacje"** zamiast **"Bilety"**.
- Etykiety w UI bilet贸w: **"Rezerwacja"** zamiast **"Bilet"** (przycisk "Dodaj rezerwacj臋", nag艂贸wek karty, komunikaty).
- **Ukryte pola**: cena (`price_pln`), wszystkie warianty cenowe (early bird, standard, late), link PayPal per-bilet, ustawienia PayU/przelew per-bilet.
- **Widoczne pola**: nazwa, opis, dost臋pna ilo艣膰, os贸b na 1 rezerwacj臋, benefity/regulamin, aktywny, wyr贸偶niony.
- Walidacja zapisu: w trybie `is_free` cena ustawiana automatycznie na `0` w mutacji.

### Publiczna karta rejestracji (`PurchaseDrawer` / `PaidEventPage`)
- Wcze艣niej zaplanowany free-flow ju偶 dzia艂a; teraz pokazuje **list臋 typ贸w rezerwacji** (je艣li wi臋cej ni偶 jeden aktywny), z opisem/benefitami, bez ceny.
- Etykieta CTA: **"Zarezerwuj miejsce"**.

### Bez migracji
Nie ma zmian schematu 鈥� wykorzystujemy istniej膮ce `paid_event_tickets` z `price_pln = 0`.

---

## Pliki do zmiany

**Migracja:**
- nowa: `supabase/migrations/..._add_ticket_deleted_at.sql`

**Frontend:**
- `src/components/admin/paid-events/editor/PaidEventTicketsTab.tsx` (lub odpowiednik z list膮 bilet贸w + przycisk Usu艅) 鈥� soft-delete + warunki `is_free`.
- `src/components/admin/paid-events/editor/TicketCard.tsx` (lub komponent karty edycji biletu) 鈥� ukrywanie p贸l cenowych i p艂atno艣ci w trybie `is_free`, zmiana etykiet.
- `src/components/paid-events/public/PurchaseDrawer.tsx` 鈥� etykieta "Zarezerwuj", lista bez ceny gdy `is_free`.
- `src/pages/PaidEventPage.tsx` 鈥� filtr `deleted_at IS NULL` w zapytaniu o bilety.

**Typy:** `src/integrations/supabase/types.ts` zostanie zregenerowany po migracji.

---

## Krok po kroku QA
1. Edytuj bilet 鈫� **Usu艅** 鈫� znika z listy, brak b艂臋du FK, zam贸wienia zachowane.
2. W "G艂贸wne" w艂膮cz **Wydarzenie bezp艂atne** 鈫� zak艂adka pokazuje "Rezerwacje", brak p贸l cenowych.
3. Wy艂膮cz tryb bezp艂atny 鈫� wracaj膮 pola cenowe i metody p艂atno艣ci.
4. Public preview free-event 鈫� formularz "Zarezerwuj miejsce" + double-opt-in email (ju偶 wdro偶one).
