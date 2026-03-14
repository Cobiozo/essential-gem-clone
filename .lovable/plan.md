
Cel: użytkownik ma ZAWSZE widzieć 2 wyjścia awaryjne (reset email + formularz support), bez warunków i bez „martwego końca”.

Diagnoza po przeglądzie kodu:
- `TOTPSetup.tsx` już zawiera te opcje, ale są renderowane warunkowo:
  - sekcja główna tylko dla `hasAlreadyExistsError || (error && !qrCode)`
  - sekcja dolna tylko dla `qrCode`
- To zostawia lukę UX (opcje mogą nie być widoczne w konkretnym stanie/race-flow).
- Do I know what the issue is? Tak: problemem jest warunkowe renderowanie awaryjnych CTA zamiast stałej, gwarantowanej widoczności.

Plan wdrożenia:
1) Ujednolicić i „odwarunkować” CTA awaryjne w `TOTPSetup.tsx`
- Dodać stały blok „Problemy z Authenticatorem?” widoczny zawsze (niezależnie od `error`, `qrCode`, `hasAlreadyExistsError`).
- W bloku zawsze 2 przyciski:
  - „Resetuj Authenticator przez Email”
  - „Zgłoś problem do Support”
- Usunąć duplikację (jedna wspólna sekcja CTA zamiast dwóch różnych miejsc).

2) Wymusić bezpośrednią ścieżkę resetu przy błędzie konfliktu
- Gdy enrollment zwróci „already exists”, oprócz błędu:
  - automatycznie pokazać czytelny komunikat „użyj resetu email albo support”
  - opcjonalnie otworzyć `MFAEmergencyScreen` od razu na `initialTab='reset'` (żeby użytkownik nie musiał szukać przycisku).

3) Domknąć spójność flow między ekranami
- `MFAChallenge.tsx`: zostawić przycisk „Nie mam dostępu do Authenticatora” i upewnić się, że prowadzi do tego samego `MFAEmergencyScreen`.
- `MFAEmergencyScreen.tsx`: potwierdzić, że `initialTab` działa dla `reset/support` i że `onResetComplete` wraca do `TOTPSetup` z ponownym `enrollTotp()`.

4) Odporność na „stare/stuck UI”
- Dodać krótkie logi diagnostyczne w `TOTPSetup` (render-state: `error`, `qrCode`, `hasAlreadyExistsError`) do szybkiego potwierdzenia, czemu blok się pokazuje/nie.
- Po wdrożeniu sprawdzić podgląd i publikację, aby wykluczyć efekt starej wersji po stronie klienta.

Pliki do zmiany:
- `src/components/auth/TOTPSetup.tsx` (główna poprawka gwarancji wyjścia awaryjnego)
- `src/components/auth/MFAChallenge.tsx` (spójność wejścia do emergency flow)
- `src/components/auth/MFAEmergencyScreen.tsx` (spójność startu tabów i powrotu)

Kryteria akceptacji:
1. Na ekranie konfiguracji Authenticatora zawsze widoczne są oba przyciski awaryjne.
2. Przy błędzie „A factor with the friendly name ... already exists” użytkownik nadal ma natychmiastowy reset/support.
3. Po udanym self-reset użytkownik wraca do ponownego parowania QR bez ślepego końca.
4. Cały flow działa identycznie z `MFAChallenge` i z `TOTPSetup`.
