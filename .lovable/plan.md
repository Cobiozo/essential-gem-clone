# Awaria logowania — baza danych przeciążona

## Co pokazują logi (zweryfikowane)

Zrzut z konsoli to skutek, nie przyczyna. Logi Supabase z ostatniej godziny potwierdzają:

- Logowanie (`/token`) kończy się masowo błędami `504 (context deadline exceeded)` oraz `500: error finding user / refresh token: context canceled`.
- W logach bazy: seria `canceling statement due to statement timeout`, `canceling statement due to user request` oraz `FATAL: connection to client lost`.
- Jeden z błędów autoryzacji brzmi: `failed to connect to host=localhost user=supabase_auth_admin ... dial tcp [::1]:5432: operation was canceled` — czyli sama usługa logowania nie mogła nawiązać połączenia z bazą.
- Próby zapytań diagnostycznych z mojej strony również nie przechodzą (pooler nie odpowiada, timeout).

Wniosek: baza danych jest wysycona (brak wolnych połączeń / zapytania przekraczają limit czasu). Wszystkie błędy 500/504 na `rest` i `auth` są tego następstwem. To nie jest błąd w kodzie strony logowania.

Przyczyna źródłowa (które zapytania zajmują bazę) jest na ten moment **niepotwierdzona** — nie da się jej ustalić, dopóki baza nie zacznie odpowiadać na zapytania diagnostyczne.

## Plan działania

### Krok 1 — Przywrócenie działania (natychmiast)
1. W panelu Supabase sprawdzić stan projektu i wykresy: CPU, RAM, liczba połączeń, dysk. Jeśli projekt jest w stanie przeciążenia — wykonać restart instancji bazy (Settings → Database → Restart).
2. Po restarcie potwierdzić, że logowanie na `purelifecenter.pl` działa i że w logach auth znikły statusy 504.

### Krok 2 — Ustalenie przyczyny (po odzyskaniu dostępu do bazy)
Dopiero gdy baza odpowiada, sprawdzam:
- listę aktywnych i długo trwających zapytań (`pg_stat_activity`),
- ranking najcięższych zapytań (`pg_stat_statements`) — czas łączny i średni,
- liczbę i źródło otwartych połączeń (aplikacja vs. funkcje edge vs. zadania cykliczne),
- czy w tym samym oknie czasowym nie ruszyło zadanie cykliczne (przypomnienia, czyszczenie danych, synchronizacja kalendarza), które zablokowało bazę.

Wynik tego kroku to jedna konkretna, wskazana z nazwy przyczyna — nie lista domysłów.

### Krok 3 — Naprawa celowana
W zależności od tego, co wykaże krok 2, jedno z:
- dodanie brakującego indeksu pod zapytanie, które skanuje całą tabelę,
- poprawa lub przesunięcie w czasie zadania cyklicznego, które kumuluje obciążenie,
- ograniczenie równoległych zapytań z aplikacji w newralgicznym momencie (np. wejście na pulpit),
- jeśli winne jest realne obciążenie ruchem, a nie błąd — rekomendacja zwiększenia mocy instancji bazy.

### Krok 4 — Zabezpieczenie na przyszłość
- Odporniejsza obsługa nieudanego logowania w aplikacji: czytelny komunikat „chwilowy problem z serwerem, spróbuj ponownie" zamiast pustego ekranu, oraz ograniczenie automatycznego ponawiania żądań, które przy awarii dokłada obciążenia.
- Ustalenie progu alertu, gdy zapytania zaczną przekraczać limit czasu.

## Uwagi techniczne
- Zmiany z kroku 4 dotyczą wyłącznie warstwy klienta (obsługa błędów sesji i logowania) — bez zmian w logice biznesowej.
- Kroki 1 i 2 wymagają dostępu do panelu Supabase; kroku 3 nie planuję „w ciemno" przed danymi z kroku 2.
