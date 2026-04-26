## Problem

W zakładce **Eventy → Formularze → Zgłoszenia → Partnerzy** kolumna „Partner zapraszający" pokazuje partnera przypisanego przez ref-link (lub przycisk „Przypisz", jeśli linku nie było). Dla zgłoszeń od partnerów to nie ma sensu — partner sam siebie zaprasza i powinien widnieć tam jego **bezpośredni upline (opiekun)**.

## Rozwiązanie

W `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx`:

1. **Zamiast pobierać tylko zbiór emaili zarejestrowanych** (obecnie `registeredEmailsSet`), pobrać dla każdego zgłoszenia profil osoby zgłaszającej z polami `user_id, email, upline_eq_id, upline_first_name, upline_last_name`. Trzymać mapę `email → profile` (`submitterProfilesByEmail`). Klucze tej mapy zastępują `registeredEmails` — funkcja `isPartnerSubmission` działa bez zmian.

2. **Doliczyć drugie zapytanie**: pobrać profile po `eq_id IN (lista upline_eq_id)` i zbudować mapę `eq_id → uplineProfile` (`uplineByEqId`), żeby uzyskać aktualne `first_name`, `last_name`, `email` opiekuna.

3. **Dodać helper `getInvitingPartner(s)`**:
   - Jeśli `isPartnerSubmission(s)` → zwróć `uplineByEqId[submitter.upline_eq_id]` (lub fallback na `upline_first_name/last_name` zapisane w profilu zgłaszającego, jeśli profil opiekuna nie istnieje w bazie).
   - W przeciwnym razie (gość) → zachowaj obecne zachowanie: `partnersMap[s.partner_user_id]`.

4. **Render kolumny „Partner zapraszający"**: zastąpić `const partner = s.partner_user_id ? partnersMap[s.partner_user_id] : null` wywołaniem `const partner = getInvitingPartner(s)`. Dodatkowo:
   - Dla wierszy partnerskich (`isPartnerSubmission(s) === true`) **ukryć przyciski „Zmień" / „Przypisz"** — upline wynika z profilu i nie powinien być ręcznie nadpisywany w kontekście wydarzenia. Dla gości pozostają bez zmian.
   - Jeśli partner nie ma uplinu w profilu, wyświetlić neutralną etykietę „— brak uplinu —" (zamiast przycisku „Przypisz"), żeby admin wiedział, że trzeba uzupełnić profil partnera.

5. **Eksport Excel**: w funkcji `exportXlsx` użyć tego samego `getInvitingPartner(s)` przy wypełnianiu kolumny „Partner zapraszający" — w eksporcie partnera widnieje jego upline, a u gości partner ref-linku.

## Pliki

- `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx`
  - Refactor zapytań (`registeredEmailsSet` → `submitterProfilesByEmail` + `uplineByEqId`).
  - Nowy helper `getInvitingPartner(s)`.
  - Aktualizacja renderu kolumny i logiki eksportu.

## Efekt

W zakładce „Partnerzy" w kolumnie „Partner zapraszający" widnieje opiekun (bezpośredni upline) partnera — z imieniem, nazwiskiem i emailem. W zakładce „Goście" nic się nie zmienia: nadal widnieje partner przypisany przez link / ręcznie. Eksport Excel zachowuje tę samą logikę.