

## Audyt Akademii — Pełny obraz

---

### A. ARCHITEKTURA I STABILNOŚĆ

#### 1. System postępu i zaliczania lekcji

**Obecny stan:** Solidny, wielowarstwowy system z 3 poziomami zabezpieczeń:
- **Warstwa 1:** Trigger bazodanowy `auto_complete_training_assignment` — automatycznie oznacza moduł jako ukończony gdy wszystkie lekcje zaliczone
- **Warstwa 2:** Klient (`goToNextLesson`) — ręcznie aktualizuje `training_assignments` po ostatniej lekcji
- **Warstwa 3:** `saveProgressWithRetry` — dodatkowa redundancja przy każdym zapisie

**Wykryte problemy:**

| # | Problem | Waga | Opis |
|---|---------|------|------|
| 1 | **N+1 queries w Training.tsx** | Wydajność | `fetchTrainingModules` wykonuje `Promise.all` z osobnym zapytaniem na lekcje i postęp **dla każdego modułu** (linie 406-457). Przy 10 modułach = 20+ zapytań. Powinno być 2 zapytania batch. | 
| 2 | **Duplikacja obliczeń postępu** | Spójność | `TrainingProgressWidget.tsx` oblicza postęp inaczej niż `Training.tsx` — widget filtruje lekcje po `certDate`, a strona główna nie. Może prowadzić do rozbieżności 95% vs 100%. |
| 3 | **Brak completed_at przy upsert** | Dane | W `saveProgressWithRetry` (linia 641): `completed_at: isCompleted ? new Date().toISOString() : null` — jeśli lekcja była wcześniej completed i save uruchomi się ponownie (np. z backup localStorage), `completed_at` zostanie nadpisany na nową datę. Ochrona `wasAlreadyCompleted` jest tylko w `saveProgressWithPosition`, ale nie w `saveProgressWithRetry` bezpośrednio. |
| 4 | **Race condition przy szybkiej nawigacji** | Stabilność | `isTransitioningRef` blokuje zapis, ale `setTimeout(..., 100)` do resetu jest arbitralny. Przy wolnym połączeniu zapis z poprzedniej lekcji może wciąż trwać po 100ms. |
| 5 | **localStorage backup sync — brak limit** | Stabilność | `syncAllLocalBackups` (linia 325-383) iteruje po WSZYSTKICH lekcjach modułu synchronicznie. Przy 50 lekcjach i wielu backup'ach = masywne opóźnienie ładowania. |
| 6 | **Hardcoded anon key w fetch** | Bezpieczeństwo | Linia 595: klucz API jest wpisany bezpośrednio w kodzie fetch `beforeunload`. Powinien używać zmiennej środowiskowej. |

#### 2. System sekwencyjnego odblokowywania

**Obecny stan:** Działa poprawnie — moduły z `unlock_order` są blokowane dopóki poprzedni nie osiągnie 100%. Logika walidacji istnieje zarówno na liście modułów jak i przy bezpośrednim wejściu w URL.

**Wykryte problemy:**

| # | Problem | Waga | Opis |
|---|---------|------|------|
| 7 | **Brak walidacji po stronie serwera** | Bezpieczeństwo | Blokada sekwencyjna jest WYŁĄCZNIE po stronie klienta. Użytkownik może ominąć ją wpisując URL `/training/{module_id}` i manipulując warunki. RLS na `training_lessons` nie sprawdza unlock_order. |
| 8 | **N+1 przy sprawdzaniu locka** | Wydajność | W `TrainingModule.tsx` (linie 244-276): dla każdego poprzedniego modułu w sekwencji wykonywane jest osobne zapytanie na lekcje + postęp. |

#### 3. Certyfikaty

**Obecny stan:** Generowanie, regeneracja z 24h cooldown, email — działa dobrze.

**Drobny problem:** Brak walidacji server-side czy użytkownik faktycznie ukończył 100% przed wygenerowaniem certyfikatu (walidacja jest w `useCertificateGeneration` ale po stronie klienta).

---

### B. RESPONSYWNOŚĆ MOBILNA

**Obecny stan:** Dobrze zaadresowana — osobne widoki mobile/desktop dla listy lekcji (Collapsible na mobile, stała kolumna na desktop).

**Wykryte problemy:**

| # | Problem | Waga | Opis |
|---|---------|------|------|
| 9 | **Collapsible domyślnie zamknięty** | UX | Mobile: lista lekcji jest `defaultOpen={false}` (linia 1346). Użytkownik nie widzi postępu na pierwszy rzut oka. Powinien być otwarty domyślnie lub wyświetlać mini-progress bar. |
| 10 | **Video max-height ograniczony** | UX | `max-h-[50vh]` na mobile (linia 1535) — na małych ekranach (iPhone SE) wideo jest bardzo małe. Powinno być `max-h-[40vh]` na mobile, `60-70vh` na desktop. |
| 11 | **Kontrolki wideo — brak volume** | UX | `SecureVideoControls` nie ma kontroli głośności. Na mobile nie jest to problem (systemowa), ale na desktopie brakuje. |
| 12 | **Przyciski nawigacji — zbyt małe etykiety** | UX | "Poprzednia"/"Następna" mają `min-h-[44px]` (dobrze), ale na wąskich ekranach tekst + ikona się ciasno mieści. |

---

### C. PROPOZYCJE UDOSKONALEŃ

| # | Propozycja | Priorytet | Opis |
|---|-----------|-----------|------|
| A | **Batch queries zamiast N+1** | Wysoki | Zamienić pętlę `Promise.all(modulesData.map(...))` na 2 zapytania: jedno na wszystkie lekcje, jedno na cały postęp użytkownika. Redukcja z ~20 zapytań do 2-3. |
| B | **Offline progress queue** | Średni | Zamiast localStorage backup z ręcznym sync, użyć dedykowanej kolejki (`IndexedDB` lub structured localStorage queue) z automatycznym retry przy powrocie online. |
| C | **Server-side unlock validation** | Wysoki | Dodać RLS policy lub database function weryfikującą unlock_order przed dostępem do lekcji modułu. |
| D | **Progress resumption indicator** | Niski | Na mobile przy wejściu w moduł wyświetlić mini-toast "Kontynuujesz od lekcji 3/8" zamiast cicho przeskakiwać. |
| E | **Ujednolicenie kalkulacji postępu** | Wysoki | Widget dashboardowy i strona Training powinny używać tej samej funkcji/hooka do obliczania procentowego postępu, eliminując rozbieżności. |
| F | **Preload następnej lekcji** | Niski | Przy 80% postępu bieżącej lekcji wideo, zacząć preload metadanych (nie treści) następnej lekcji. |

---

### D. PODSUMOWANIE

**Co działa dobrze:**
- Wielowarstwowy system zapisu (DB trigger + klient + localStorage backup)
- Ochrona przed cofnięciem statusu completed (irreversible completion)
- Responsywny layout z osobnymi widokami mobile/desktop
- Sekwencyjne odblokowywanie z filtrem po języku
- Tłumaczenia modułów i lekcji
- Retry z exponential backoff przy zapisie
- Race condition guards (isTransitioningRef, currentLessonIdRef)

**Co wymaga poprawy (priorytetowo):**
1. **N+1 queries** — natychmiastowy wpływ na wydajność
2. **Ujednolicenie kalkulacji postępu** — spójność danych
3. **Server-side unlock validation** — bezpieczeństwo
4. **Hardcoded API key** — higiena kodu
5. **Mobile UX drobnostki** — Collapsible, video sizing

