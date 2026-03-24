
Cel: naprawić produkcyjny przypadek, w którym „Szkolenie Techniczne” nadal nie pojawia się w widżecie „Webinary i spotkania”.

1. Zidentyfikowany problem
- W bazie wydarzenie istnieje i jest aktywne/published:
  - `event_type = team_training`
  - `visible_to_partners = true`
  - start 24.03.2026 19:00 lokalnie
- Problem nie wygląda już na realtime ani datę.
- Źródło problemu jest w `src/hooks/useEvents.ts`:
  - dashboard pobiera wszystkie eventy, a potem nakłada filtr „leader/downline”
  - host wydarzenia (`8b7ef46c-...`) ma rekord w `leader_permissions`, ale wszystkie uprawnienia związane z team events są `false`
  - obecna logika uznaje go za „lidera” wyłącznie dlatego, że istnieje w `leader_permissions`
  - przez to wydarzenie zostaje potraktowane jako ograniczone do jego zespołu i ukryte dla innych partnerów
- To jest zbyt agresywne: sam wpis w `leader_permissions` nie powinien automatycznie oznaczać, że jego webinar/szkolenie jest „leader-only”.

2. Co zmienić
- Poprawić klasyfikację hosta w `useEvents`, tak aby filtr zespołowy był stosowany tylko do hostów, którzy realnie mają uprawnienia do prowadzenia team events.
- Zamiast opierać się na RPC `filter_leader_user_ids` (sprawdza tylko istnienie rekordu), użyć danych z `leader_permissions` z właściwymi flagami.
- Za „leader-hosted restricted event” uznać tylko hosta mającego co najmniej jedno z uprawnień związanych z wydarzeniami zespołowymi, np.:
  - `can_create_team_events = true`
  - ewentualnie także `can_manage_team_training = true` jeśli to ma być część reguły biznesowej
- Host z rekordem w `leader_permissions`, ale bez tych flag, powinien być traktowany jak host globalny dla widoczności rolowej.

3. Pliki do zmiany
- `src/hooks/useEvents.ts`
  - zastąpić obecny mechanizm:
    - `filter_leader_user_ids(...)`
  - nowym sprawdzeniem:
    - pobrać `user_id, can_create_team_events, can_manage_team_training` dla hostów
    - zbudować zbiór tylko tych hostów, którzy naprawdę podlegają ograniczeniu „mój zespół”
  - zostawić resztę logiki bez zmian:
    - role visibility
    - registered override
    - realtime
- Opcjonalnie, jeśli chcemy ujednolicić logikę w całym projekcie:
  - rozważyć zmianę lub dodanie nowego RPC zamiast samego hooka
  - ale najbezpieczniej na teraz poprawić tylko `useEvents`, bo to właśnie dashboard jest błędny

4. Oczekiwany efekt po wdrożeniu
- „Szkolenie Techniczne” zacznie być widoczne na produkcji w widżecie dashboardu dla partnerów/specjalistów zgodnie z flagami widoczności wydarzenia.
- Nadal zostanie zachowane ograniczenie dla faktycznych liderów publikujących własne wydarzenia zespołowe tylko do swojego downline.
- Nie naruszymy wcześniejszej poprawki realtime.

5. Weryfikacja po wdrożeniu
- sprawdzić na produkcji konto Sebastiana:
  - czy 24.03.2026 pokazuje zieloną kropkę / wpis szkolenia
- sprawdzić event hostowany przez prawdziwego lidera z aktywnym uprawnieniem team events:
  - czy nadal widzi go tylko jego zespół
- sprawdzić, że zapisany użytkownik nadal widzi wydarzenie niezależnie od filtrowania zespołu

6. Krótka diagnoza biznesowa
- Błąd nie polega na tym, że event „nie istnieje”.
- Błąd polega na tym, że dashboard błędnie interpretuje „ma rekord w `leader_permissions`” jako „jest liderem ograniczającym widoczność swoich team events”.
- W tym przypadku host nie ma aktywnych uprawnień team-training, więc event nie powinien być ukrywany.
