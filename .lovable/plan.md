

# Globalna naprawa hardcoded polskich tekstow w calej aplikacji

## Problem

Mimo ustawienia jezyka na angielski (flaga EN), wiele stron nadal wyswietla polskie teksty. Dotyczy to kilkunastu plikow i setek stringow. Dodatkowo w CalendarWidget i MyMeetingsWidget uzyto wzorca `t('key') || 'fallback'` ktory nie dziala (ten sam bug co wczesniej - trzeba zamienic na `tf()`).

## Zakres zmian - po plikach

### GRUPA 1: Kalkulator Specjalisty (specialist-calculator) - 6 plikow

**`src/components/specialist-calculator/ClientSlider.tsx`**
- "Liczba klientow (6-miesieczna kuracja)" -> `tf('calc.spec.clientCount', '...')`
- "osob" -> `tf('calc.spec.people', 'osob')`

**`src/components/specialist-calculator/ResultCards.tsx`**
- "Prowizja (1. miesiac)" -> `tf('calc.spec.commission', '...')`
- "Dochod Pasywny" -> `tf('calc.spec.passiveIncome', '...')`
- "Premia za Przedluzenie" -> `tf('calc.spec.retentionBonus', '...')`
- "Premie Motywacyjne" -> `tf('calc.spec.motivationalBonuses', '...')`
- "za kazdego klienta (start)" -> `tf(...)`
- "Suma za miesiace 2-6" -> `tf(...)`
- "Dodatkowe ... w 4. i 6. miesiaco" -> `tf(...)`
- "Sumowane bonusy za progi klientow" -> `tf(...)`

**`src/components/specialist-calculator/BottomSection.tsx`**
- "Laczny przychod (6 miesiecy)" -> `tf(...)`
- "To estymacja przy zalozeniu..." -> `tf(...)`
- "Srednio miesiecznie:" -> `tf(...)`
- "Struktura przychodu" -> `tf(...)`
- "Start (Miesiac 1)" -> `tf(...)`
- "Pasywny (Mies. 2-6)" -> `tf(...)`
- "Bonusy (Wolumen + Retention)" -> `tf(...)`
- "Wskazowka: Przy ... klientow przekraczasz..." -> `tf(...)` z interpolacja

**`src/components/specialist-calculator/IncomeChart.tsx`**
- "Prowizja", "Pasywny", "Przedluzenie", "Premie" (nazwy na wykresie)
- "Struktura przychodu" (tytul)
- "Kwota" (tooltip)

**`src/components/specialist-calculator/ThresholdProgress.tsx`**
- "Premie motywacyjne" -> `tf(...)`
- "Maksymalny poziom!" -> `tf(...)`
- "klientow" -> `tf(...)`
- "Poziom X" / "Poziom startowy" -> `tf(...)`
- "zdobyte" -> `tf(...)`
- "Aktualny poziom" -> `tf(...)`
- "Brakuje:" -> `tf(...)`

**`src/components/specialist-calculator/FranchiseUpsell.tsx`**
- "Myslisz o wiekszej skali?" -> `tf(...)`
- Caly paragraf o franczyzie -> `tf(...)`
- "Zapytaj o Franczyze" -> `tf(...)`

**`src/components/specialist-calculator/SpecialistCalculator.tsx`**
- "Blad" -> `tf(...)`
- "Nie udalo sie zaladowac ustawien kalkulatora..." -> `tf(...)`

### GRUPA 2: Kalkulator Influencera (calculator) - 6 plikow

**`src/components/calculator/ParametersPanel.tsx`**
- "Parametry" -> `tf('calc.inf.parameters', '...')`
- "Liczba Obserwujacych / Baza kontaktow" -> `tf(...)`
- "Szacowana Konwersja (%)" -> `tf(...)`
- "Pozyskanych Klientow" -> `tf(...)`
- Formatowanie "tys." / "mln" -> `tf(...)`

**`src/components/calculator/TotalResultCard.tsx`**
- "Szacowany przychod calkowity (6 miesiecy)" -> `tf(...)`
- "klientow z ... mozliwych" -> `tf(...)`
- "*Zalozenie minimalnej stawki..." -> `tf(...)`

