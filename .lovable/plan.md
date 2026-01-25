
# Kompleksowy plan samouczka (Onboarding Tutorial) dla platformy Pure Life

## Analiza aktualnego stanu

### Istniejące kroki samouczka (14 kroków)
Obecnie samouczek obejmuje następujące elementy:

| # | ID | Element | Widoczność |
|---|-----|---------|------------|
| 1 | welcome-widget | Widget powitalny | Wszyscy |
| 2 | sidebar | Menu nawigacyjne | Wszyscy |
| 3 | training | Akademia/Szkolenia | Wszyscy |
| 4 | calendar | Kalendarz i Spotkania | Wszyscy |
| 5 | notifications | Powiadomienia (dzwonek) | Wszyscy |
| 6 | resources | Zasoby/Biblioteka | Wszyscy |
| 7 | pure-kontakty | PureKontakty | Partner, Specjalista, Admin |
| 8 | pure-linki | PureLinki | Partner, Specjalista, Admin |
| 9 | info-linki | InfoLinki | Partner, Specjalista, Admin |
| 10 | zdrowa-wiedza | Zdrowa Wiedza | Partner, Specjalista, Admin |
| 11 | my-account | Moje Konto | Wszyscy |
| 12 | tool-panel | Panel narzędziowy | Wszyscy |
| 13 | support | Wsparcie techniczne | Wszyscy |
| 14 | footer | Stopka z kontaktem | Wszyscy |

### Elementy BRAKUJĄCE w samouczku

Na dashboardzie istnieją widgety i elementy interaktywne, które NIE są uwzględnione w samouczku:

**Widgety dashboardowe:**
- Moje Spotkania (MyMeetingsWidget) - lista zaplanowanych wydarzeń użytkownika
- Postęp Szkolenia (TrainingProgressWidget) - pasek postępu modułów
- Widget Powiadomień (NotificationsWidget) - widget (nie tylko dzwonek)
- Widget Kodów OTP (CombinedOtpCodesWidget) - dla partnerów/adminów
- Widget Zasobów (ResourcesWidget) - najnowsze zasoby
- Widget Kontaktów Zespołowych (TeamContactsWidget) - kontakty zespołu
- Widget PureLinków (ReflinksWidget) - linki polecające
- Widget InfoLinków (InfoLinksWidget) - linki informacyjne
- Widget Zdrowa Wiedza (HealthyKnowledgeWidget) - materiały zdrowotne
- Widget Aktywnych Użytkowników (ActiveUsersWidget) - tylko admin

**Elementy paska górnego (Topbar):**
- Przycisk samouczka (ikonka pomocy)
- Selektor języka (LanguageSelector)
- Selektor motywu (ThemeSelector)
- Avatar użytkownika i menu rozwijane
- Synchronizacja Google Calendar (w dropdown)

**Elementy sidebara:**
- Dashboard (główny link)
- Aktualności
- Wydarzenia (i submenu: Webinary, Spotkania zespołu, Spotkania indywidualne)
- Chat/Komunikacja
- Społeczność
- Ustawienia
- Kalkulator (dla uprawnionych)
- Panel Administracyjny (dla adminów)

---

## Proponowany plan rozszerzonego samouczka

### Struktura: 22 kroki dla pełnej wersji (Partner/Specjalista/Admin)

Samouczek podzielony na logiczne sekcje, prowadzące użytkownika przez interfejs:

