## Diagnoza

W bazie dla Jana Testującego (`byk1023@wp.pl`) widać:
- `email_status = 'sent'` (mail z linkiem został wysłany 24.04.2026 18:38)
- `email_confirmed_at = NULL` (system nie odnotował kliknięcia w link potwierdzający)

Link w mailu prowadzi do `/event-form/confirm/:token`. Strona React po załadowaniu wywołuje Edge Function `confirm-event-form-email` przez `supabase.functions.invoke(...)`. Funkcja powinna wywołać RPC `confirm_event_form_email`, który ustawia `email_confirmed_at = now()` i wstawia powiadomienia adminom + partnerowi.

**Przyczyna:** W `supabase/config.toml` BRAKUJE wpisu z `verify_jwt = false` dla funkcji obsługujących publiczne linki w mailach:
- `confirm-event-form-email` — kliknięcie linku potwierdzającego
- `cancel-event-form-submission` — kliknięcie linku anulującego
- `send-event-form-confirmation` — wysyłka maila z publicznego formularza

Bez tego wpisu Supabase domyślnie wymaga ważnego JWT zalogowanego użytkownika. Gość (Jan), który klika link w mailu, jest niezalogowany — request `supabase.functions.invoke` jest wtedy odrzucany przez bramkę Supabase **zanim w ogóle wejdzie w kod funkcji**, dlatego:
- nie ma żadnych logów Edge Function dla tych wywołań
- RPC nie jest wywoływane → `email_confirmed_at` zostaje NULL
- admin nie widzi potwierdzenia w panelu

Frontend rzuca błąd, ale strona `EventFormConfirmPage.tsx` może go pokazywać jako jakieś niejasne „wystąpił błąd techniczny" (i Jan/admin tego nie zauważyli).

## Naprawa

### 1. `supabase/config.toml` — odblokować funkcje publicznych linków

Dodać 3 brakujące wpisy:

```
[functions.confirm-event-form-email]
verify_jwt = false

[functions.cancel-event-form-submission]
verify_jwt = false

[functions.send-event-form-confirmation]
verify_jwt = false
```

(Pozostałe funkcje obsługujące publiczne linki, np. `verify-event-ticket`, `payu-create-order`, mają już `verify_jwt = false` — to jest spójne z resztą konfiguracji.)

### 2. Ręczne potwierdzenie rejestracji Jana

Aby admin natychmiast zobaczył potwierdzenie tej konkretnej rejestracji (skoro Jan rzeczywiście kliknął link, ale nie zadziałało nie z jego winy), uruchomić jednorazową migrację, która wywoła istniejący RPC `confirm_event_form_email` z aktualnym tokenem Jana — lub bezpośrednio: 

```sql
UPDATE public.event_form_submissions
SET email_confirmed_at = now()
WHERE id = '64aed010-5584-4601-8ef3-c8fde6f0cc74'
  AND email_confirmed_at IS NULL;
```

Powiadomienia (admin + partner) i wpis CRM dla tego konkretnego zgłoszenia trzeba zrobić jednym INSERT-em do `user_notifications` w tej samej migracji, żeby nie zostały pominięte (logika z `confirm-event-form-email/index.ts` jest poza SQL-em, więc samo `UPDATE` jej nie odpali). Migracja:

```sql
-- 1) potwierdź rejestrację
UPDATE public.event_form_submissions
SET email_confirmed_at = now()
WHERE id = '64aed010-5584-4601-8ef3-c8fde6f0cc74'
  AND email_confirmed_at IS NULL;

-- 2) powiadom adminów
INSERT INTO public.user_notifications (user_id, notification_type, source_module, title, message, link, metadata)
SELECT ur.user_id,
       'event_form_confirmed',
       'paid_events',
       'Gość potwierdził e-mail rejestracji',
       'Jan Testujący (byk1023@wp.pl) potwierdził rejestrację (uzupełnione ręcznie po naprawie błędu konfiguracji).',
       '/admin?tab=paid-events',
       jsonb_build_object('submission_id','64aed010-5584-4601-8ef3-c8fde6f0cc74')
FROM public.user_roles ur
WHERE ur.role = 'admin';

-- 3) powiadom partnera (jeśli istnieje)
INSERT INTO public.user_notifications (user_id, notification_type, source_module, title, message, link, metadata)
SELECT s.partner_user_id,
       'event_form_confirmed',
       'paid_events',
       'Twój gość potwierdził rejestrację',
       'Jan Testujący (byk1023@wp.pl) potwierdził rejestrację.',
       '/dashboard?tab=contacts',
       jsonb_build_object('submission_id', s.id)
FROM public.event_form_submissions s
WHERE s.id = '64aed010-5584-4601-8ef3-c8fde6f0cc74'
  AND s.partner_user_id IS NOT NULL;
```

### 3. (opcjonalnie, ale polecam) Lepsza obsługa błędu w `EventFormConfirmPage.tsx`

Gdy `supabase.functions.invoke` rzuci błąd 401/non-2xx, na ekranie pojawia się ogólny komunikat. Doprecyzować, by pokazywał krótkie „Spróbuj ponownie odświeżając stronę. Jeśli problem się powtarza, skontaktuj się z organizatorem." — to nie zmienia logiki, ale gość przynajmniej wie, że potwierdzenie nie przeszło.

## Pliki edytowane

- `supabase/config.toml` — dodanie 3 wpisów `verify_jwt = false`
- nowa migracja SQL — naprawa stanu rejestracji Jana + powiadomienia
- (opcjonalnie) `src/pages/EventFormConfirmPage.tsx` — czytelniejszy komunikat błędu

## Efekt

- Po deploy'u kliknięcie linku potwierdzającego w mailu przez **niezalogowanego** gościa będzie poprawnie wywoływać Edge Function, RPC ustawi `email_confirmed_at`, admin zobaczy zmianę w `EventFormSubmissions` i otrzyma powiadomienie. To samo dla linku anulowania.
- Stan rejestracji Jana zostanie naprawiony jednorazową migracją, więc admin od razu zobaczy „potwierdzono" w panelu i dostanie zaległe powiadomienie.
