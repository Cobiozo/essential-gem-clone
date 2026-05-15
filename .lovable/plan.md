Plan naprawy:

1. **Panel „Twoje bilety na to wydarzenie” ma być widoczny na tej samej karcie wydarzenia, obok/nad sekcją linku partnerskiego**
   - Na `/paid-events` karta wydarzenia będzie najpierw pokazywać panel własnych biletów zalogowanego użytkownika.
   - Dopiero osobno będzie pokazany panel „Twój link partnerski…” oraz „Pokaż zapisanych przez mój link”.

2. **Nie mieszać kupującego z osobami z linku partnerskiego**
   - Lista „Pokaż zapisanych przez mój link” będzie filtrować tylko prawdziwe polecenia.
   - Jeśli wpis w `event_form_submissions` należy do tego samego zalogowanego użytkownika/kupującego, nie będzie widoczny jako „zapisany przez mój link”.
   - Taki użytkownik ma być widoczny tylko w „Twoje bilety na to wydarzenie”.

3. **Panel biletów ma pokazywać wszystkie miejsca z zamówienia**
   - Dla zamówienia z ilością `2` pokaże dwa rekordy uczestników: kupujący + gość.
   - Zachowam możliwość edycji danych gościa.
   - Status `awaiting_transfer` dalej będzie pokazywany jako „Oczekuje płatności”, a nie ukrywany.

4. **Usunąć mylący globalny blok „Moje bilety” z góry listy, jeśli dubluje widok**
   - Na stronie `/paid-events` bilety mają być kontekstowo przy konkretnym wydarzeniu, nie jako osobna lista nad wydarzeniami.
   - To odpowiada temu, czego oczekujesz na zrzucie: przy konkretnym evencie widzisz własne bilety oraz osobno zapisy z linku.

Technicznie zmienię:
- `src/components/paid-events/MyEventTicketsInline.tsx` — dopracowanie widoczności i statusów, ewentualnie fallback po e-mailu, jeśli RLS/user_id nie zwróci zamówienia.
- `src/components/paid-events/MyEventFormReferrals.tsx` — odfiltrowanie własnej rejestracji/kupującego z listy poleconych.
- `src/components/paid-events/MyEventFormLinks.tsx` — licznik „zapisanych” ma liczyć po tym samym filtrze, żeby nie pokazywał Ciebie jako poleconego.
- `src/pages/PaidEventsListPage.tsx` — zostawić bilety przy karcie wydarzenia i usunąć/nie renderować dublującego blok „Moje bilety” nad listą.