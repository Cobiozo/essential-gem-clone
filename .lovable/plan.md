

# Fix: Lider nie widzi certyfikatów członków zespołu

## Diagnoza

Tabela `certificates` ma RLS policy `Users can view their own certificates` z warunkiem `auth.uid() = user_id`. Lider nie jest adminem, więc zapytanie po certyfikaty zespołu zwraca **0 wyników** — wszyscy członkowie wyglądają jakby nie mieli certyfikatu, a switche są wyszarzone.

Jan Koterski **ma** certyfikat Szybki Start (wygenerowany 9 kwietnia 2026, ID: `76281103-...`), ale lider go nie widzi przez RLS.

## Rozwiązanie

Przenieść sprawdzanie certyfikatów do istniejącej RPC `leader_get_team_auto_webinar_access` (która działa z `SECURITY DEFINER` i omija RLS). RPC będzie zwracać dodatkowe pole `has_certificate` dla każdego użytkownika.

### Zmiana 1: Migracja SQL — rozszerzenie RPC

Zaktualizować `leader_get_team_auto_webinar_access` aby zwracała także `has_certificate boolean` na podstawie JOIN z tabelą `certificates` po module `7ba86537-...`.

### Zmiana 2: Frontend — użycie danych z RPC zamiast osobnego zapytania

W `LeaderAutoWebinarAccessView.tsx`:
- Usunąć osobne zapytanie do `certificates` (linia 52)
- Budować `certSet` z danych zwróconych przez RPC (`has_certificate`)
- Reszta logiki bez zmian

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Rozszerzenie RPC `leader_get_team_auto_webinar_access` o pole `has_certificate` |
| `src/components/leader/LeaderAutoWebinarAccessView.tsx` | Usunięcie zapytania do `certificates`, użycie danych z RPC |