```text
WPROWADZENIE
    │
    ├── 1. Widget Powitalny (zegar, strefa czasowa)
    │
NAWIGACJA GŁÓWNA
    │
    ├── 2. Menu boczne (sidebar) - ogólne wprowadzenie
    ├── 3. Dashboard - główny link
    │
WIDGETY DASHBOARDOWE
    │
    ├── 4. Kalendarz - przeglądanie wydarzeń
    ├── 5. Moje Spotkania - zaplanowane spotkania
    ├── 6. Postęp Szkolenia - śledzenie nauki
    ├── 7. Widget Powiadomień - ostatnie powiadomienia
    ├── 8. Widget Kodów OTP - (Partner/Admin) aktywne kody
    ├── 9. Widget Zasobów - najnowsze materiały
    ├── 10. Widget Kontaktów - zespół i kontakty
    │
MENU FUNKCJI
    │
    ├── 11. Akademia/Szkolenia - moduły szkoleniowe
    ├── 12. Zdrowa Wiedza - (Partner+) materiały edukacyjne
    ├── 13. Zasoby/Biblioteka - dokumenty i pliki
    ├── 14. PureKontakty - (Partner+) zarządzanie kontaktami
    ├── 15. PureLinki - (Partner+) linki polecające
    ├── 16. InfoLinki - (Partner+) linki z OTP
    ├── 17. Aktualności - news i ogłoszenia
    ├── 18. Wydarzenia - webinary, spotkania zespołu
    │
PASEK GÓRNY I USTAWIENIA
    │
    ├── 19. Dzwonek Powiadomień - alert o nowych
    ├── 20. Przycisk Samouczka - ponowne uruchomienie
    ├── 21. Selektor Języka - zmiana języka
    ├── 22. Selektor Motywu - tryb jasny/ciemny
    ├── 23. Avatar i Menu Użytkownika - dostęp do profilu
    │       │
    │       ├── 23a. Moje Konto - ustawienia profilu
    │       ├── 23b. Panel Narzędziowy - czyszczenie cache
    │       └── 23c. Synchronizacja API - Google Calendar
    │
    ├── 24. Wsparcie Techniczne - zgłaszanie problemów
    │
STOPKA
    │
    └── 25. Sekcja Stopki - cytat dnia, kontakt, regulamin
```

---

## Szczegółowa specyfikacja nowych kroków

### Nowe kroki do dodania w `tourSteps.ts`:

| ID | targetSelector | Tytuł | Opis | Pozycja | Role | Uwagi |
|----|----------------|-------|------|---------|------|-------|
| `my-meetings-widget` | `[data-tour="my-meetings-widget"]` | Twoje Spotkania | Lista Twoich nadchodzących spotkań. Gdy zbliża się czas, pojawi się przycisk WEJDŹ z pulsującą kropką. | bottom | Wszyscy | scrollTo |
| `training-widget` | `[data-tour="training-widget"]` | Postęp Szkolenia | Widget pokazuje Twój postęp w modułach szkoleniowych. Kliknij moduł, aby kontynuować naukę. | bottom | Wszyscy | |
| `notifications-widget` | `[data-tour="notifications-widget"]` | Ostatnie Powiadomienia | Widget wyświetla 4 najnowsze powiadomienia. Kliknij, aby zobaczyć szczegóły lub przejść do pełnej listy. | bottom | Wszyscy | |
| `otp-codes-widget` | `[data-tour="otp-codes-widget"]` | Kody Dostępu OTP | Podgląd aktywnych kodów OTP dla InfoLinków i Zdrowej Wiedzy. Skopiuj kod jednym kliknięciem i udostępnij odbiorcy. | bottom | Partner, Admin | |
| `resources-widget` | `[data-tour="resources-widget"]` | Najnowsze Zasoby | Szybki dostęp do najnowszych materiałów. Możesz kopiować linki, pobierać pliki lub przejść do biblioteki. | bottom | Wszyscy | |
| `team-contacts-widget` | `[data-tour="team-contacts-widget"]` | Kontakty Zespołowe | Podgląd Twoich kontaktów prywatnych i zespołowych. Kliknij, aby zobaczyć pełną listę i dodać nowe kontakty. | bottom | Partner, Specjalista, Admin | |
| `reflinks-widget` | `[data-tour="reflinks-widget"]` | PureLinki | Widget pokazuje Twoje linki polecające. Kopiuj i udostępniaj, aby zapraszać nowe osoby do platformy. | bottom | Partner, Specjalista, Admin | |
| `infolinks-widget` | `[data-tour="infolinks-widget"]` | InfoLinki | Generuj kody OTP dla chronionych treści. Odbiorca wpisuje kod, aby uzyskać czasowy dostęp do materiałów. | bottom | Partner, Specjalista, Admin | |
| `healthy-knowledge-widget` | `[data-tour="healthy-knowledge-widget"]` | Zdrowa Wiedza | Materiały edukacyjne o zdrowiu. Możesz je przeglądać i udostępniać innym za pomocą kodów OTP. | bottom | Partner, Specjalista, Admin | |
| `active-users-widget` | `[data-tour="active-users-widget"]` | Aktywni Użytkownicy | Statystyki aktywności użytkowników platformy. Widoczne tylko dla administratorów. | bottom | Admin | |
| `menu-dashboard` | `[data-tour="menu-dashboard"]` | Strona Główna | Kliknij tutaj, aby wrócić do głównego pulpitu z widgetami. | right | Wszyscy | |
| `menu-news` | `[data-tour="menu-news"]` | Aktualności | Przeglądaj najnowsze wiadomości, ogłoszenia i informacje od zespołu Pure Life. | right | Wszyscy | |
| `menu-events` | `[data-tour="menu-events"]` | Wydarzenia | Tutaj znajdziesz webinary, spotkania zespołu i spotkania indywidualne. Zapisuj się i uczestniczyć online. | right | Wszyscy | |
| `menu-chat` | `[data-tour="menu-chat"]` | Chat / Komunikacja | Wysyłaj i odbieraj wiadomości od zespołu. Tutaj znajdziesz również AI Kompas jeśli jest włączony. | right | Wszyscy | |
| `menu-community` | `[data-tour="menu-community"]` | Społeczność | Linki do grup społecznościowych - WhatsApp, Facebook i inne kanały komunikacji zespołowej. | right | Wszyscy | |
| `menu-settings` | `[data-tour="menu-settings"]` | Ustawienia | Przejdź do ustawień profilu, preferencji powiadomień i innych opcji konfiguracyjnych. | right | Wszyscy | |
| `menu-calculator` | `[data-tour="menu-calculator"]` | Kalkulator | Narzędzie kalkulacyjne dla influencerów i specjalistów. Oblicz potencjalne zarobki i strukturę zespołu. | right | Uprawnieni | |
| `menu-admin` | `[data-tour="menu-admin"]` | Panel Administracyjny | Pełna kontrola nad platformą - użytkownicy, szkolenia, zasoby, powiadomienia i ustawienia systemowe. | right | Admin | |
| `tutorial-button` | `[data-tour="tutorial-button"]` | Przycisk Samouczka | Kliknij tę ikonkę pomocy w dowolnym momencie, aby ponownie uruchomić samouczek. | bottom | Wszyscy | |
| `language-selector` | `[data-tour="language-selector"]` | Wybór Języka | Zmień język interfejsu platformy. Dostępne języki: Polski i Angielski. | bottom | Wszyscy | |
| `theme-selector` | `[data-tour="theme-selector"]` | Motyw Kolorystyczny | Przełącz między trybem jasnym, ciemnym lub automatycznym (zgodnym z ustawieniami systemu). | bottom | Wszyscy | |
| `api-sync` | `[data-tour="user-menu-api"]` | Synchronizacja API | Połącz swój Google Calendar, aby automatycznie synchronizować wydarzenia z platformą. | left | Wszyscy | requiresDropdownOpen |

---

## Pliki do modyfikacji

### 1. Dodanie atrybutów `data-tour` do widgetów

| Plik | Zmiana |
|------|--------|
| `MyMeetingsWidget.tsx` | Dodaj `data-tour="my-meetings-widget"` do Card |
| `TrainingProgressWidget.tsx` | Dodaj `data-tour="training-widget"` do Card |
| `NotificationsWidget.tsx` | Dodaj `data-tour="notifications-widget"` do Card |
| `CombinedOtpCodesWidget.tsx` | Dodaj `data-tour="otp-codes-widget"` do Card |
| `ResourcesWidget.tsx` | Dodaj `data-tour="resources-widget"` do Card |
| `TeamContactsWidget.tsx` | Dodaj `data-tour="team-contacts-widget"` do Card |
| `ReflinksWidget.tsx` | Dodaj `data-tour="reflinks-widget"` do Card |
| `InfoLinksWidget.tsx` | Dodaj `data-tour="infolinks-widget"` do Card |
| `HealthyKnowledgeWidget.tsx` | Dodaj `data-tour="healthy-knowledge-widget"` do Card |
| `ActiveUsersWidget.tsx` | Dodaj `data-tour="active-users-widget"` do Card |

