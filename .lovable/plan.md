

# Samouczek dla nowych użytkowników Pure Life (zaktualizowany)

## Koncepcja

Interaktywny przewodnik krok-po-kroku wyświetlany przy **pierwszym logowaniu**, który prowadzi użytkownika przez najważniejsze elementy platformy. Samouczek podświetla konkretne elementy interfejsu i wyjaśnia ich funkcje.

---

## Schemat działania

```text
URUCHOMIENIE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger: Pierwsze logowanie (fresh_login + brak flagi
         tutorial_completed w profilu)

Dialog powitalny z wyborem:
[Rozpocznij samouczek] lub [Pomiń - znam platformę]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Szczegółowe kroki samouczka

### Krok 1: Widget powitalny
**Podświetlenie:** WelcomeWidget (góra dashboardu)  
**Opis:** "Tutaj widzisz powitanie, aktualną datę i zegar. Możesz zmienić strefę czasową klikając na selektor."  
**Widoczność:** Wszystkie role

---

### Krok 2: Menu boczne (Sidebar)
**Podświetlenie:** DashboardSidebar  
**Opis:** "Menu nawigacyjne - stąd przejdziesz do wszystkich sekcji platformy. Na urządzeniach mobilnych otwórz je przyciskiem w lewym górnym rogu."  
**Widoczność:** Wszystkie role

---

### Krok 3: Akademia / Szkolenia
**Podświetlenie:** Pozycja "Akademia" w menu + TrainingProgressWidget  
**Opis:** "Tutaj znajdziesz szkolenia. Widget na dashboardzie pokazuje Twój postęp. Po ukończeniu otrzymasz certyfikat!"  
**Widoczność:** Wszystkie role

---

### Krok 4: Kalendarz i Spotkania
**Podświetlenie:** CalendarWidget + MyMeetingsWidget  
**Opis:** "Kalendarz pokazuje nadchodzące wydarzenia. Obok widzisz listę Twoich najbliższych spotkań."  
**Widoczność:** Wszystkie role

---

### Krok 5: Powiadomienia
**Podświetlenie:** NotificationBell (górny pasek) + NotificationsWidget  
**Opis:** "Dzwonek w górnym pasku pokazuje nowe powiadomienia. Widget na dashboardzie wyświetla ostatnie wiadomości."  
**Widoczność:** Wszystkie role

---

### Krok 6: Zasoby / Biblioteka wiedzy
**Podświetlenie:** "Zasoby" w menu + ResourcesWidget  
**Opis:** "Tutaj znajdziesz materiały do pobrania, dokumenty, prezentacje i inne zasoby edukacyjne."  
**Widoczność:** Wszystkie role

---

### Krok 7: PureKontakty
**Podświetlenie:** "PureKontakty" w menu bocznym  
**Opis:** "Zarządzaj kontaktami prywatnymi i zespołowymi. Dodawaj notatki, planuj kolejne kontakty i wyszukuj specjalistów w bazie."  
**Widoczność:** Partner, Specjalista, Admin

---

### Krok 8: PureLinki
**Podświetlenie:** "PureLinki" w menu bocznym lub w "Moje konto"  
**Opis:** "Generuj unikalne linki polecające do zapraszania nowych osób. Skopiuj link i udostępnij potencjalnym partnerom lub klientom."  
**Widoczność:** Partner, Specjalista, Admin

---

### Krok 9: InfoLinki
**Podświetlenie:** "InfoLinki" w menu bocznym  
**Opis:** "Twórz linki z kodem OTP do udostępniania chronionych treści. Odbiorcy wpisują kod, aby uzyskać dostęp do materiałów."  
**Widoczność:** Partner, Specjalista, Admin

---

### Krok 10: Zdrowa Wiedza
**Podświetlenie:** "Zdrowa Wiedza" w menu bocznym  
**Opis:** "Biblioteka materiałów edukacyjnych o zdrowiu. Możesz je przeglądać i udostępniać innym za pomocą kodów OTP."  
**Widoczność:** Partner, Specjalista, Admin

---

### Krok 11: Moje Konto
**Podświetlenie:** Avatar użytkownika w górnym pasku → menu rozwijane → "Moje konto"  
**Opis:** "Klikając swój avatar otworzysz menu użytkownika. Wybierz 'Moje konto' aby zarządzać swoim profilem, zmienić hasło, skonfigurować preferencje powiadomień i ustawienia komunikacji."  
**Widoczność:** Wszystkie role

**Zakładki w Moje Konto:**
| Zakładka | Opis |
|----------|------|
| Profil | Dane osobowe, avatar, adres |
| PureKontakty | Kontakty zespołowe (dla partnerów/specjalistów) |
| Komunikacja | Centrum wiadomości |
| Powiadomienia | Ustawienia powiadomień |
| Preferencje | Włącz/wyłącz sygnał dnia |
| AI Kompas | Asystent AI (jeśli aktywny) |
| Moje PureLinki | Generowanie linków polecających |
| Bezpieczeństwo | Zmiana hasła |

---

### Krok 12: Panel narzędziowy
**Podświetlenie:** Avatar użytkownika → menu rozwijane → ikona klucza "Panel narzędziowy"  
**Opis:** "Panel narzędziowy pomoże Ci gdy aplikacja działa niepoprawnie. Znajdziesz tu opcje czyszczenia pamięci podręcznej, które mogą rozwiązać problemy z wyświetlaniem danych."  
**Widoczność:** Wszystkie role

**Funkcje Panelu narzędziowego:**
| Opcja | Co robi | Kiedy użyć |
|-------|---------|------------|
| Cache aplikacji | Czyści zapisane dane CMS, stron i zasobów | Gdy widzisz stare dane po aktualizacji |
| Odśwież dane | Wymusza pobranie danych z serwera | Gdy treści się nie aktualizują |
| Dane sesji | Czyści tymczasowe dane przeglądarki | Gdy formularze działają dziwnie |
| Pełne czyszczenie | Usuwa wszystko i wylogowuje | Ostateczność przy poważnych błędach |

---

### Krok 13: Wsparcie techniczne
**Podświetlenie:** "Pomoc" w menu bocznym  
**Opis:** "Masz pytanie lub problem? Kliknij tutaj, aby wysłać zgłoszenie do zespołu wsparcia technicznego."  
**Widoczność:** Wszystkie role

---

### Krok 14: Stopka z kontaktem
**Podświetlenie:** DashboardFooterSection  
**Opis:** "Na dole znajdziesz cytat dnia, dane kontaktowe (email: support@purelife.info.pl) i linki do regulaminu oraz polityki prywatności."  
**Widoczność:** Wszystkie role

---

```text
ZAKOŃCZENIE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gratulacje! Znasz już podstawy platformy Pure Life.

