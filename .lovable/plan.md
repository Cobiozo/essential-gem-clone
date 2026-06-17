## Diagnoza

Sprawdziłem zgłoszenie Anny Olewińskiej w bazie (`event_form_submissions`):

- `event_id` → BUSINESS OPPORTUNITY MEETING – ŁÓDŹ, `is_free = true`
- `payment_status = 'pending'`
- `email_confirmed_at = NULL` (kolumna „Email" w panelu pokazuje: *Wysłany — czeka*)
- `status = 'active'`

**To NIE jest błąd rejestracji / wysyłki biletów.** Gość po prostu **jeszcze nie kliknął linku potwierdzającego e-mail**. Backend (`supabase/functions/confirm-event-form-email`) dla `is_free=true` po kliknięciu linku:
1. tworzy/aktualizuje `paid_event_orders` → `status = 'paid'`, `email_confirmed_at`,
2. wystawia bilet przez `issueFreeTicketForOrder` (wysyłka PDF + QR),
3. ustawia w `event_form_submissions` → `payment_status = 'paid'`, `email_confirmed_at`.

Czyli ścieżka działa poprawnie — dopóki Anna nie potwierdzi maila, pozostanie w stanie oczekującym, a po potwierdzeniu automatycznie dostanie darmowy bilet.

## Problem do naprawy (kosmetyczny, mylący)

Kolumna **„Płatność"** w `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx` renderuje bezwarunkowo etykietę `PAYMENT_LABELS[payment_status]` (żółte „Oczekuje"). Dla wydarzeń **bezpłatnych** (`paid_events.is_free = true`) płatność nie istnieje — etykieta sugeruje fałszywie, że ktoś czeka na przelew. Ten sam ekran dla użytkownika (`MyEventFormReferrals.tsx`) ma już osobny `freeBadge`, którego brakuje w panelu admina.

## Plan zmian

Tylko UI (`EventFormSubmissions.tsx`), bez ruszania logiki rejestracji/wysyłki biletów.

1. **Dociągnąć `is_free` do każdego wiersza** — zapytanie już selectuje `paid_events ( is_free )`. Upewnić się, że pole `is_free` trafia do znormalizowanego rekordu w obu gałęziach (submission + order fallback).
2. **Nowa funkcja renderująca komórkę „Płatność"** `renderPaymentCell(s)`:
   - jeżeli `s.payment_status === 'cancelled'` → czerwony badge „Anulowane" (bez zmian).
   - jeżeli `s.is_free === true`:
     - `payment_status === 'paid'` lub `email_confirmed_at` ustawione → zielony badge **„Bezpłatne — potwierdzone"**,
     - inaczej → szary/żółty badge **„Bezpłatne — czeka na potwierdzenie e-mail"** (ikona `Mail`).
   - w pozostałych (płatnych) przypadkach → obecne `PAYMENT_LABELS` (Opłacone / Oczekuje / Zwrot).
3. **Ukryć akcje płatności dla `is_free`** — przyciski „Oznacz jako opłacone" / „Cofnij do oczekującego" (linie ~1005–1014) nie mają sensu dla biletów darmowych; renderować je tylko gdy `!s.is_free`. Akcja „Anuluj" zostaje.
4. **Eksport Excel** — w kolumnie „Płatność" dla `is_free` zapisać czytelną wartość (`Bezpłatne — potwierdzone` / `Bezpłatne — oczekuje potwierdzenia e-mail`) zamiast „Oczekuje".
5. Drobny tooltip pod badgem dla `is_free` + brak potwierdzenia: „Bilet zostanie wysłany automatycznie po kliknięciu linku w mailu potwierdzającym."

## Czego NIE zmieniam

- Backendu rejestracji, `confirm-event-form-email`, `issueFreeTicketForOrder`, `admin-mark-event-payment` — działają poprawnie.
- Schematu bazy ani RLS.
- Komponentu użytkownika `MyEventFormReferrals` (już ma poprawną logikę darmowych biletów).

## Pliki

- `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx` — wyłącznie warstwa prezentacji + drobna logika kolumny „Płatność" i eksportu.
