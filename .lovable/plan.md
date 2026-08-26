# Linki zapraszające na wydarzenia płatne — diagnoza i naprawa

## Co sprawdziłem

- Agnieszka Cembrowska ma rolę **partner**, konto aktywne, uzupełnione EQID (`121252502`).
- Nie ma żadnego wiersza w tabeli linków partnerskich — nigdy nie udało jej się wygenerować linku.
- Uprawnienia bazy (RLS) są poprawne: każdy zalogowany może utworzyć własny link.

## Dlaczego nie ma możliwości wygenerowania linku

To **nie jest problem tego jednego użytkownika** — dotyczy wszystkich partnerów. Złożyły się na to trzy rzeczy:

1. **Generator linku istnieje tylko na liście wydarzeń** (`/paid-events`), a nie na stronie samego wydarzenia (tej ze zrzutu). Na stronie wydarzenia nie ma żadnego przycisku „wygeneruj link”.
2. **Panel linku pokazuje się tylko dla wydarzeń z AKTYWNYM formularzem rejestracji.** Z 6 wydarzeń tylko jedno (BOM Łódź) ma aktywny formularz — dla Krakowa i pozostałych formularze są wyłączone, więc partner nigdzie nie zobaczy opcji generowania linku.
3. **Błąd w kodzie strony wydarzenia:** automatyczne pobranie/utworzenie kodu ref szuka profilu po kolumnie `id` zamiast `user_id`. W bazie 268 z 273 profili ma inne `id` niż `user_id`, więc dla praktycznie wszystkich użytkowników ten mechanizm zwraca pusto — link ref nigdy nie doklei się do CTA i nie tworzy się automatycznie.

## Co zrobię

1. **Naprawa błędu profilu** — zapytanie o EQID na stronie wydarzenia będzie używać `user_id` (jak w pozostałych miejscach aplikacji). Dzięki temu kod ref partnera tworzy się automatycznie i doklei się do przycisku rejestracji.
2. **Sekcja „Twój link zapraszający” na stronie wydarzenia** — dodam ten sam panel, który jest na liście wydarzeń (kopiowanie linku, licznik kliknięć i zapisanych), widoczny dla partnera/admina/gościa PLC.
3. **Fallback, gdy wydarzenie nie ma aktywnego formularza rejestracji** — zamiast ukrywać wszystko, partner dostanie link zapraszający do strony wydarzenia z własnym kodem ref (`/e/<slug>?ref=EQID`), z tym samym przyciskiem kopiowania.
4. **Czytelny komunikat zamiast pustki** — jeśli partner nie ma EQID w profilu, pokażę informację „Uzupełnij EQID w profilu, aby wygenerować link” zamiast braku sekcji.

## Szczegóły techniczne

- `src/pages/PaidEventPage.tsx`: poprawka `profiles.eq('id', user.id)` → `eq('user_id', user.id)` w zapytaniu `my-ref-code-for-form`; osadzenie `<MyEventFormLinks eventId={event.id} compact />` w widoku wydarzenia.
- `src/components/paid-events/MyEventFormLinks.tsx`: gdy brak aktywnego formularza dla `eventId`, renderowanie wariantu „link do strony wydarzenia z ref”; zamiast `return null` przy braku EQID — komunikat pomocniczy.
- Bez zmian w bazie danych; istniejące polityki RLS i unikalność `(partner_user_id, form_id)` wystarczają.

## Uwaga do treści

Formularze rejestracji dla Krakowa i Łodzi (stary) są wyłączone (`is_active = false`). Jeśli mają zbierać zapisy, trzeba je włączyć w panelu admina — samo poprawienie kodu tego nie zmieni.
