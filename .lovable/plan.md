## Dlaczego widać „Brak" przy Szybkim Starcie

Kolumna `challenge_settings.szybki_start_module_id` jest pusta (`NULL`) — co potwierdza pomarańczowy banner na dole ekranu. Logika sprawdza prawidłowo tabelę `certificates` (cert „Szybki Start" jest auto‑generowany po ukończeniu modułu w Akademii — patrz pamięć „Webinar Cert Logic"), ale dopóki w ustawieniach Wyzwania nie wybierzemy konkretnego modułu szkoleniowego „Szybki Start", zapytanie zawsze zwraca pusty zbiór → wszyscy mają „Brak".

Funkcja `leader_get_team_challenge_access` po stronie panelu lidera robi dokładnie to samo — więc liderzy też dziś widzą wszędzie „Brak".

## Co dokładnie zmieniam

### 1. Selektor modułu „Szybki Start" w Ustawieniach Wyzwania
W zakładce `Ustawienia` (`ChallengeAdminPage.tsx`) dodaję pole „Moduł akademii: Szybki Start" — dropdown ładowany z `training_modules` (id + title). Zapisuje się do istniejącej kolumny `challenge_settings.szybki_start_module_id` razem z resztą ustawień. Pod polem krótki opis: „Wskazuje, który moduł Akademii musi być ukończony, aby uznać użytkownika za posiadającego «Szybki Start». Liderzy mogą nadawać dostęp tylko użytkownikom z ukończonym tym modułem."

Po zapisaniu modułu kolumny „Szybki Start" w panelach admina i lidera od razu zaczną pokazywać prawdziwy status na podstawie certyfikatu z tabeli `certificates` (auto‑generowanego po ukończeniu szkolenia w Akademii — całkowicie niezależnie od zadań w Wyzwaniu 90‑dniowym).

### 2. Drobne ujednolicenie etykiet
- Tooltip w `LeaderChallengeAccessView` zostawiam (już mówi „Wymaga ukończenia szkolenia «Szybki Start» i wygenerowania certyfikatu").
- W `AccessManager` (panel admina) etykietę „Szybki Start" w nagłówku tabeli uzupełniam tooltipem: „Czy użytkownik ma ukończony moduł «Szybki Start» w Akademii (certyfikat)".
- Pomarańczowy banner „nie wybrano modułu Szybki Start" zostaje — to teraz wskazówka prowadząca admina do nowego pola.

### 3. Dostęp lidera w głąb całej struktury (już działa — tylko potwierdzam)
- `LeaderChallengeAccessView` używa `useLeaderTeamMembers`, który woła `get_organization_tree(eq_id, p_max_depth: 10)` — to zwraca **całą strukturę w dół**, łącznie z liniami pod innymi liderami, identycznie jak w panelu Auto‑Webinaru.
- Funkcja RPC `leader_update_challenge_access` weryfikuje warunek `ot.level > 0` na pełnym drzewie (depth 10) → lider może nadawać dostęp każdemu w dół hierarchii (nie tylko bezpośrednio podlegającym), tak samo jak przy Auto‑Webinarze.
- Nie wymaga to żadnych zmian w kodzie ani migracji — opisuję, żeby było jasne, że ten wymóg jest już spełniony i pozostanie spójny z Auto‑Webinarem.

## Pliki do zmiany
- `src/pages/ChallengeAdminPage.tsx` — dodanie selektora `szybki_start_module_id` w gridzie ustawień + zapis w `save()` + ładowanie listy modułów z `training_modules`.
- `src/components/challenge/admin/AccessManager.tsx` — tooltip przy nagłówku „Szybki Start".

## Bez zmian w bazie
Kolumna `challenge_settings.szybki_start_module_id` już istnieje, RPC dla lidera już istnieje — żadna migracja nie jest potrzebna.