**`src/components/calculator/IncomeBreakdown.tsx`**
- "Struktura przychodu" -> `tf(...)`
- "Prowizja Startowa", "Dochod Pasywny", "Premie za przedluzenia", "Premie Motywacyjne" -> `tf(...)`

**`src/components/calculator/VolumeBonusProgress.tsx`**
- "Bonusy Wolumenowe" -> `tf(...)`
- "Suma bonusow" -> `tf(...)`
- "klientow" -> `tf(...)`
- "tys." -> `tf(...)`
- "Maksymalny prog osiagniety!" -> `tf(...)`

**`src/components/calculator/ResultsPanel.tsx`**
- "Szacowane zarobki" -> `tf(...)`
- "Prowizja bezposrednia", "Bonus wolumenowy", "Dochod pasywny", "Bonusy przedluzen" -> `tf(...)`
- "Suma" -> `tf(...)`
- "Projekcja roczna" -> `tf(...)`

**`src/components/calculator/FranchiseInfoCard.tsx`**
- "Model Franczyzowy" -> `tf(...)`
- Caly paragraf opisu -> `tf(...)`

### GRUPA 3: Strona Eventow

**`src/pages/PaidEventsListPage.tsx`**
- "Eventy" -> `tf('events.title', 'Eventy')`
- "Platne szkolenia i wydarzenia" -> `tf(...)`
- "Nadchodzace wydarzenia" -> `tf(...)`
- "Zakonczone wydarzenia" -> `tf(...)`
- "Brak zaplanowanych wydarzen" -> `tf(...)`
- "Sprawdz ponownie pozniej" -> `tf(...)`

**`src/components/paid-events/PaidEventCard.tsx`**
- "od" (cena) -> `tf(...)`
- "Online" -> `tf(...)`
- "Lokalizacja" -> `tf(...)`
- "Zostalo X miejsc" -> `tf(...)`
- "Wyprzedane" -> `tf(...)`
- "Zobacz" -> `tf(...)`

### GRUPA 4: Zdrowa Wiedza

**`src/pages/HealthyKnowledge.tsx`**
- "Zdrowa Wiedza" (tytul x2) -> `tf(...)`
- "Materialy edukacyjne o zdrowiu i wellness" -> `tf(...)`
- "Szukaj materialow..." -> `tf(...)`
- "Wszystkie" -> `tf(...)`
- "Podglad" -> `tf(...)`
- "Udostepnij" -> `tf(...)`
- "Wyroznione" -> `tf(...)`
- "Nie znaleziono materialow..." -> `tf(...)`
- "Brak dostepnych materialow" -> `tf(...)`
- "Udostepnij material" (dialog) -> `tf(...)`
- "Wygeneruj kod dostepu..." -> `tf(...)`
- "Kod wazny przez X godzin" -> `tf(...)`
- "Podglad wiadomosci" -> `tf(...)`
- "Link i kod zostana automatycznie uzupelnione..." -> `tf(...)`
- "Anuluj" -> `tf('common.cancel', 'Anuluj')`
- "Generowanie..." -> `tf(...)`
- "Generuj kod i kopiuj" -> `tf(...)`
- "Otworz dokument" -> `tf(...)`
- "wyswietlen" -> `tf(...)`

**`src/types/healthyKnowledge.ts`**
- `CONTENT_TYPE_LABELS` - "Wideo", "Audio", "Dokument", "Obraz", "Tekst" -> nie mozna uzyc tf() w const; przeniesienie do hooka lub komponentu

### GRUPA 5: Widgety Dashboard (bug t() || fallback)

**`src/components/dashboard/widgets/CalendarWidget.tsx`**
- Zamienic `t('events.type.webinar') || 'Webinar'` -> `tf('events.type.webinar', 'Webinar')` (4 miejsca w legendItems)
- Zamienic `t('events.recurring') || 'Cykliczne'` -> `tf('events.recurring', 'Cykliczne')`

**`src/components/dashboard/widgets/MyMeetingsWidget.tsx`**
- Zamienic wszystkie `t('key') || 'fallback'` na `tf('key', 'fallback')` w getEventTypeName (~7 miejsc)
- To samo w confirmach i przyciskach (~5+ miejsc)

### GRUPA 6: Topbar i inne

