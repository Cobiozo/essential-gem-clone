## Problem

Obecnie funkcja `submit_event_form` dodaje **każdego** zapisanego na event do CRM partnera — w tym samego partnera (gdy zapisuje się przez własny link, np. testowo lub jako uczestnik), a także innych zalogowanych użytkowników platformy. Sebastian widzi sam siebie w „Z zaproszeń na eventy" (zrzut), co nie ma sensu — zakładka ma zawierać wyłącznie **gości niezalogowanych**.

## Rozwiązanie

### Migracja SQL — `submit_event_form`

Przed wstawieniem wiersza do `team_contacts` sprawdzamy, czy podany e-mail należy do zalogowanego użytkownika platformy:

```sql
SELECT EXISTS (
  SELECT 1 FROM public.profiles WHERE lower(email) = _normalized_email
  UNION ALL
  SELECT 1 FROM auth.users WHERE lower(email) = _normalized_email
) INTO _is_platform_user;

IF NOT _is_platform_user THEN
  -- INSERT do team_contacts
END IF;
```

- Sprawdzenie obejmuje zarówno `public.profiles.email` (źródło prawdy w UI), jak i `auth.users.email` (gwarancja, że nawet konta bez profilu są wykluczone).
- Cała reszta logiki (resolve `ref_code`, `submission_count++`, `event_form_submissions` insert, zwracany `confirmation_token`, log błędów CRM) — **bez zmian**. Sama submission rejestracyjna nadal jest zapisywana — tylko CRM partnera nie dostaje wpisu.

### Czyszczenie historyczne

Jednorazowo: wszystkie istniejące wpisy w `team_contacts` z `contact_source LIKE 'event_invite%'`, których e-mail należy do zalogowanego użytkownika platformy, oznaczamy jako usunięte (`deleted_at = now()`). Dzięki temu:
- Sebastian Snopek (`sebastiansnopek.eqology@gmail.com`) zniknie z własnej zakładki „Z zaproszeń na eventy".
- Janeusz (gość niezalogowany, `tatanabacznosci@gmail.com`) zostaje.
- Soft-delete pozwala przywrócić wpisy w razie potrzeby przez 30 dni.

## Pliki

- nowa migracja SQL — redefinicja `public.submit_event_form` + jednorazowy `UPDATE … SET deleted_at = now()` dla istniejących błędnych wpisów

## Efekt

- Zapisy na event przez partnerów (zalogowani użytkownicy platformy) i innych użytkowników platformy nie zaśmiecają już CRM — nie pojawiają się w zakładce „Z zaproszeń na eventy".
- Goście niezalogowani (np. Janeusz) nadal trafiają do zakładki jako osobne wpisy na każde wydarzenie.
- Frontend bez zmian — istniejący filtr `event_invite*` działa poprawnie po wyczyszczeniu danych.
