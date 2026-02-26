

## Problem

Tabela uprawnień ma 20 kolumn Switch w jednym wierszu, co powoduje obcinanie i konieczność scrollowania poziomego. Na screenshot widać, że część kolumn jest niewidoczna.

## Rozwiązanie: Rozwijane wiersze z pogrupowanymi uprawnieniami

Zamiast jednego długiego wiersza ze wszystkimi Switch-ami, każdy partner będzie miał:
- **Wiersz główny**: Imię, email, liczba aktywnych uprawnień (badge), przycisk rozwijania
- **Panel rozwijany**: Uprawnienia pogrupowane w sekcje (Podstawowe, Wydarzenia, Szkolenia, Komunikacja, Kontakty, Treść, Raporty, Kalkulatory) wyświetlane jako kompaktowa siatka 2-4 kolumnowa

```text
+--------------------------------------------------+
| Crown  Sebastian Snopek              [4/20] [v]  |
|        sebastiansnopek@gmail.com                  |
+--------------------------------------------------+
|  Podstawowe          | Wydarzenia                 |
|  [x] Spotkania       | [ ] Wydarzenia             |
|  [x] Szkolenia       | [ ] Rejestracje            |
|  [x] Struktura       |                            |
|  [x] Zatwierdzanie   | Szkolenia i wiedza         |
|                       | [ ] Zarz. szkoleniami      |
|  Komunikacja          | [ ] Baza wiedzy            |
|  [ ] Powiadomienia    |                            |
|  [ ] Emaile           | ...                        |
|  [ ] Push             |                            |
+--------------------------------------------------+
| Katarzyna Snopek                     [0/20] [v]  |
+--------------------------------------------------+
```

Dodatkowe ulepszenia:
- Przycisk "Włącz wszystko" / "Wyłącz wszystko" per partner
- Aktywne uprawnienia widoczne jako badge w wierszu głównym (np. "4/20")
- Partnerzy z aktywnymi uprawnieniami wyróżnieni wizualnie (Crown + tło)

### Zmiany techniczne

**Modyfikowany plik**: `src/components/admin/LeaderPanelManagement.tsx`

- Zamiana `Table` na listę kart z `Collapsible` (z Radix UI, już zainstalowany)
- Grupowanie kolumn wg pola `group` (już zdefiniowane w tablicy `columns`)
- Siatka uprawnień w panelu rozwijanym: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Każde uprawnienie: ikona + label + Switch w jednym wierszu
- Zachowanie istniejącej logiki `toggleLeaderPermission` i `toggleCalculatorAccess` bez zmian

