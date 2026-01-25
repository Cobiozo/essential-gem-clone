
# Plan naprawy samouczka onboardingowego

## Zidentyfikowane problemy

### Problem 1: Wyświetlanie surowych kluczy tłumaczeń
Komponenty używają `t('onboarding.dialog.welcomeTitle')` itp., ale klucze nie istnieją w bazie `i18n_translations`.

### Problem 2: Samouczek nie przechodzi do kolejnych kroków
W `TourOverlay.tsx` gdy element nie zostanie znaleziony (bo użytkownik jest na `/auth` zamiast `/dashboard`), kod automatycznie wywołuje `onNext()` po 100ms, przeskakując wszystkie kroki.

### Problem 3: Brakujące atrybuty `data-tour`
Niektóre elementy docelowe nie mają wymaganych atrybutów:
- `notifications-bell` - brak w NotificationBell
- `user-menu-account` i `user-menu-tools` - brak w DashboardTopbar dropdown

### Problem 4: Niespójne selektory
Selektory w `tourSteps.ts` muszą odpowiadać rzeczywistym atrybutom `data-tour` w komponentach.

---

## Plan naprawy

### Krok 1: Zamiana kluczy i18n na bezpośrednie teksty

**Plik: `src/components/onboarding/tourSteps.ts`**
- Zmienić interfejs `TourStep` z `titleKey`/`descriptionKey` na `title`/`description`
- Wpisać bezpośrednie polskie teksty dla każdego kroku

**Plik: `src/components/onboarding/TourWelcomeDialog.tsx`**
- Zamienić `t('onboarding.dialog.welcomeTitle')` na `"Witaj w Pure Life!"`
- Zamienić `t('onboarding.dialog.welcomeDescription')` na `"Przygotowaliśmy dla Ciebie krótki przewodnik po platformie."`
- Zamienić `t('onboarding.dialog.startButton')` na `"Rozpocznij samouczek"`
- Zamienić `t('onboarding.dialog.skipButton')` na `"Pomiń - znam platformę"`

**Plik: `src/components/onboarding/TourCompletionDialog.tsx`**
- Zamienić `t('onboarding.dialog.completionTitle')` na `"Gratulacje!"`
- Zamienić `t('onboarding.dialog.completionDescription')` na `"Znasz już podstawy platformy Pure Life."`
- Zamienić `t('onboarding.dialog.closeButton')` na `"Zamknij i zacznij korzystać"`
- Zamienić `t('onboarding.dialog.repeatButton')` na `"Powtórz samouczek"`

**Plik: `src/components/onboarding/TourTooltip.tsx`**
- Zamienić `t(step.titleKey)` na `step.title`
- Zamienić `t(step.descriptionKey)` na `step.description`
- Zamienić nawigacyjne `t('onboarding.navigation.step')` na `"Krok"`
- Zamienić `t('onboarding.navigation.of')` na `"z"`
- Zamienić `t('onboarding.navigation.previous')` na `"Wstecz"`
- Zamienić `t('onboarding.navigation.next')` na `"Dalej"`
- Zamienić `t('onboarding.navigation.finish')` na `"Zakończ"`

---

### Krok 2: Naprawa logiki szukania elementów

**Plik: `src/components/onboarding/TourOverlay.tsx`**
- Zamiast natychmiast przeskakiwać do następnego kroku gdy element nie istnieje, dodać mechanizm retry z limitem prób
- Dodać console.log do debugowania (tymczasowo)
- Jeśli element nie zostanie znaleziony po kilku próbach, poczekać dłużej (element może być lazy-loaded)

```typescript
const updateHighlight = useCallback(() => {
  const element = document.querySelector(step.targetSelector);
  
  if (element) {
    const rect = element.getBoundingClientRect();
    // ... reszta logiki
    setIsVisible(true);
    setRetryCount(0);
  } else {
    // Poczekaj i spróbuj ponownie (max 5 prób)
    if (retryCount < 5) {
      setRetryCount(prev => prev + 1);
      setTimeout(updateHighlight, 500);
    } else {
      // Po 5 próbach - przejdź do następnego kroku
      console.warn(`Element not found: ${step.targetSelector}, skipping...`);
      setIsVisible(false);
      onNext();
    }
  }
}, [step, onNext, retryCount]);
```

---

### Krok 3: Dodanie brakujących atrybutów `data-tour`

**Plik: `src/components/dashboard/DashboardTopbar.tsx`**
- Dodać `data-tour="notifications-bell"` do komponentu `NotificationBell`
- Dodać `data-tour="user-menu-account"` do opcji "Moje konto" w dropdown avatara
- Dodać `data-tour="user-menu-tools"` do opcji "Panel narzędziowy" w dropdown avatara

