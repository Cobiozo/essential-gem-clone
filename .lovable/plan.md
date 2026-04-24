## Diagnoza

Sprawdziłem bazę i logi:

**Gość:** Jan Testujący (byk1023@wp.pl) jest zarejestrowany na "TEST - KRAKÓW" — submission istnieje. Ale:
- `partner_user_id = NULL` — gość NIE wszedł przez link partnerski (`?ref=...`), tylko przez „goły" URL formularza. Dlatego nie pojawił się ani w „Z zaproszeń na Eventy" w Pure-Kontaktach, ani nikt nie został powiązany.
- `email_status = 'pending'` — email się **nie wysłał**, bo edge function zawiódł.

**Przyczyna braku emaila** (logi edge function):
```
Submission not found: Could not find a relationship between
'event_form_submissions' and 'paid_events' in the schema cache
```
Funkcja `send-event-form-confirmation` używa PostgREST embed
`paid_events!event_form_submissions_event_id_fkey(...)`, ale w bazie nie ma żadnego FK na `event_form_submissions` → embed pada → cały handler rzuca 500 → email nigdy nie wychodzi.

## Co naprawiam

### 1. `supabase/functions/send-event-form-confirmation/index.ts`
Zamieniam embed PostgREST na trzy oddzielne, ręczne zapytania (bez polegania na FK / schema cache):
- `event_form_submissions` po `id` (bez joinów)
- `event_registration_forms` po `submission.form_id`
- `paid_events` po `submission.event_id`

To pełna kompatybilność z aktualnym schema (brak FK) i odporne na zmiany w cache.
Po zapisie redeploy edge function automatycznie zachodzi.

### 2. Ponowna wysyłka emaila do Jana
Po naprawie funkcji wywołuję ją ręcznie dla submission `64aed010-5584-4601-8ef3-c8fde6f0cc74`, żeby gość dostał potwierdzenie. Status `email_status` zaktualizuje się do `sent`.

### 3. Wyjaśnienie sytuacji „brak gościa w Twoich kontaktach"
Gość nie wszedł przez Twój link partnerski (URL zawierał slug formularza, ale bez `?ref=<twój-ref-code>`), więc system nie ma jak go do Ciebie przypisać. Aby kontakty wpadały do Pure-Kontakty → „Z zaproszeń na Eventy", musisz wysyłać gościom dokładnie ten link, który widzisz w „Moje linki partnerskie" na stronie eventu (zawiera `?ref=...`). Jako admin nadal widzisz wszystkich zarejestrowanych w panelu admina (Eventy → Formularze → lista zgłoszeń).

Opcjonalnie (do potwierdzenia, jeśli chcesz): mogę dodać w panelu admina opcję „przypisz tę rejestrację do partnera" — administrator wybiera partnera z listy, a system tworzy mu kontakt w CRM. Daj znać, czy chcesz tę opcję dodać teraz.

## Pliki

**Edytowane (1):**
- `supabase/functions/send-event-form-confirmation/index.ts` — odporne na brak FK, trzy oddzielne SELECT-y zamiast embedu.

**Akcja runtime (1):**
- Wywołanie `send-event-form-confirmation` dla submission Jana po deployu, aby email dotarł.

Brak migracji DB.