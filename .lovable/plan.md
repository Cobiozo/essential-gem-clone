

# Modernizacja systemu zaliczania lekcji i szkoleń

## Obecne problemy

Obecny system jest **nadmiernie skomplikowany**, co powoduje ciągłe problemy:

1. **Zaliczanie oparte na pozycji wideo** — system porównuje `videoPosition >= videoDuration`, co jest zawodne (iOS PWA nie zawsze raportuje dokładny czas, użytkownik może przewinąć, duration może być 0)
2. **Ciągły auto-save co 5 sekund** — generuje dziesiątki zapisów do bazy, tworzy wyścigi stanów (race conditions), powoduje cofanie `is_completed`
3. **Dwa różne mechanizmy nawigacji** — "Następna lekcja" zawsze zalicza, ale kliknięcie w sidebar wymaga zaliczenia poprzedniej — niespójne
4. **1624 linii kodu** w jednym pliku — trudne do utrzymania i debugowania
5. **Blokady lekcji** — użytkownicy nie mogą przeglądać wcześniejszych lekcji swobodnie

## Proponowane rozwiązanie: System z jawnym przyciskiem zaliczenia

### Główna zmiana koncepcyjna

Zamiast automatycznego śledzenia czasu wideo → **użytkownik sam klika "Zalicz lekcję"** po obejrzeniu materiału. Przycisk jest aktywny dopiero po spełnieniu warunku minimalnego czasu.

```text
OBECNY FLOW:
Wideo → auto-track co 5s → videoPos >= duration? → auto-complete
         ↓ problem: wyścig stanów, iOS bugs, cofanie statusu

NOWY FLOW:
Wideo → track czas (lekko) → przycisk "Zalicz" aktywny po X% → klik → zapis JEDNORAZOWY
         ↓ prostsze: jeden zapis, brak cofania, jasna intencja
```

### Szczegóły zmian

#### 1. Nowy przycisk "Zalicz lekcję" (TrainingModule.tsx)

- Pod wideo/treścią pojawia się duży, widoczny przycisk **"Zalicz lekcję ✓"**
- Przycisk jest **nieaktywny (disabled)** dopóki użytkownik nie spędzi minimum 80% czasu wideo LUB min_time_seconds
- Po kliknięciu: **jeden zapis do bazy** z `is_completed = true`
- Lekcja już zaliczona: przycisk zamienia się na badge "Zaliczone ✓" (zielony)
- **Eliminuje** potrzebę auto-save postępu co 5 sekund

#### 2. Uproszczony zapis postępu

- **Usunięcie** ciągłego auto-save co 5 sekund (`saveTimeoutRef`, debounce logic)
- **Zachowanie** jedynie: zapis pozycji wideo przy `visibilitychange` (tło) i `beforeunload` (zamknięcie) — tylko pozycja do wznowienia, BEZ zmiany `is_completed`
- **Usunięcie** logiki `saveProgressWithPosition` która decyduje o `is_completed` na podstawie czasu — teraz jedynym źródłem zaliczenia jest kliknięcie przycisku

#### 3. Swobodna nawigacja między lekcjami

- Usunięcie blokad (Lock) — użytkownik może **przeglądać dowolną lekcję** w module
- Sidebar jasno pokazuje status: ✓ zaliczona, ● w trakcie, ○ nierozpoczęta
- Przycisk "Następna lekcja" wymaga zaliczenia bieżącej (przycisk "Zalicz" musi być kliknięty)
- Użytkownik nie jest zmuszany do oglądania lekcji od początku po powrocie

#### 4. Uproszczony warunek aktywacji przycisku

```text
Warunek aktywacji "Zalicz lekcję":
- Wideo: obejrzano ≥ 80% czasu trwania (nie 100% — tolerancja na iOS)
- Tekst: spędzono ≥ min_time_seconds na stronie
- Brak mediów/czas = 0: przycisk od razu aktywny
```

Zmiana z 100% na 80% rozwiązuje problem iOS, gdzie wideo często nie raportuje ostatnich sekund.

#### 5. Panel admina — nowa kolumna "Metoda zaliczenia"

W ustawieniach lekcji w CMS administrator będzie mógł wybrać:
- **Automatyczne** (po 80% wideo) — przycisk aktywuje się automatycznie
- **Ręczne** — przycisk "Zalicz" zawsze aktywny (dla materiałów do przeczytania)

### Pliki do zmiany

| Plik | Co się zmienia |
|------|---------------|
| `src/pages/TrainingModule.tsx` | Dodanie przycisku "Zalicz lekcję", usunięcie auto-save co 5s, usunięcie blokad lekcji, uproszczenie `saveProgressWithRetry` |
| `src/pages/Training.tsx` | Bez zmian — strona główna modułów pozostaje taka sama |
| `src/components/SecureMedia.tsx` | Bez zmian — odtwarzacz pozostaje taki sam |
| SQL Migration | Dodanie kolumny `completion_method` do `training_lessons` (enum: 'auto', 'manual', default 'auto') |

### Czego NIE zmieniamy

- Sekwencyjne odblokowywanie **modułów** (unlock_order) — zostaje
- System certyfikatów — zostaje
- Trigger `protect_training_completion` — zostaje jako safety net
- Trigger `auto_complete_training_assignment` — zostaje
- Tłumaczenia lekcji — zostają
- Notatki do wideo — zostają

### Podsumowanie korzyści

1. **Dla użytkownika**: Jasny, widoczny przycisk zamiast "magicznego" auto-zaliczenia. Swobodna nawigacja.
2. **Dla admina**: Mniej zgłoszeń o cofaniu się postępów. Kontrola nad metodą zaliczenia.
3. **Technicznie**: ~300 linii mniej kodu. Jeden punkt zapisu zamiast wielu. Brak race conditions.
4. **iOS PWA**: 80% próg eliminuje problem z brakującymi ostatnimi sekundami wideo.

