

# Audyt i modernizacja samouczka

## Wykryte problemy

1. **Krok "Ostatnie Powiadomienia" (`notifications-widget`)** — odwołuje się do widgetu, który **NIE ISTNIEJE** na dashboardzie. Widget nie jest importowany ani renderowany w `Dashboard.tsx`. Ten krok zawsze się pomija (element not found → skip).
2. **Brak strzałki** wskazującej z tooltipa na podświetlony element — użytkownik nie wie dokąd patrzeć.
3. **Nielogiczna kolejność kroków** — skacze z widgetów do menu, potem z powrotem do paska górnego. Powinno iść: pasek górny → widgety (z góry na dół) → menu boczne → stopka.
4. **Brak kroku dla paska informacyjnego (News Ticker)** — który jest widoczny na dashboardzie.
5. **Brak kroku dla widgetów ReflinksWidget i InfoLinksWidget** na dashboardzie.
6. **Opisy są ogólnikowe** — np. "Widget pokazuje Twój postęp" zamiast konkretnych instrukcji.

## Plan zmian

### 1. Dodanie strzałki wskazującej (TourTooltip.tsx + TourOverlay.tsx)

Dodanie SVG strzałki między tooltipem a podświetlonym elementem. Strzałka będzie:
- Rysowana jako krzywa SVG z grotem
- Automatycznie dopasowana do pozycji tooltipa (`top`/`bottom`/`left`/`right`)
- Koloru `primary` z animacją pulsowania
- Renderowana w warstwie overlay, między ciemnym tłem a tooltipem

Nowy komponent `TourArrow.tsx` otrzymuje `tooltipRect`, `highlightRect` i `position` — rysuje krzywą Beziera z grotu do elementu.

### 2. Aktualizacja kroków (tourSteps.ts)

**Nowa kolejność (logiczna, z góry na dół):**

```
PASEK GÓRNY (od lewej do prawej):
1. Menu nawigacyjne (sidebar)
2. Dzwonek powiadomień
3. Wybór języka
4. Przycisk samouczka
5. Motyw kolorystyczny
6. Avatar / Menu użytkownika
7. Moje Konto (dropdown)
8. Panel narzędziowy (dropdown)

WIDGETY DASHBOARDU (kolejność renderowania):
9.  Widget powitalny (z zegarem i datą)
10. Pasek informacyjny (News Ticker)
11. Kalendarz
12. Twoje Spotkania
13. Postęp Szkolenia
14. Kody OTP (partner/admin)
15. Najnowsze Zasoby
16. Kontakty Zespołowe (partner/admin)
17. PureLinki (partner/admin)
18. InfoLinki (partner/admin)
19. Zdrowa Wiedza (partner/admin)

MENU BOCZNE (sekcje):
20. Strona Główna
21. Akademia
22. Zdrowa Wiedza (menu)
23. Zasoby
24. PureKontakty
25. PureLinki (menu)
26. InfoLinki (menu)
27. Aktualności
28. Wydarzenia
29. Wsparcie

STOPKA:
30. Stopka z kontaktem
```

**Usunięty:** krok `notifications-widget` (widget nie istnieje na dashboardzie).

**Dodane nowe kroki:**
- Pasek informacyjny (News Ticker) — `data-tour="news-ticker"` na kontenerze w WelcomeWidget
- Widget ReflinksWidget — `data-tour="reflinks-widget"` (już istnieje)
- Widget InfoLinksWidget — `data-tour="infolinks-widget"` (już istnieje)

### 3. Dodanie brakujących `data-tour` atrybutów

- `WelcomeWidget.tsx` — dodać `data-tour="news-ticker"` na kontenerze News Ticker

### 4. Poprawione opisy

Każdy krok dostanie bardziej precyzyjny opis mówiący **co dokładnie** użytkownik może tam zrobić, np.:
- "Kliknij dzwonek, aby zobaczyć listę powiadomień. Czerwona kropka oznacza nieprzeczytane wiadomości."
- "Pasek informacyjny pokazuje na żywo aktywność na platformie: kto ukończył szkolenie, zdobył certyfikat lub dołączył do zespołu."

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/onboarding/tourSteps.ts` | Nowa kolejność, usunięcie nieistniejącego kroku, dodanie nowych kroków, lepsze opisy |
| `src/components/onboarding/TourArrow.tsx` | **Nowy** — komponent strzałki SVG |
| `src/components/onboarding/TourTooltip.tsx` | Przekazanie ref tooltipa do obliczenia pozycji strzałki |
| `src/components/onboarding/TourOverlay.tsx` | Renderowanie `TourArrow` między overlay a tooltipem |
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | Dodanie `data-tour="news-ticker"` |

