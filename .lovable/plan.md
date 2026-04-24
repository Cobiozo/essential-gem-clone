## Problem

Formularze rejestracyjne tworzone w zakładce **Eventy → Formularze** powinny dotyczyć wydarzeń z zakładki **Eventy → Wydarzenia** (TEST, Kompleksowe szkolenie itd. — tabela `paid_events`), a nie wydarzeń online/webinarów (tabela `events`). 

Aktualnie:
- Wszystkie 3 nowe tabele (`event_registration_forms`, `event_form_submissions`, `paid_event_partner_links`) mają `event_id` z FK do `events`
- `EventFormEditor` zaciąga listę z `events`
- Lista we Form Editor pokazuje webinary online — niezgodnie z intencją

## Rozwiązanie

### Krok 1 — Migracja DB (przepięcie FK na `paid_events`)

Ponieważ tabele są nowe i puste (formularze nie były jeszcze tworzone), bezpiecznie:

```sql
-- Drop existing FKs and recreate to paid_events
ALTER TABLE public.event_registration_forms 
  DROP CONSTRAINT event_registration_forms_event_id_fkey,
  ADD CONSTRAINT event_registration_forms_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES public.paid_events(id) ON DELETE CASCADE;

ALTER TABLE public.event_form_submissions 
  DROP CONSTRAINT event_form_submissions_event_id_fkey,
  ADD CONSTRAINT event_form_submissions_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES public.paid_events(id) ON DELETE CASCADE;

ALTER TABLE public.paid_event_partner_links 
  DROP CONSTRAINT paid_event_partner_links_event_id_fkey,
  ADD CONSTRAINT paid_event_partner_links_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES public.paid_events(id) ON DELETE CASCADE;
```

(Funkcje RPC nie wymagają zmian — operują tylko na własnych kolumnach `event_id`, niezależnie od FK.)

### Krok 2 — Zmiana selektu wydarzenia w `EventFormEditor.tsx`

Zamienić query:
- `from('events').select('id, title, start_time')` 
- → `from('paid_events').select('id, title, event_date, location').eq('status','published')`

Wyświetlanie w opcji: `{ev.title} — {ev.location} ({data})`. Sortowanie po `event_date` malejąco.

### Krok 3 — Spójność w pozostałych miejscach

Sprawdzić i ewentualnie zaktualizować odwołania do `event_id` w:
- `src/pages/EventRegistrationBySlug.tsx` (publiczna strona formularza) — pobiera dane wydarzenia → musi czytać z `paid_events`
- `EventFormSubmissions.tsx` — kolumna „Wydarzenie" w eksporcie/UI
- Edge function `send-event-form-confirmation` — jeśli czyta nazwę wydarzenia, źródłem ma być `paid_events`
- Komponent linku partnera w `/paid-events` (dashboard) — odwołania do paid_events.id (już docelowo właściwe)

### Krok 4 — Kontynuacja pozostałych etapów planu (z poprzedniej iteracji)

Po naprawie powyższego, dokończyć:
1. **Strony publiczne**: `/event-form/:slug`, `/event-form/confirm/:token`, `/event-form/cancel/:token` (wykorzystując `paid_events` do wyświetlenia daty/lokalizacji wydarzenia)
2. **Linki partnera**: przycisk „Mój link partnera" w dashboard `/paid-events` przy każdym formularzu
3. **CRM**: zapisywanie zgłoszeń przez link partnera do `team_contacts` ze źródłem `event_invite` (tag z nazwą wydarzenia z `paid_events`)
4. **Memory**: zapisanie reguły w `mem://features/admin/event-forms-governance` — formularze rejestracyjne **zawsze** odnoszą się do `paid_events` (Eventy), nigdy do tabeli `events` (online/webinary)

## Zakres techniczny (krótko)

- 1 migracja SQL (3× ALTER FK)
- 1 zmiana w `EventFormEditor.tsx` (query + opcje selecta)
- Drobne uściślenia w `EventRegistrationBySlug.tsx`, `EventFormSubmissions.tsx`, edge function `send-event-form-confirmation`
- Realizacja pozostałych kroków planu z poprzedniej iteracji (publiczne strony, linki partnerskie, CRM, memory)

Po Twojej akceptacji uruchamiam migrację (wymaga osobnego zatwierdzenia) i kontynuuję realizację.