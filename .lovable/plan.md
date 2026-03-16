

# Plan: Poprawki w module bezpieczeństwa

## Zmiany

### 1. `SecurityLoginHistory.tsx` — EQ ID przy użytkowniku

- Dodać `eq_id` do zapytania profiles: `select('user_id, first_name, last_name, email, eq_id')`
- W `getUserDisplay` wyświetlać format: `Imię Nazwisko (EQ123)`
- Zaktualizować typ w profilesMap

### 2. `SecurityDashboard.tsx` — Top 10 krajów zamiast 5

- Zmienić `.slice(0, 5)` na `.slice(0, 10)` w `topCountries`
- Zmienić tytuł z "Top 5 krajów" na "Top 10 krajów"
- Zwiększyć wysokość wykresu krajów z 250 na 350px

### 3. `SecurityDashboard.tsx` — Top 10 miast widoczne

- Zwiększyć wysokość wykresu miast z 250 na 350px aby zmieścić wszystkie 10 wierszy

### 4. `SecurityDashboard.tsx` — Czytelniejsze wykresy kołowe

- Zwiększyć `outerRadius` z 65 na 80, `innerRadius` z 25 na 35
- Zwiększyć wysokość kontenerów z 200 na 280px
- Dodać `<Legend>` pod każdym wykresem kołowym zamiast polegać na `label` (które się nakładają)
- Skrócić renderPieLabel do `${value}` (sam numer), a pełne opisy w legendzie
- Ustawić `fontSize: 11` na labelu

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `SecurityLoginHistory.tsx` | Dodać eq_id do profili i wyświetlać obok nazwy |
| `SecurityDashboard.tsx` | Top 10 krajów, wyższe wykresy miast/krajów, czytelniejsze pie charts z legendą |

