
Cel: wymusić ręczne wpisanie adresu email i potwierdzenia email (bez autouzupełniania), z etykietą „Potwierdź email” pod polem Email.

1) Diagnoza (na podstawie kodu + screenshotów)
- Pole pod Email już istnieje, ale etykieta potrafi pokazać zły tekst przez kolizję kluczy tłumaczeń (`auth.confirmEmail` trafia na `error.confirmEmail`).
- `autoComplete="off"` samo w sobie nie wystarcza — przeglądarka nadal może podpowiadać/wypełniać pola.

2) Plan zmian (implementacja)
- Plik: `src/pages/Auth.tsx`
  - Ustawić stałą, jednoznaczną etykietę pola pod emailem: „Potwierdź email” (bez kolizji i18n).
  - Wzmocnić blokadę autouzupełniania dla obu pól (`email` i `confirm-email`):
    - `form autoComplete="off"`
    - dla obu inputów: niestandardowe `name`, `autoComplete="new-password"` (lub równoważny anty-autofill), `autoCapitalize="none"`, `spellCheck={false}`
    - zablokować `onPaste` i `onDrop` (wymuszenie ręcznego wpisania)
  - Dodać „manual-entry guard”:
    - śledzić, czy użytkownik faktycznie pisał z klawiatury w `email` i `confirmEmail`
    - przy submit blokować rejestrację, jeśli któreś pole nie było wpisane ręcznie
  - Utrzymać walidację obowiązkowości i zgodności (`email === confirmEmail` po trim/lowercase) oraz jasny komunikat błędu.

3) Spójność we wszystkich formularzach rejestracyjnych
- Plik: `src/pages/EventGuestRegistration.tsx`
  - Zastosować ten sam anty-autofill i manual-entry guard dla `email` + `confirm_email`, aby zachowanie było identyczne w każdym formularzu rejestracji.

4) Techniczne szczegóły (krótko)
- Nie ruszam globalnej logiki i18n w `useTranslations` (to mogłoby naruszyć inne ekrany).
- Naprawa etykiety będzie lokalna i deterministyczna (bez ryzyka kolizji kluczy).
- Manual-entry guard daje twarde wymuszenie: nawet jeśli przeglądarka coś podstawi, submit nie przejdzie bez ręcznego wpisania.

5) Kryteria akceptacji
- Pod polem Email widoczna etykieta: „Potwierdź email”.
- Przeglądarka nie wypełnia automatycznie pola potwierdzenia.
- Rejestracja nie przechodzi, jeśli email/confirm-email nie zostały wpisane ręcznie lub są różne.
- To samo zachowanie działa w formularzu rejestracji na wydarzenie.
