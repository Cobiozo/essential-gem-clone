
Tak — użytkownik może to naprawić, ale w obecnym stanie jest jedna luka UX.

## Co użytkownik ma zrobić teraz (runbook)
1. Na ekranie MFA kliknąć **„Nie mam dostępu do Authenticatora”**.
2. Wybrać **„Resetuj Authenticator przez Email”**.
3. Kliknąć **„Wyślij kod na email”**, wpisać kod, potem **„Zweryfikuj i resetuj”**.
4. Po komunikacie sukcesu kliknąć **„Skonfiguruj nowy Authenticator”** i zeskanować nowy QR.
5. Jeśli email nie dochodzi lub reset się nie powiedzie: użyć **„Zgłoś problem do Support”**.

## Zidentyfikowana luka
W `MFAChallenge` są opcje awaryjne, ale gdy użytkownik trafi bezpośrednio do `TOTPSetup` i enrollment wywali błąd (`already exists`), może nie widzieć od razu dwóch przycisków awaryjnych. To trzeba domknąć, żeby zawsze był „exit”.

## Plan wdrożenia „gwarantowanego wyjścia awaryjnego”
1. **Dodać awaryjne CTA bezpośrednio w `TOTPSetup.tsx`** (nie tylko w `MFAChallenge`):
   - **„Wyślij kod email i resetuj Authenticator”**
   - **„Formularz do Support”**
2. Po kliknięciu jednego z CTA otwierać `MFAEmergencyScreen` z odpowiednią zakładką startową (`reset` albo `support`), bez opuszczania flow.
3. Po udanym self-reset:
   - automatycznie wracać do `TOTPSetup`,
   - ponowić `enrollTotp()` i pokazać nowy QR.
4. W przypadku błędu `already exists`:
   - obok błędu pokazać jasno sekcję **„Opcje awaryjne”** (z tymi dwoma przyciskami), żeby użytkownik nie utknął.
5. Dodać krótką instrukcję nad przyciskami:  
   „Jeśli usunąłeś wpis w Authy/Authenticator i nie masz kodu — użyj resetu email albo support.”

## Pliki do zmiany
- `src/components/auth/TOTPSetup.tsx` — dodać oba przyciski awaryjne + osadzenie `MFAEmergencyScreen`.
- `src/components/auth/MFAEmergencyScreen.tsx` — opcjonalnie dodać prop `initialTab` (`choose`/`reset`/`support`) dla bezpośredniego wejścia w właściwą ścieżkę.
- `src/components/auth/MFAChallenge.tsx` — pozostawić obecny flow, ewentualnie ujednolicić teksty CTA.

## Kryteria akceptacji (E2E)
1. Użytkownik bez kodu TOTP zawsze widzi 2 ścieżki: **reset email** i **support**.
2. Nawet przy błędzie `already exists` w `TOTPSetup` nadal ma te 2 przyciski.
3. Po self-reset użytkownik może od razu ponownie sparować nowy authenticator.
4. Brak ślepego końca („dead end”) w całym flow MFA.