### 2. Dodanie atrybutów do Topbar

| Plik | Zmiana |
|------|--------|
| `DashboardTopbar.tsx` | Dodaj `data-tour="language-selector"` do LanguageSelector |
| `DashboardTopbar.tsx` | Dodaj `data-tour="theme-selector"` do ThemeSelector |
| `LanguageSelector.tsx` | Opakuj w div z `data-tour="language-selector"` |
| `ThemeSelector.tsx` | Opakuj w div z `data-tour="theme-selector"` |

### 3. Aktualizacja `tourSteps.ts`

Rozszerzenie tablicy `tourSteps` o nowe kroki z odpowiednimi:
- `targetSelector` 
- `title` i `description` (po polsku)
- `position` (top/bottom/left/right)
- `visibleFor` (role-based visibility)
- `scrollTo` (dla widgetów poniżej fold)
- `requiresDropdownOpen` (dla elementów w dropdown)

---

## Kolejność kroków samouczka

### Proponowana optymalna kolejność (logiczny flow):

```text
1.  welcome-widget         - Powitanie i orientacja
2.  sidebar                - Wprowadzenie do nawigacji
3.  menu-dashboard         - Link do pulpitu
4.  calendar-widget        - Kalendarz wydarzeń
5.  my-meetings-widget     - Lista spotkań użytkownika
6.  training-widget        - Postęp w szkoleniach
7.  notifications-widget   - Widget powiadomień
8.  otp-codes-widget       - Kody OTP (Partner+)
9.  resources-widget       - Najnowsze zasoby
10. team-contacts-widget   - Kontakty (Partner+)
11. menu-academy           - Link do akademii
12. menu-healthy-knowledge - Zdrowa Wiedza (Partner+)
13. menu-resources         - Zasoby/Biblioteka
14. menu-pureContacts      - PureKontakty (Partner+)
15. menu-reflinks          - PureLinki (Partner+)
16. menu-infolinks         - InfoLinki (Partner+)
17. menu-news              - Aktualności
18. menu-events            - Wydarzenia
19. notifications-bell     - Dzwonek powiadomień
20. tutorial-button        - Przycisk samouczka
21. language-selector      - Wybór języka
22. theme-selector         - Motyw
23. user-avatar            - Avatar użytkownika
24. user-menu-account      - Moje Konto (dropdown)
25. user-menu-tools        - Panel narzędziowy (dropdown)
26. menu-support           - Wsparcie techniczne
27. footer-section         - Stopka
```

### Liczba kroków według roli:

| Rola | Liczba kroków |
|------|---------------|
| Klient | 18 kroków |
| Partner/Specjalista | 25 kroków |
| Admin | 27 kroków |

---

## Podsumowanie techniczne

### Zmiany w kodzie:

1. **10 widgetów** - dodanie atrybutu `data-tour`
2. **2 komponenty topbar** - dodanie `data-tour` do selektorów
3. **1 plik tourSteps.ts** - rozszerzenie o ~13 nowych kroków
4. **Sidebar** - już ma dynamiczne `data-tour="menu-${item.id}"`

### Estymacja:

- Dodanie atrybutów: ~30 minut
- Nowe kroki w tourSteps.ts: ~45 minut
- Testowanie wszystkich ról: ~30 minut

### Korzyści:

- Użytkownik pozna WSZYSTKIE funkcje dashboardu
- Każda rola widzi tylko odpowiednie dla siebie kroki
- Logiczna kolejność prowadzi przez interfejs
- Łatwe ponowne uruchomienie przez ikonkę pomocy