---

### Krok 4: Aktualizacja tourSteps.ts z bezpośrednimi tekstami

Nowa struktura z polskimi tekstami:

| ID | Selektor | Tytuł | Opis |
|----|----------|-------|------|
| welcome-widget | `[data-tour="welcome-widget"]` | Widget powitalny | Tutaj widzisz powitanie, aktualną datę i zegar. Możesz zmienić strefę czasową klikając na selektor. |
| sidebar | `[data-tour="sidebar"]` | Menu nawigacyjne | Stąd przejdziesz do wszystkich sekcji platformy. Na urządzeniach mobilnych otwórz je przyciskiem w lewym górnym rogu. |
| training | `[data-tour="menu-academy"]` | Akademia / Szkolenia | Tutaj znajdziesz szkolenia. Widget na dashboardzie pokazuje Twój postęp. Po ukończeniu otrzymasz certyfikat! |
| calendar | `[data-tour="calendar-widget"]` | Kalendarz i Spotkania | Kalendarz pokazuje nadchodzące wydarzenia. Obok widzisz listę Twoich najbliższych spotkań. |
| notifications | `[data-tour="notifications-bell"]` | Powiadomienia | Dzwonek w górnym pasku pokazuje nowe powiadomienia. Widget na dashboardzie wyświetla ostatnie wiadomości. |
| resources | `[data-tour="menu-resources"]` | Zasoby / Biblioteka | Tutaj znajdziesz materiały do pobrania, dokumenty, prezentacje i inne zasoby edukacyjne. |
| pure-kontakty | `[data-tour="menu-pureContacts"]` | PureKontakty | Zarządzaj kontaktami prywatnymi i zespołowymi. Dodawaj notatki, planuj kolejne kontakty i wyszukuj specjalistów w bazie. |
| pure-linki | `[data-tour="menu-reflinks"]` | PureLinki | Generuj unikalne linki polecające do zapraszania nowych osób. Skopiuj link i udostępnij potencjalnym partnerom lub klientom. |
| info-linki | `[data-tour="menu-infolinks"]` | InfoLinki | Twórz linki z kodem OTP do udostępniania chronionych treści. Odbiorcy wpisują kod, aby uzyskać dostęp do materiałów. |
| zdrowa-wiedza | `[data-tour="menu-healthy-knowledge"]` | Zdrowa Wiedza | Biblioteka materiałów edukacyjnych o zdrowiu. Możesz je przeglądać i udostępniać innym za pomocą kodów OTP. |
| my-account | `[data-tour="user-menu-account"]` | Moje Konto | Klikając swój avatar otworzysz menu użytkownika. Wybierz 'Moje konto' aby zarządzać swoim profilem, zmienić hasło, skonfigurować preferencje. |
| tool-panel | `[data-tour="user-menu-tools"]` | Panel narzędziowy | Panel narzędziowy pomoże Ci gdy aplikacja działa niepoprawnie. Znajdziesz tu opcje czyszczenia pamięci podręcznej. |
| support | `[data-tour="menu-support"]` | Wsparcie techniczne | Masz pytanie lub problem? Kliknij tutaj, aby wysłać zgłoszenie do zespołu wsparcia. |
| footer | `[data-tour="footer-section"]` | Stopka z kontaktem | Na dole znajdziesz cytat dnia, dane kontaktowe i linki do regulaminu oraz polityki prywatności. |

---

## Pliki do modyfikacji

| Plik | Typ zmiany |
|------|------------|
| `src/components/onboarding/tourSteps.ts` | Zmiana struktury na bezpośrednie teksty PL |
| `src/components/onboarding/TourWelcomeDialog.tsx` | Zamiana t() na teksty PL |
| `src/components/onboarding/TourCompletionDialog.tsx` | Zamiana t() na teksty PL |
| `src/components/onboarding/TourTooltip.tsx` | Zamiana t() na step.title/description + teksty nawigacji |
| `src/components/onboarding/TourOverlay.tsx` | Dodanie mechanizmu retry przy szukaniu elementów |
| `src/components/dashboard/DashboardTopbar.tsx` | Dodanie data-tour do NotificationBell i opcji menu |

---

## Oczekiwany rezultat

1. Dialog powitalny wyświetla poprawny tekst "Witaj w Pure Life!" zamiast surowych kluczy
2. Po kliknięciu "Rozpocznij samouczek" tour prawidłowo podświetla kolejne elementy
3. Nawigacja między krokami działa płynnie
4. Jeśli element nie istnieje (np. dla innej roli), system czeka chwilę i próbuje ponownie
5. Wszystkie kroki mają czytelne polskie opisy
