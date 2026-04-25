## Diagnoza (3 problemy zgłoszone przez Ciebie)

### 1. Brak banera wydarzenia w mailu dla zalogowanego
Funkcja `register-event-transfer-order` używa stałego nagłówka (logo Pure Life + Eqology) i nigdzie nie pobiera `paid_events.banner_url`. Email wygląda tak samo dla zalogowanego i gościa — bez banera wydarzenia u góry.

### 2. Brak danych kontaktowych osoby zapraszającej / upline
W mailu jest tylko zdanie „W razie pytań prosimy o kontakt mailowy z osobą zapraszającą lub organizatorem." — bez żadnych konkretnych danych. Funkcja:
- nie pobiera danych partnera (`partnerUserId` jest tylko używane do CRM/notyfikacji, ale jego profil nie jest ładowany),
- dla zalogowanego nie czyta jego upline z `profiles` (`upline_eq_id`, `upline_first_name`, `upline_last_name`).

### 3. Nie wiadomo, kto z zalogowanych się zarejestrował
Tabela `paid_event_orders` ma kolumnę `user_id`, ale funkcja **nigdy jej nie wypełnia** — sprawdziłem 8 ostatnich rekordów w bazie, wszędzie `user_id = NULL`, nawet dla Twoich własnych rejestracji jako zalogowany. Powód: funkcja odczytuje tylko body requestu i nie pobiera użytkownika z `Authorization` header.

Dodatkowo: panel admina (`PaidEventsOrders.tsx`) nie pokazuje rozróżnienia „zalogowany vs gość" w liście zamówień.

---

## Plan zmian

### A. `supabase/functions/register-event-transfer-order/index.ts`

1. **Odczyt zalogowanego użytkownika z requestu**
   - Z nagłówka `Authorization` utworzyć dodatkowego klienta `supabaseAuth` z anon key i wywołać `auth.getUser(token)`.
   - Jeśli użytkownik istnieje → ustawić `currentUserId = user.id` i pobrać jego profil (`first_name`, `last_name`, `email`, `phone_number`, `upline_eq_id`, `upline_first_name`, `upline_last_name`).

2. **Zapis `user_id` do `paid_event_orders`**
   - Dołożyć `user_id: currentUserId` do `insert(...)` zamówienia. Service role bypassuje RLS, więc to wystarczy.

3. **Pobranie banera wydarzenia**
   - Rozszerzyć select w `paid_event_tickets`: `paid_events(..., banner_url)`.

4. **Dane kontaktowe osoby zapraszającej**
   - Jeśli `partnerUserId` (z `refCode`) → pobrać jego profil (`first_name`, `last_name`, `email`, `phone_number`) → to są dane do sekcji „Osoba zapraszająca" w mailu (głównie ścieżka gościa z linku partnerskiego).
   - Jeśli zalogowany użytkownik **nie** wszedł z linku partnerskiego → użyć jego upline z `profiles.upline_*`. Wyszukać profil upline po `upline_eq_id` w `profiles` (jeśli istnieje pełny rekord) aby pozyskać telefon/email; jeśli nie znajdziemy — wyświetlić tylko imię/nazwisko z kolumn `upline_first_name`/`upline_last_name`.

5. **`buildEmail` — przepisanie szablonu**
   - **U góry maila baner wydarzenia** (`<img src="${banner_url}" style="width:100%;display:block;">`) zamiast/nad obecnym pasem z logo. Logo Pure Life + Eqology przeniesione pod baner w mniejszym pasku (spójność wizualna).
   - **Na dole, przed stopką**, sekcja kontaktowa zależna od kontekstu:
     - **Dla zalogowanego (z upline):** „**Twój opiekun w Pure Life:** {imię} {nazwisko}" + email (klikalny `mailto:`) + telefon (jeśli jest) + krótka informacja: „Skontaktuj się w razie pytań do wydarzenia."
     - **Dla gościa (z `partnerUserId` z linku):** „**Osoba zapraszająca:** {imię} {nazwisko}" + email + telefon + „W razie dodatkowych pytań skontaktuj się bezpośrednio."
     - Fallback (brak danych zarówno upline jak i partnera): obecne zdanie ogólne.

6. **Bezpieczne fallbacki** — wszystkie pola opcjonalne; jeśli `banner_url` brak → email renderuje się bez banera (obecny pasek z logo zostaje jako zapas).

### B. `src/components/admin/paid-events/PaidEventsOrders.tsx` (drobne, opcjonalne, ale spina punkt 3)
- Dodać w liście zamówień kolumnę/badge „Zalogowany / Gość" w oparciu o `user_id IS NOT NULL`.
- Jeśli `user_id` istnieje → pokazać link/imię z `profiles` (już mamy join przez user_id).

### C. Wywołanie z frontu — `PurchaseDrawer.tsx`
**Brak zmian wymaganych.** `supabase.functions.invoke` automatycznie dołącza `Authorization: Bearer <session JWT>` jeśli użytkownik jest zalogowany — funkcja po stronie Edge wystarczy że sama go odczyta.

### D. Deploy
Po zmianach: redeploy `register-event-transfer-order`. Wykonam testową rejestrację i sprawdzę logi (`[email] sent successfully`) oraz w bazie czy `user_id` jest wypełnione.

---

## Czego NIE zmieniam
- Logiki SMTP, kolejki, retry — to działa.
- Schematu bazy danych — kolumna `user_id` już istnieje, kolumna `banner_url` w `paid_events` już istnieje.
- Maila po opłaceniu (z biletem QR) — to inny flow (`admin-mark-event-payment`), poza zakresem tego zgłoszenia. Jeśli chcesz, mogę zająć się nim w osobnym kroku.

## Pliki do edycji
- `supabase/functions/register-event-transfer-order/index.ts` (główne zmiany)
- `src/components/admin/paid-events/PaidEventsOrders.tsx` (badge zalogowany/gość)
