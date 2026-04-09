
# Fix: Zalogowani użytkownicy nie dostają przypomnień o wydarzeniach

## Diagnoza (potwierdzona danymi produkcyjnymi)

**Przyczyna**: W pliku `send-bulk-webinar-reminders/index.ts` (linia 443), zapytanie do tabeli `event_registrations` wybiera kolumnę `created_at`, która **nie istnieje** w tej tabeli. Kolumna nazywa się `registered_at`.

```
.select("id, user_id, occurrence_index, occurrence_date, occurrence_time, created_at")
                                                                           ^^^^^^^^^^
                                                                     nie istnieje!
```

Skutek: Supabase zwraca błąd, `userRegs` = `null`, system kontynuuje z pustą listą użytkowników. Goście działają poprawnie (tabela `guest_event_registrations` MA kolumnę `created_at`).

**Dowody z produkcji**:
- TEAM MEETING (8 kwietnia, 70 zarejestrowanych użytkowników) — ZERO przypomnień wysłanych
- BOM-English (8 kwietnia, 0 użytkowników, 4 gości) — goście dostali 3 przypomnienia (2h, 1h, 15min), `users: 0`
- Wzorzec powtarza się dla WSZYSTKICH wydarzeń — `users: 0` we wszystkich logach

## Plan naprawy

### 1. Naprawa `send-bulk-webinar-reminders/index.ts`
- Linia 443: zmienić `created_at` → `registered_at` w `.select(...)`
- Linia 481: zmienić filtr stale registrations z `r.created_at` → `r.registered_at`

### 2. Treść przypomnień dla spotkań zespołowych
- Dla eventów typu `team_training` — w treści maila dodać informację: "Wejście na to spotkanie odbywa się przez Twoje konto na Platformie Pure Life Center" z linkiem do platformy (zamiast/obok linku Zoom)
- Zmodyfikować `buildFallbackBody` i zmienne szablonu tak, aby dla `team_training` dołączyć link do platformy (`https://purelife.lovable.app/events`)

### 3. Walidacja — brak ryzyka niekontrolowanej wysyłki
- Zmiana dotyczy wyłącznie naprawy istniejącego, działającego (ale zepsutego) kodu
- Deduplikacja przez `occurrence_reminders_sent` jest już aktywna — żaden użytkownik nie dostanie duplikatu
- Przypomnienia wysyłane tylko w odpowiednich oknach czasowych (2h, 1h, 15min przed wydarzeniem)

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/functions/send-bulk-webinar-reminders/index.ts` | `created_at` → `registered_at` (2 miejsca) + info o logowaniu dla team_training |

## Efekt
- Zarejestrowani użytkownicy zaczną otrzymywać przypomnienia 2h, 1h i 15min przed spotkaniami
- Przypomnienia o spotkaniach zespołowych będą zawierać informację o wejściu przez platformę
