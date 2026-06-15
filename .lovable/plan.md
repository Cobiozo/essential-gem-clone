# Audyt: Sylwia Ha — bilet na ŁÓDŹ + certyfikat z Akademii

## Wynik audytu — zasięg

| Problem | Czy dotyczy tylko Sylwii? | Skala |
|---|---|---|
| Brak aktywnego przycisku „Zapisz się" na wydarzenie w Łodzi | Najprawdopodobniej **TAK – tylko jej widok** (problem konfiguracyjno-sesyjny, nie kod) | 1 osoba |
| Brak możliwości wygenerowania certyfikatu po ukończonym module | **NIE – problem szeroki** | **33 użytkowników** ma 100% ukończony moduł z `certificate_enabled=true` i brak wpisu w `certificates` |

---

## 1) Bilet na wydarzenie w Łodzi

### Dane z bazy
- Użytkownik: Sylwia Ha (`ec2f1ab4-…`), rola: **partner**, e-mail `1978usmiechnieta@gmail.com`.
- Istnieją **dwa** wydarzenia z „ŁÓDŹ" w tytule:
  - `bom-lodz` (id `11664836…`) — **is_active=false, is_published=false** (szkic).
  - `business-opportunity-meeteing-lodz` (id `ce927eb5…`) — aktywne i opublikowane, 04.07.2026, 155 miejsc, sprzedane 0.
- Sylwia **nie ma żadnej rezerwacji** ani zamówienia na żadne z tych wydarzeń (`paid_event_orders`, `paid_event_order_attendees`, `event_form_submissions` — wszystkie puste).
- Bilety dla aktywnego eventu: `Bilet Wejściowy` (audience `logged_in`, 2000 PLN, aktywny) + `Bilet Wejściowy` (audience `guest_only`, 0 PLN).
- Reguła „jedna rezerwacja na osobę" **nie powinna jej blokować** — RPC `get_my_event_orders` zwróci pustą tablicę.

### Możliwe (najbardziej prawdopodobne) przyczyny po stronie jej widoku
1. **Otwiera szkic** `bom-lodz` (niepublikowany) — wtedy sidebar pokazuje „Rejestracja niedostępna" bo nie ma aktywnych biletów dla zwykłego użytkownika.
2. **Stan ładowania** `alreadyRegisteredLoading` zawiesza się — przycisk jest wtedy wyłączony z napisem „Sprawdzam rezerwację…". Może się zdarzyć, gdy w trakcie sprawdzania kontekst (`rolesReady`) miga, albo gdy zapytanie RPC odpada (offline / wygasły token).
3. **Cache po wcześniejszej rezerwacji innego użytkownika na tej samej przeglądarce** (klucz `has-own-event-ticket` z poprzedniego konta) — nasz hook bierze `user?.id` do klucza, więc to mało prawdopodobne, ale możliwe jeśli ktoś korzystał z trybu współdzielonego.

### Co potwierdza dane są poprawne
- W bazie nie ma żadnego śladu, że ten przycisk powinien być wyłączony „regułowo".
- Inne konta partnerskie na tym evencie nie zgłaszały blokady (brak innych zamówień w ogóle).

### Rekomendacja
- Poprosić Sylwię o zrzut ekranu URL strony wydarzenia oraz konsoli przeglądarki (jeśli zalogowana — `Sprawdzam rezerwację…` vs `Rejestracja niedostępna` vs aktywny CTA).
- Defensywnie: w `useHasOwnEventTicket` dodać **twardy timeout** (np. 8 s) — jeśli RPC nie odpowie, traktować jak „brak rezerwacji" zamiast trzymać przycisk wyłączony. To uchroni przed scenariuszem 2 dla wszystkich.
- Sprawdzić, czy szkic `bom-lodz` nie wycieka linkiem do listy (jeżeli tak — naprawić filtr `is_published`).

---

## 2) Certyfikaty po ukończonych szkoleniach

### Dane z bazy dla Sylwii
- Moduły aktywne z `certificate_enabled=true`, w których ma **100% lekcji**:
  - `SZYBKI START` (13/13) — certyfikat **JEST** (status: `downloaded-and-deleted`, czyli już raz pobrany).
  - `PRODUKTOWE` (19/19) — **brak certyfikatu**, mimo że ukończony 26.05.2026 i ma `training_assignment.is_completed=true`.