[Powtórz samouczek później]  [Zamknij i zacznij korzystać]

Zapis do bazy: profiles.tutorial_completed = true
              profiles.tutorial_completed_at = NOW()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Warianty dla różnych ról

| Rola | Liczba kroków | Widoczne moduły |
|------|---------------|-----------------|
| **Klient** | 10 kroków | Podstawowe (bez PureKontakty, PureLinki, InfoLinki, Zdrowa Wiedza) |
| **Partner** | 14 kroków | Pełny zestaw: PureKontakty, PureLinki, InfoLinki, Zdrowa Wiedza |
| **Specjalista** | 14 kroków | Pełny zestaw: PureKontakty, PureLinki, InfoLinki, Zdrowa Wiedza |
| **Admin** | 14+ kroków | Pełny zestaw + Panel administracyjny, Aktywni użytkownicy |

**Uwaga:** Kalkulator NIE jest częścią samouczka - to funkcja przydzielana indywidualnie przez admina.

---

## Szczegóły techniczne

### 1. Nowe pliki do utworzenia

| Plik | Opis |
|------|------|
| `src/components/onboarding/OnboardingTour.tsx` | Główny komponent samouczka z logiką kroków |
| `src/components/onboarding/TourStep.tsx` | Pojedynczy krok z overlay i podświetleniem |
| `src/components/onboarding/TourTooltip.tsx` | Dymek z opisem i przyciskami nawigacji |
| `src/components/onboarding/TourWelcomeDialog.tsx` | Dialog powitalny przed rozpoczęciem |
| `src/components/onboarding/TourCompletionDialog.tsx` | Dialog końcowy z gratulacjami |
| `src/components/onboarding/tourSteps.ts` | Konfiguracja wszystkich kroków |
| `src/hooks/useOnboardingTour.ts` | Hook do zarządzania stanem samouczka |

### 2. Migracja bazy danych

```sql
-- Dodanie pól do tabeli profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutorial_completed_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutorial_skipped boolean DEFAULT false;
```

### 3. Konfiguracja kroków

