

# Plan: 3 poprawki — blokada rejestracji, logo, powiadomienia

## 1. Blokada rejestracji gości dla zarejestrowanych użytkowników

**Problem**: Zarejestrowany partner może się zapisać na wydarzenie przez formularz gościa, co tworzy duplikaty.

**Rozwiązanie**: W `EventGuestRegistration.tsx`, przed wywołaniem RPC `register_event_guest`, dodać sprawdzenie czy email istnieje w tabeli `profiles`. Jeśli tak — wyświetlić komunikat blokujący zamiast kontynuować rejestrację.

Plik: `src/pages/EventGuestRegistration.tsx`
- W `onSubmit()`: przed `supabase.rpc('register_event_guest', ...)` dodać query: `supabase.from('profiles').select('user_id').eq('email', data.email).maybeSingle()`
- Jeśli profil istnieje — ustawić nowy stan `existingUserBlocked = true` i przerwać
- Renderować ekran z komunikatem: *"Użytkownik o takim adresie e-mail istnieje w bazie użytkowników zarejestrowanych na platformie. Skorzystaj z dołączenia do wydarzenia poprzez swoje konto na Pure Life Center."*

## 2. Logo widoczne w całości (object-contain zamiast object-cover)

**Problem**: Logo jest przycinane (`object-cover` + stałe `h-10 w-10`), co obcina części obrazu. Admin chce pełne logo.

**Rozwiązanie**: Zmienić klasy CSS logo z `h-10 w-10 rounded-lg object-cover` na `h-10 object-contain` (bez stałej szerokości — logo dopasowuje się proporcjonalnie). Analogicznie w podglądzie admina i na ekranach informacyjnych.

Pliki:
- `src/components/auto-webinar/AutoWebinarEmbed.tsx` — wszystkie instancje logo (nagłówek, ekrany waiting/expired/ended): `object-cover` → `object-contain`, usunąć stałą szerokość `w-10`/`w-12`
- `src/components/admin/AutoWebinarManagement.tsx` — podgląd pokoju: analogicznie

## 3. Powiadomienia partnerów — brak resetowania flag przypomnień

**Problem**: Dla cyklicznych wydarzeń (np. "Prezentacja możliwości biznesowych" co tydzień), flagi `reminder_sent`, `reminder_12h_sent` itd. w `event_registrations` są ustawiane na `true` po pierwszym wystąpieniu i **nigdy nie są resetowane**. W efekcie system uznaje, że przypomnienia już wysłano, i nie wysyła ich na kolejne tygodnie.

**Dowód**: Użytkownik `ivamaj@wp.pl` ma rejestrację na event `58aac028` (Prezentacja, 25.03 18:00) ze wszystkimi flagami `true`, ale ostatnie maile przypomnieniowe dot. tego eventu datowane są na 17-18.03 — oznacza to, że flagi zostały ustawione tydzień temu i nie zresetowano ich.

**Rozwiązanie**: Dodać mechanizm resetowania flag przypomnień dla wydarzeń cyklicznych. Dwa podejścia do rozważenia:

**Opcja A** (rekomendowana): Dodać do `process-pending-notifications` krok 0, który dla wydarzeń cyklicznych (webinar) resetuje flagi przypomnień w `event_registrations` i `guest_event_registrations`, gdy `start_time` eventu zmienił się (lub minął) od ostatniego cyklu.

**Opcja B**: Zamiast sprawdzać flagę `reminder_sent = false`, sprawdzać czy `reminder_sent_at` jest w oknie czasowym bieżącego `start_time` eventu (np. `reminder_sent_at < start_time - 25h`).

### Szczegóły techniczne Opcji A
W `process-pending-notifications/index.ts`, przed krokiem 5 (bulk reminders):
- Pobrać wydarzenia typu `webinar` z `start_time` w przyszłości
- Dla każdego: sprawdzić czy istnieją rejestracje z flagami `true` ale `reminder_sent_at < event.start_time - 25h` (stare flagi)
- Jeśli tak: zresetować flagi na `false` w obu tabelach (`event_registrations`, `guest_event_registrations`)

Alternatywnie, w `send-bulk-webinar-reminders/index.ts` zmienić warunek pobierania z `.eq(config.userFlagColumn, false)` na bardziej inteligentny: `.or(`${config.userFlagColumn}.eq.false,${config.userFlagAtColumn}.lt.${resetThreshold}`)` — gdzie `resetThreshold` to `event.start_time - 25h`.

### Pliki do edycji
| Plik | Zmiana |
|---|---|
| `src/pages/EventGuestRegistration.tsx` | Sprawdzenie profilu przed rejestracją + komunikat blokujący |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | `object-cover` → `object-contain`, usunąć stałą szerokość |
| `src/components/admin/AutoWebinarManagement.tsx` | Podgląd logo: `object-contain` |
| `supabase/functions/send-bulk-webinar-reminders/index.ts` | Uwzględnienie starych flag (reset/inteligentny warunek) |

