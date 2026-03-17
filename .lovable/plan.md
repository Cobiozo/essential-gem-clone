

# Plan: Dodanie checkboxa zgody na wysyłanie emaili do formularza rejestracji gości

## Kontekst
Formularz rejestracji gości (`EventGuestRegistration.tsx`) wyświetla obecnie tekst zgody jako informację pod przyciskiem. Trzeba dodać **obowiązkowy checkbox** zgody na otrzymywanie emaili z informacjami o wydarzeniu i linkiem, z informacją o prawie wycofania zgody pod adresem support@purelife.info.pl.

## Zmiany

### 1. `src/utils/invitationTemplates.ts`
- Dodać nowe pole `emailConsent` do interfejsu `RegistrationLabels` i do każdego szablonu językowego (pl, en, de):
  - **PL**: "Wyrażam zgodę na otrzymywanie wiadomości email z informacjami dotyczącymi tego wydarzenia, w tym linku do spotkania. Dane są chronione. Zgodę można wycofać, kontaktując się pod adresem support@purelife.info.pl."
  - **EN/DE**: odpowiedniki w danym języku
- Dodać pole `emailConsentRequired` z komunikatem błędu walidacji

### 2. `src/pages/EventGuestRegistration.tsx`
- Dodać `email_consent: boolean` do `RegistrationFormData`
- Dodać walidację `email_consent: z.literal(true, { errorMap: ... })` do schematu zod
- Dodać pole `Checkbox` z etykietą `labels.emailConsent` **przed przyciskiem submit** (między polem telefonu a przyciskiem)
- Zachować istniejący tekst `labels.consent` pod przyciskiem bez zmian
- **Nie modyfikować** logiki submit, RPC, edge functions — checkbox jest walidacją frontendową

### 3. Brak zmian w bazie danych
Zgoda jest warunkiem rejestracji (walidacja frontendowa). Nie wymaga nowej kolumny — rejestracja oznacza akceptację.

## Bezpieczeństwo istniejących linków
- Formularz nadal działa identycznie — jedynie dodaje nowy wymagany checkbox
- Żadne URL-e, parametry ani routing nie są modyfikowane
- RPC `register_event_guest` nie jest modyfikowane