```typescript
// src/components/onboarding/tourSteps.ts
export interface TourStep {
  id: string;
  targetSelector: string;
  titleKey: string;
  descriptionKey: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  visibleFor: ('klient' | 'partner' | 'specjalista' | 'admin')[];
  requiresDropdownOpen?: boolean;
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome-widget',
    targetSelector: '[data-tour="welcome-widget"]',
    titleKey: 'onboarding.welcome.title',
    descriptionKey: 'onboarding.welcome.description',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin']
  },
  // ... kroki 2-6 dla wszystkich ról
  {
    id: 'pure-kontakty',
    targetSelector: '[data-tour="menu-pure-kontakty"]',
    titleKey: 'onboarding.pureKontakty.title',
    descriptionKey: 'onboarding.pureKontakty.description',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin']
  },
  {
    id: 'pure-linki',
    targetSelector: '[data-tour="menu-pure-linki"]',
    titleKey: 'onboarding.pureLinki.title',
    descriptionKey: 'onboarding.pureLinki.description',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin']
  },
  {
    id: 'info-linki',
    targetSelector: '[data-tour="menu-info-linki"]',
    titleKey: 'onboarding.infoLinki.title',
    descriptionKey: 'onboarding.infoLinki.description',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin']
  },
  {
    id: 'zdrowa-wiedza',
    targetSelector: '[data-tour="menu-zdrowa-wiedza"]',
    titleKey: 'onboarding.zdrowaWiedza.title',
    descriptionKey: 'onboarding.zdrowaWiedza.description',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin']
  },
  {
    id: 'my-account',
    targetSelector: '[data-tour="user-menu-account"]',
    titleKey: 'onboarding.myAccount.title',
    descriptionKey: 'onboarding.myAccount.description',
    position: 'left',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    requiresDropdownOpen: true
  },
  {
    id: 'tool-panel',
    targetSelector: '[data-tour="user-menu-tools"]',
    titleKey: 'onboarding.toolPanel.title',
    descriptionKey: 'onboarding.toolPanel.description',
    position: 'left',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    requiresDropdownOpen: true
  }
  // ... pozostałe kroki
];
```

### 4. Klucze i18n do dodania (PL)

```json
{
  "onboarding": {
    "dialog": {
      "welcomeTitle": "Witaj w Pure Life!",
      "welcomeDescription": "Przygotowaliśmy dla Ciebie krótki przewodnik po platformie.",
      "startButton": "Rozpocznij samouczek",
      "skipButton": "Pomiń - znam platformę",
      "completionTitle": "Gratulacje!",
      "completionDescription": "Znasz już podstawy platformy Pure Life.",
      "repeatButton": "Powtórz samouczek później",
      "closeButton": "Zamknij i zacznij korzystać"
    },
    "navigation": {
      "step": "Krok",
      "of": "z",
      "next": "Dalej",
      "previous": "Wstecz",
      "skip": "Pomiń"
    },
    "welcome": {
      "title": "Widget powitalny",
      "description": "Tutaj widzisz powitanie, aktualną datę i zegar. Możesz zmienić strefę czasową klikając na selektor."
    },
    "sidebar": {
      "title": "Menu nawigacyjne",
      "description": "Stąd przejdziesz do wszystkich sekcji platformy. Na urządzeniach mobilnych otwórz je przyciskiem w lewym górnym rogu."
    },
    "training": {
      "title": "Akademia / Szkolenia",
      "description": "Tutaj znajdziesz szkolenia. Widget na dashboardzie pokazuje Twój postęp. Po ukończeniu otrzymasz certyfikat!"
    },
    "calendar": {
      "title": "Kalendarz i Spotkania",
      "description": "Kalendarz pokazuje nadchodzące wydarzenia. Obok widzisz listę Twoich najbliższych spotkań."
    },
    "notifications": {
      "title": "Powiadomienia",
      "description": "Dzwonek w górnym pasku pokazuje nowe powiadomienia. Widget na dashboardzie wyświetla ostatnie wiadomości."
    },
    "resources": {
      "title": "Zasoby / Biblioteka",
      "description": "Tutaj znajdziesz materiały do pobrania, dokumenty, prezentacje i inne zasoby edukacyjne."
    },
    "pureKontakty": {
      "title": "PureKontakty",
      "description": "Zarządzaj kontaktami prywatnymi i zespołowymi. Dodawaj notatki, planuj kolejne kontakty i wyszukuj specjalistów w bazie."
    },
    "pureLinki": {
      "title": "PureLinki",
      "description": "Generuj unikalne linki polecające do zapraszania nowych osób. Skopiuj link i udostępnij potencjalnym partnerom lub klientom."
    },
    "infoLinki": {
      "title": "InfoLinki",
      "description": "Twórz linki z kodem OTP do udostępniania chronionych treści. Odbiorcy wpisują kod, aby uzyskać dostęp do materiałów."
    },
    "zdrowaWiedza": {
      "title": "Zdrowa Wiedza",
      "description": "Biblioteka materiałów edukacyjnych o zdrowiu. Możesz je przeglądać i udostępniać innym za pomocą kodów OTP."
    },
    "myAccount": {
      "title": "Moje Konto",
      "description": "Klikając swój avatar otworzysz menu użytkownika. Wybierz 'Moje konto' aby zarządzać swoim profilem, zmienić hasło, skonfigurować preferencje powiadomień i ustawienia komunikacji."
    },
    "toolPanel": {
      "title": "Panel narzędziowy",
      "description": "Panel narzędziowy pomoże Ci gdy aplikacja działa niepoprawnie. Znajdziesz tu opcje czyszczenia pamięci podręcznej, które mogą rozwiązać problemy z wyświetlaniem danych."
    },
    "support": {
      "title": "Wsparcie techniczne",
      "description": "Masz pytanie lub problem? Kliknij tutaj, aby wysłać zgłoszenie do zespołu wsparcia technicznego."
    },
    "footer": {
      "title": "Stopka z kontaktem",
      "description": "Na dole znajdziesz cytat dnia, dane kontaktowe (email: support@purelife.info.pl) i linki do regulaminu oraz polityki prywatności."
    }
  }
}
```

