

# Formularz rejestracji w języku zaproszenia

## Problem
Gdy partner kopiuje zaproszenie w języku niemieckim, link prowadzi do formularza rejestracji, który jest zawsze po polsku. Gość widzi niespójność językową.

## Rozwiązanie
Dodać parametr `lang` do linku zaproszeniowego i użyć go w formularzu rejestracji.

## Przepływ

```text
1. Partner kopiuje zaproszenie (inviteLang = "de")
2. URL: /e/{slug}?ref={EQID}&lang=de
3. EventRegistrationBySlug → redirect: /events/register/{id}?invited_by={uid}&lang=de
4. EventGuestRegistration → odczytuje lang=de → wyświetla formularz po niemiecku
```

## Zmiany

### 1. Dodanie `&lang=` do linków zaproszeniowych

**Pliki**: `EventCard.tsx`, `EventCardCompact.tsx`, `CalendarWidget.tsx`, `AutoWebinarEventView.tsx`

Przy budowaniu `inviteUrl` dołączyć `&lang={inviteLang}` (pomijać jeśli `inviteLang === 'pl'` — domyślny).

### 2. Przekazanie `lang` przez resolver (`EventRegistrationBySlug.tsx`)

Odczytać `searchParams.get('lang')` i dołączyć do `redirectParams` → trafi do `EventGuestRegistration`.

### 3. Tłumaczenie formularza rejestracji (`EventGuestRegistration.tsx`)

- Odczytać `searchParams.get('lang')` (default: `'pl'`).
- Utworzyć słownik etykiet formularza w `invitationTemplates.ts` (nowa sekcja):
  - Etykiety pól: Email, Imię, Nazwisko, Telefon
  - Przycisk "Zapisz się na webinar"
  - Walidacja Zod: komunikaty błędów
  - Komunikaty sukcesu, "już zarejestrowany", "rejestracja zamknięta", "zakończone"
  - Nagłówki: "Webinar", "Prowadzący", data/czas (użycie `getDateLocale`)
  - Zgoda RODO
  - Footer
- Użyć `getRegistrationLabels(lang)` do podmienienia wszystkich hardcoded polskich stringów.

### 4. Rozszerzenie `invitationTemplates.ts`

Dodać nowy interfejs `RegistrationLabels` i szablon `registrationTemplates` z kluczami:

```typescript
interface RegistrationLabels {
  formTitle: string;          // "Zapisz się na webinar"
  emailLabel: string;         // "Email"
  firstNameLabel: string;     // "Imię"
  lastNameLabel: string;      // "Nazwisko"
  phoneLabel: string;         // "Telefon"
  submitButton: string;       // "Zapisz się na webinar"
  submitting: string;         // "Zapisywanie..."
  consent: string;            // RODO text
  successTitle: string;       // "Rejestracja zakończona!"
  alreadyRegisteredTitle: string;
  alreadyRegisteredMsg: string;
  eventFinished: string;
  registrationClosed: string;
  host: string;
  webinarBadge: string;
  emailError: string;
  nameError: string;
  // etc.
}
```

## Pliki do edycji
- `src/utils/invitationTemplates.ts` — dodać `RegistrationLabels` + `getRegistrationLabels()`
- `src/pages/EventRegistrationBySlug.tsx` — przekazać param `lang`
- `src/pages/EventGuestRegistration.tsx` — użyć `lang` param do tłumaczenia UI
- `src/components/events/EventCard.tsx` — `&lang=` w URL
- `src/components/events/EventCardCompact.tsx` — `&lang=` w URL
- `src/components/dashboard/widgets/CalendarWidget.tsx` — `&lang=` w URL
- `src/components/auto-webinar/AutoWebinarEventView.tsx` — `&lang=` w URL

