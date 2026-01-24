
# Plan: Naprawa dostępu publicznego do strony Zdrowa Wiedza

## Zidentyfikowany problem

Gdy użytkownik klika w link do materiału (np. `https://purelife.info.pl/zdrowa-wiedza/testowanie-zdrowa-wiedza`), zostaje automatycznie przekierowany na stronę logowania `/auth` zamiast zobaczyć formularz wpisywania kodu OTP.

### Przyczyna

W komponencie `ProfileCompletionGuard.tsx` (linie 27-34) zdefiniowana jest lista tras publicznych:

```typescript
const PUBLIC_PATHS = [
  '/',           // Strona główna
  '/auth',       // Panel logowania
  '/page/',      // Strony CMS
  '/infolink/',  // InfoLink pages - OTP protected
  '/events/register/', // Guest registration
];
```

**Brakuje ścieżki `/zdrowa-wiedza/`** - przez to `ProfileCompletionGuard` traktuje tę trasę jako wymagającą logowania i przekierowuje niezalogowanych użytkowników na `/auth`.

### Porównanie z InfoLink (który działa poprawnie)

InfoLink działa, ponieważ:
1. Ścieżka `/infolink/` jest na liście `PUBLIC_PATHS`
2. Strona `InfoLinkPage.tsx` sama pobiera dane i wyświetla formularz OTP
3. Użytkownik niezalogowany może wejść i wpisać kod

## Rozwiązanie

### 1. Dodanie `/zdrowa-wiedza/` do PUBLIC_PATHS

**Plik:** `src/components/profile/ProfileCompletionGuard.tsx`

**Zmiana (linie 27-34):**

```typescript
const PUBLIC_PATHS = [
  '/',           // Strona główna - publiczna (CMS)
  '/auth',       // Panel logowania
  '/page/',      // Strony CMS - publiczne
  '/infolink/',  // InfoLink pages are public (OTP protected)
  '/zdrowa-wiedza/', // Zdrowa Wiedza public pages (OTP protected)
  '/events/register/', // Guest registration pages
];
```

Ta pojedyncza zmiana umożliwi:
- Niezalogowanym użytkownikom dostęp do strony `/zdrowa-wiedza/{slug}`
- Wyświetlenie formularza OTP (który już istnieje w `HealthyKnowledgePublicPage.tsx`)
- Walidację kodu i dostęp do materiału po weryfikacji

### 2. Opcjonalnie: Ulepszenie strony publicznej

Obecna strona `HealthyKnowledgePublicPage.tsx` jest funkcjonalna, ale można ją ulepszyć wzorując się na `InfoLinkPage.tsx`:

**Potencjalne ulepszenia:**
- Dodanie ekranu potwierdzenia z confetti po wpisaniu kodu (obecnie jest, ale bez animacji wejścia)
- Obsługa wygaśnięcia sesji z przekierowaniem
- Lepsza obsługa błędów (np. "Materiał nie istnieje")

**Jednak te ulepszenia nie są wymagane do naprawy głównego problemu.**

## Podsumowanie

| Element | Obecnie | Po zmianie |
|---------|---------|------------|
| Dostęp do `/zdrowa-wiedza/{slug}` bez logowania | Przekierowanie na `/auth` | Wyświetla formularz OTP |
| Formularz OTP | Istnieje, ale niedostępny | Dostępny publicznie |
| Walidacja kodu | Działa | Działa |
| Wyświetlanie materiału | Działa | Działa |

## Zmiana do wykonania

Jedna linia kodu w `ProfileCompletionGuard.tsx` - dodanie `/zdrowa-wiedza/` do tablicy `PUBLIC_PATHS`.