### 5. Modyfikacje istniejących plików

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/DashboardTopbar.tsx` | Dodanie atrybutów `data-tour` do elementów menu avatara |
| `src/components/dashboard/DashboardSidebar.tsx` | Dodanie `data-tour` do pozycji menu |
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | Dodanie `data-tour="welcome-widget"` |
| `src/components/dashboard/widgets/CalendarWidget.tsx` | Dodanie `data-tour="calendar-widget"` |
| `src/components/dashboard/widgets/NotificationsWidget.tsx` | Dodanie `data-tour="notifications-widget"` |
| `src/components/dashboard/widgets/ResourcesWidget.tsx` | Dodanie `data-tour="resources-widget"` |
| `src/components/dashboard/widgets/TrainingProgressWidget.tsx` | Dodanie `data-tour="training-widget"` |
| `src/pages/Dashboard.tsx` | Import i render `<OnboardingTour />` |
| `src/contexts/LanguageContext.tsx` | Dodanie kluczy i18n dla onboardingu |

### 6. Logika uruchomienia samouczka

```typescript
// W Dashboard.tsx lub App.tsx
useEffect(() => {
  const checkTutorial = async () => {
    if (user && isFreshLogin && profile && !profile.tutorial_completed) {
      // Pokaż dialog powitalny
      setShowTutorialWelcome(true);
    }
  };
  checkTutorial();
}, [user, isFreshLogin, profile]);
```

### 7. Przycisk "Powtórz samouczek" w ustawieniach

W zakładce Preferencje w Moje Konto dodać przycisk:
```tsx
<Button 
  variant="outline" 
  onClick={() => {
    // Zresetuj flagę i uruchom samouczek
    await supabase.from('profiles').update({ tutorial_completed: false }).eq('id', user.id);
    navigate('/dashboard');
    window.dispatchEvent(new CustomEvent('startOnboardingTour'));
  }}
>
  <Play className="mr-2 h-4 w-4" />
  Powtórz samouczek
</Button>
```

---

## Podsumowanie plików do utworzenia/modyfikacji

| Plik | Typ | Opis |
|------|-----|------|
| `src/components/onboarding/OnboardingTour.tsx` | Nowy | Główny komponent z logiką |
| `src/components/onboarding/TourStep.tsx` | Nowy | Krok z overlay |
| `src/components/onboarding/TourTooltip.tsx` | Nowy | Dymek opisu |
| `src/components/onboarding/TourWelcomeDialog.tsx` | Nowy | Dialog powitalny |
| `src/components/onboarding/TourCompletionDialog.tsx` | Nowy | Dialog końcowy |
| `src/components/onboarding/tourSteps.ts` | Nowy | Konfiguracja kroków |
| `src/hooks/useOnboardingTour.ts` | Nowy | Hook stanu |
| `src/components/dashboard/DashboardTopbar.tsx` | Modyfikacja | Dodanie data-tour |
| `src/components/dashboard/DashboardSidebar.tsx` | Modyfikacja | Dodanie data-tour |
| `src/components/dashboard/widgets/*.tsx` | Modyfikacja | Dodanie data-tour |
| `src/pages/Dashboard.tsx` | Modyfikacja | Import OnboardingTour |
| `src/pages/MyAccount.tsx` | Modyfikacja | Przycisk "Powtórz samouczek" |
| `supabase/migrations/xxx.sql` | Nowy | Dodanie kolumn tutorial_* |

---

## Oczekiwany rezultat

1. Nowi użytkownicy widzą dialog powitalny przy pierwszym logowaniu
2. Klienci widzą 10 kroków (podstawowe funkcje)
3. Partnerzy i Specjaliści widzą 14 kroków (z PureKontakty, PureLinki, InfoLinki, Zdrowa Wiedza)
4. Kalkulator NIE jest pokazywany w samouczku (funkcja przydzielana przez admina)
5. Krok 11 (Moje Konto) pokazuje gdzie zarządzać profilem
6. Krok 12 (Panel narzędziowy) pokazuje jak rozwiązywać problemy techniczne
7. Użytkownik może powtórzyć samouczek z ustawień konta
8. Wszystko przetłumaczone przez system i18n