- Szablon dla PRODUKTOWE istnieje: `PureLife - SZKOLENIE PRODUKTOWE`, `language_code='pl'`, `roles={admin,partner}` — pasuje do jej profilu.

### Szerokość problemu
- Zapytanie kontrolne: **33 użytkowników** ukończyło co najmniej jeden moduł kwalifikujący do certyfikatu i **nie mają wpisu** w `certificates`.
- Najczęściej dotknięte moduły: `SZYBKI START`, `PRODUKTOWE`, `SPRZEDAŻOWE`, `NIEZBĘDNIK KLIENTA`, `PLAN MARKETINGOWY`.

### Diagnoza techniczna
- Generowanie odbywa się **klient-side** przez `useCertificateGeneration` po kliknięciu „Wygeneruj" w `src/pages/Training.tsx` (linia 919).
- Przycisk „Wygeneruj" pokazuje się tylko gdy `progress===100 && !has_new_lessons && certificate_enabled !== false && !hasCertificate`. Dla Sylwii w PRODUKTOWE wszystkie warunki są spełnione → przycisk **powinien być widoczny**.
- Edge function `auto-generate-certificate` **nie jest wywoływana z żadnego miejsca w kodzie** (`grep` po całym `src` zwraca 0 wywołań). Tzn. nie ma żadnej automatyki, która wystawiłaby certyfikat w momencie ukończenia ostatniej lekcji — użytkownik **musi sam** świadomie kliknąć „Wygeneruj".
- Część z tych 33 użytkowników mogła ukończyć szkolenie zanim w UI pojawiła się sekcja „Certyfikat dostępny do wygenerowania" (np. po zmianach w kafelkach modułów), albo klika i widzi błąd (np. „Brak szablonu", problem z fontem, problem z uploadem do bucketa `certificates`) — to wymaga jeszcze zebrania logów dla 1–2 przypadków.

### Plan naprawczy

#### A. Krótkoterminowo — odblokować Sylwię i pozostałe 32 osoby
1. **Pokazać sekcję „Certyfikat dostępny do wygenerowania" w sposób bardziej widoczny** (np. „Twój certyfikat czeka — kliknij, by wygenerować") na kafelku modułu — wielu użytkowników może jej po prostu nie zauważać.
2. **Zalogować błędy z `useCertificateGeneration`** do `admin_activity_log` lub do tabeli `email_logs`-podobnej dla certyfikatów, by zobaczyć, na czym wywala się generowanie u realnych użytkowników. Obecnie błąd ląduje tylko w toast/console.

#### B. Średnioterminowo — automatyzacja (zgodnie z istniejącą edge function)
3. **Podpiąć `auto-generate-certificate`** do momentu ukończenia ostatniej lekcji modułu w `useTrainingProgress` (po `is_completed=true`, gdy ostatnia lekcja modułu została zaliczona). To zlikwiduje konieczność klikania „Wygeneruj".
4. **Backfill jednorazowy** — przejść po 33 użytkownikach (lista jest powyżej) i albo poinformować ich powiadomieniem „Twój certyfikat z modułu X czeka na pobranie", albo wykonać masowe wygenerowanie po stronie admina (przycisk „Wygeneruj brakujące" w `TrainingManagement.tsx`, który już ma funkcję `regenerateCertificateAdmin`).

#### C. Konkretnie dla Sylwii teraz
5. **Administrator** może wygenerować jej certyfikat z PRODUKTOWE poprzez panel admina → Szkolenia → użytkownik Sylwia → moduł PRODUKTOWE → „Regeneruj certyfikat". To zadziała natychmiast, nie wymaga zmian w kodzie.

---

## Co dalej

Po Twojej decyzji mogę:
- (a) wdrożyć **A + B** (UX + automatyczne wystawianie certyfikatu po ukończeniu modułu + masowy backfill dla 33 osób),
- (b) tylko **A** (lepsza widoczność przycisku + logowanie błędów) i odłożyć automatyzację,
- (c) dopisać twardy timeout do hooka rezerwacji eventów (defensywna naprawa potencjalnego scenariusza 2 z części 1).

Daj znać, który zakres mam zaplanować do realizacji.
