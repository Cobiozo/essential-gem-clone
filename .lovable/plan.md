## Zmiana

W komponencie `src/components/paid-events/MyEventFormReferrals.tsx` (lista zapisanych przez link partnerski w panelu partnera):

1. **Pokazywać pełne dane** zapisanych zamiast maskowanych:
   - `Email`: pełny adres zamiast `by•••••@wp.pl`
   - `Telefon`: pełny numer zamiast `••• ••• 444`
2. **Usunąć adnotację** „Dane osobowe są częściowo zamaskowane. Pełen rejestr widzi administrator." pod tabelką.
3. Usunąć nieużywane funkcje `maskEmail` i `maskPhone` oraz zaktualizować komentarz nagłówka pliku (już nie ma maskowania).

## Bezpieczeństwo

Zmiana jest świadoma i bezpieczna — polityka RLS na tabeli `event_form_submissions` (`partner_user_id = auth.uid()`) już teraz gwarantuje, że partner widzi wyłącznie własnych poleconych. Maskowanie było tylko warstwą wizualną; jego usunięcie nie zmienia kręgu osób mających dostęp do tych danych.

## Plik

- `src/components/paid-events/MyEventFormReferrals.tsx`