## Cel

1. Linki partnerskie do formularzy rejestracyjnych mają kończyć się numerem EQID partnera (`?ref=EQID`), co czytelnie wskazuje, do kogo przypisać gościa.
2. E‑mail "Rezerwacja przyjęta – dane do przelewu" ma pokazywać wyłącznie baner wydarzenia — bez złotego paska z logo Pure Life i Eqology IBP.

---

## 1. EQID jako `ref` w linkach partnerskich

### Co zmienić

Wszystkie miejsca, gdzie generowane lub odczytywane są ref-kody dla `paid_event_partner_links`, mają używać `profiles.eq_id`.

**Migracja DB**
- Zdjąć globalny `UNIQUE` z kolumny `paid_event_partner_links.ref_code`.
- Dodać `UNIQUE (form_id, ref_code)` (zapewnia unikalność w obrębie jednego formularza, pozwala temu samemu EQID występować przy różnych formularzach).
- Backfill: istniejące rekordy zaktualizować na `ref_code = profiles.eq_id` po `partner_user_id`. Tam gdzie partner nie ma `eq_id`, zostawić obecny kod.

**Frontend — generowanie linku**
- `src/components/paid-events/MyEventFormLinks.tsx` (mutacja `generateLink`):
  - Pobrać `eq_id` z `profiles` zalogowanego użytkownika (jeśli brak — komunikat: "Uzupełnij EQID w profilu, aby wygenerować link").
  - W `insert` użyć `ref_code = eq_id`.
  - Jeżeli rekord dla tej pary `(partner_user_id, form_id)` już istnieje — zaktualizować jego `ref_code` do EQID (idempotentnie, np. `upsert` po `(partner_user_id, form_id)`).
- `src/pages/PaidEventPage.tsx` (auto‑attribution dla zalogowanego partnera):
  - Zamiast losowego sufiksu, użyć `eq_id` z profilu jako `ref_code`. Logika lookup→insert pozostaje ta sama.

**Backend — odczyt po ref_code**
- `supabase/functions/register-event-transfer-order/index.ts`: lookup `paid_event_partner_links` po `ref_code` jest już niezmieniony i zadziała z EQID.
- Trigger SQL `submit_event_form` (`20260424152226_*.sql`) odczytuje partnera po `ref_code` — działa bez zmian.

### Format linku po zmianie

```
https://purelife.info.pl/event-form/<slug-formularza>?ref=<EQID>
```

---

## 2. E‑mail rezerwacji bez paska Pure Life / Eqology

### Diagnoza

Źródło `supabase/functions/register-event-transfer-order/index.ts` aktualnie buduje e‑mail tylko z banera wydarzenia (komentarz w kodzie: "Banner wydarzenia jako jedyny nagłówek graficzny"). Banner w bazie (`paid_events.banner_url`) to czysty obraz Krakowa z logiem EQOLOGY — nie zawiera złotego paska.

To oznacza, że na produkcji wciąż działa **starsza wersja edge function**, która dorzucała blok `DualBrandHeader` (gradient `#D4AF37 → #F5E6A3 → #D4AF37` + logo Pure Life + obraz `eqology-ibp-logo.png`).

### Co zrobić

- Usunąć z `register-event-transfer-order/index.ts` nieużywane stałe `logoUrl` i `eqologyLogoUrl` (porządek, eliminuje ryzyko ich późniejszego użycia).
- Wymusić ponowne wdrożenie funkcji `register-event-transfer-order`, aby produkcja używała aktualnej wersji (tylko banner wydarzenia, zero brandingu Pure Life/Eqology w nagłówku).
- Zweryfikować, że funkcja `send-event-form-confirmation` (używana przez formularze rejestracyjne — odrębna od kupna biletu) również nie zawiera paska brandingowego — po przeglądzie: jest czysta, używa wyłącznie `form.banner_url`. Brak zmian.
- Po wdrożeniu wykonać testową rezerwację jako partner i jako gość, aby potwierdzić, że e‑mail ma tylko baner wydarzenia + treść.

---

## Pliki do edycji

- `supabase/migrations/<nowa>.sql` — zmiana unikalności `ref_code` + backfill EQID.
- `src/components/paid-events/MyEventFormLinks.tsx` — generowanie linków po EQID.
- `src/pages/PaidEventPage.tsx` — auto‑ref po EQID dla zalogowanego partnera.
- `supabase/functions/register-event-transfer-order/index.ts` — usunięcie nieużywanych stałych logo, redeploy.

## Zakres niezmieniany

- Tabela `event_form_submissions` i RPC `submit_event_form` — bez zmian (czytają po `ref_code`).
- Funkcje SMTP, układ treści e‑maila i dane do przelewu — bez zmian.
- DualBrandHeader (komponent React) — pozostaje, używany jest na publicznych stronach potwierdzenia/anulowania, nie w e‑mailach.