**`src/components/dashboard/DashboardTopbar.tsx`**
- "Synchronizacja API" -> `tf('nav.apiSync', 'Synchronizacja API')`
- "Panel narzedziowy" -> `tf('nav.toolPanel', 'Panel narzedziowy')`
- "Samouczek" (title attr) -> `tf('nav.tutorial', 'Samouczek')`

**`src/utils/timezoneHelpers.ts`**
- `COMMON_TIMEZONES` labels w polskim ("Polska (CET)", "Wielka Brytania (GMT)", etc.) - to statyczny obiekt. Trzeba zamienic na funkcje ktora przyjmuje `tf` lub zostawic po angielsku (nazwy krajow po polsku nie maja sensu w EN).

### GRUPA 7: Typy/stale

**`src/types/healthyKnowledge.ts`**
- `CONTENT_TYPE_LABELS` - zamiana na funkcje `getContentTypeLabel(type, tf)` lub hook
- `DEFAULT_SHARE_MESSAGE_TEMPLATE` - polskie teksty "Czesc!", "Mam dla Ciebie...", "Pozdrawiam" - zamiana na tf()

## Podejscie techniczne

1. Kazdy komponent importuje `useLanguage` i destrukturyzuje `tf`
2. Wszystkie hardcoded polskie stringi zamieniamy na `tf('klucz', 'polski fallback')`
3. Wzorzec `t('key') || 'fallback'` zamieniamy na `tf('key', 'fallback')`
4. Statyczne obiekty poza komponentami (COMMON_TIMEZONES, CONTENT_TYPE_LABELS) zamieniamy na funkcje przyjmujace `tf` jako parametr, lub przenosimy do wnetrza komponentow
5. Fallbacki zawsze zawieraja oryginalny polski tekst - zachowanie nie pogorszy sie

## Lista plikow do zmiany (22 pliki)

| Plik | Ilosc stringow |
|------|----------------|
| `src/components/specialist-calculator/ClientSlider.tsx` | ~2 |
| `src/components/specialist-calculator/ResultCards.tsx` | ~8 |
| `src/components/specialist-calculator/BottomSection.tsx` | ~10 |
| `src/components/specialist-calculator/IncomeChart.tsx` | ~5 |
| `src/components/specialist-calculator/ThresholdProgress.tsx` | ~8 |
| `src/components/specialist-calculator/FranchiseUpsell.tsx` | ~3 |
| `src/components/specialist-calculator/SpecialistCalculator.tsx` | ~2 |
| `src/components/calculator/ParametersPanel.tsx` | ~5 |
| `src/components/calculator/TotalResultCard.tsx` | ~3 |
| `src/components/calculator/IncomeBreakdown.tsx` | ~5 |
| `src/components/calculator/VolumeBonusProgress.tsx` | ~4 |
| `src/components/calculator/ResultsPanel.tsx` | ~7 |
| `src/components/calculator/FranchiseInfoCard.tsx` | ~2 |
| `src/pages/PaidEventsListPage.tsx` | ~6 |
| `src/components/paid-events/PaidEventCard.tsx` | ~5 |
| `src/pages/HealthyKnowledge.tsx` | ~20 |
| `src/types/healthyKnowledge.ts` | ~7 (CONTENT_TYPE_LABELS + template) |
| `src/components/dashboard/widgets/CalendarWidget.tsx` | ~5 |
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | ~12 |
| `src/components/dashboard/DashboardTopbar.tsx` | ~3 |
| `src/utils/timezoneHelpers.ts` | ~30 (nazwy krajow) |
| `src/pages/HealthyKnowledgePlayer.tsx` | ~3 |

**Lacznie: ~155 hardcoded polskich stringow do zamiany na tf()**

## Uwagi

- Nie ruszamy plikow admin (panel administracyjny moze pozostac po polsku)
- Klucze tlumaczen nie istnieja jeszcze w bazie i18n_translations - ale tf() zapewnia fallback na polski tekst
- Po wdrozeniu tych zmian, tlumaczenia mozna dodawac stopniowo do bazy danych
- Strefy czasowe (timezoneHelpers) - zamienimy na funkcje `getTimezoneOptions(tf)` ktora zwraca przetlumaczone nazwy krajow

