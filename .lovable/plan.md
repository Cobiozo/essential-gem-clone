

# Plan: Przenieść PureBox powyżej Pure-Kontakty

## Zmiana

W `src/components/dashboard/DashboardSidebar.tsx` — wyciąć blok PureBox (linie 459–468) i wstawić go **przed** elementem `pureContacts` (obecnie linia 412).

Kolejność po zmianie:
1. `resources` (Biblioteka)
2. **`purebox` (PureBox)** ← przeniesiony tutaj
3. `pureContacts` (Pure-Kontakty)
4. reszta bez zmian

## Plik do zmiany
- `src/components/dashboard/DashboardSidebar.tsx` — przeniesienie jednego bloku menu wyżej w tablicy `menuItems`

