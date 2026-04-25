## Cel

Dodać pod-widok **Statystyki partnerów** dla każdego formularza w zakładce **Eventy → Formularze**. Statystyki są osobne dla każdego wydarzenia/formularza.

## Lokalizacja

W `EventFormsList.tsx` w wierszu każdego formularza obok przycisku „Zgłoszenia" pojawi się drugi przycisk **„Statystyki partnerów"**. Kliknięcie otwiera nowy komponent `EventFormPartnerStats` (analogicznie do obecnego `EventFormSubmissions`) z przyciskiem **← Powrót** do listy formularzy.

## Co zobaczy admin

### Nagłówek
- Tytuł: „Statystyki partnerów: {nazwa formularza}"
- Podtytuł: nazwa wydarzenia + liczba aktywnych partnerów

### 4 karty zbiorcze (na górze)
- **Kliknięcia ref linku** (suma `paid_event_partner_links.click_count` dla tego `form_id`)
- **Rejestracje gości** (liczba `event_form_submissions` dla `form_id`, dowolny status)
- **Opłacone** (liczba zgłoszeń z `payment_status = 'paid'`)
- **Anulowane** (liczba zgłoszeń ze `status = 'cancelled'` lub `payment_status = 'cancelled'`)

### 🏆 Podium TOP 3
Trzy duże karty obok siebie (🥇 🥈 🥉) z:
- avatar / inicjały + Imię Nazwisko
- EQID
- liczba opłaconych zgłoszeń (główna metryka rankingu)
- pod spodem mini-statystyki: kliknięcia · rejestracje · konwersja %

### Pełna tabela rankingu
Wszyscy partnerzy z aktywnym ref linkiem dla tego formularza **lub** z co najmniej jednym zgłoszeniem przypisanym do nich. Kolumny:

| # | Partner (Imię Nazwisko + EQID) | Kliknięcia | Rejestracje | Opłacone | Anulowane | Konwersja klik→rej | Konwersja rej→opł |

- Sortowanie po każdej kolumnie (klik nagłówka), domyślnie po **Opłaconych** malejąco.
- Pierwsze trzy wiersze podświetlone medalami 🥇🥈🥉.
- Wyszukiwarka po imieniu/EQID (dla dużych eventów).

### Eksport CSV
Przycisk **„Eksport CSV"** (jak w `EventFormSubmissions`) — pobiera całą tabelę rankingu z bieżącymi sortami/filtrem.

## Logika danych (źródła)

Wszystko pobierane z istniejących tabel — bez nowych migracji:

1. **`paid_event_partner_links`** filtr `form_id` → źródło `click_count` per partner + lista wszystkich aktywnych partnerów dla formularza.
2. **`event_form_submissions`** filtr `form_id` → grupowanie po `partner_user_id` dla rejestracji/opłaconych/anulowanych.
3. **`profiles`** join po `user_id` → `first_name`, `last_name`, `eq_id`, `avatar_url`.

Agregacja po stronie klienta (małe wolumeny per event, wzorzec jak w istniejącym `AutoWebinarPartnerStats.tsx`).

Zgłoszenia bez przypisanego partnera (`partner_user_id IS NULL`) liczone tylko w kartach zbiorczych, nie w rankingu (oddzielny wiersz „Bez partnera" w stopce tabeli z licznikami, dla pełnej transparencji).

## Pliki do utworzenia / edycji

**Nowy plik:**
- `src/components/admin/paid-events/event-forms/EventFormPartnerStats.tsx` — cały widok (karty zbiorcze, podium, tabela, eksport CSV).

**Edytowane pliki:**
- `src/components/admin/paid-events/event-forms/EventFormsList.tsx` — dodanie przycisku „Statystyki partnerów" w wierszu tabeli + stan `viewStatsFor` przełączający na `EventFormPartnerStats` (analogicznie do `viewSubmissionsFor`).

## Bez zmian w bazie

Nie potrzeba nowych tabel ani migracji — `paid_event_partner_links.click_count` i `event_form_submissions.partner_user_id` już istnieją i są wypełniane (przez `increment_partner_link_click` RPC oraz przy zapisie zgłoszenia).
