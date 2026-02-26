

## Modul "Zespoly platformy PureLifeCenter" w panelu CMS admina

### Opis

Nowy modul w panelu admina pokazujacy zespoly tworzone automatycznie na podstawie hierarchii organizacji. Kazdy lider (osoba z `leader_permissions`) tworzy zespol skladajacy sie z niego i wszystkich osob ponizej w hierarchii (`upline_eq_id`). Admin widzi liste zespolow, ich sklad i statystyki.

### Logika tworzenia zespolow

- Zespol = lider + wszyscy uzytkownicy rekurencyjnie ponizej niego w hierarchii (na podstawie `upline_eq_id` -> `eq_id`)
- Nazwa domyslna: "Zespol-{inicjal_imienia}.{inicjal_nazwiska}." np. "Zespol-S.S." dla Sebastiana Snopka
- Admin moze nadac wlasna nazwe zespolu (opcjonalnie)
- Liderzy pobierani z tabeli `leader_permissions`

### Hierarchia liderow i niezaleznosc zespolow

Jezeli lider B znajduje sie w strukturze (ponizej) lidera A, to:
- Lider A widzi lidera B, nazwe jego zespolu oraz czlonkow zespolu lidera B
- Zespol lidera B jest wyswietlany jako podzespol wewnatrz zespolu lidera A
- Czlonkowie zespolu B sa wizualnie oznaczeni jako nalezacy do podzespolu

**Status niezaleznosci**: Admin moze nadac zespolowi status "niezalezny" (`is_independent = true`), co oznacza:
- Zespol niezalezny NIE jest widoczny jako podzespol lidera wyzej
- Lider wyzej NIE widzi czlonkow niezaleznego zespolu w swoim widoku
- Niezalezny zespol pojawia sie jako oddzielny, samodzielny zespol na liscie
- W praktyce: czlonkowie niezaleznego zespolu sa odejmowani z licznika i listy zespolu lidera nadrzednego

### Zmiany w bazie danych

Nowa tabela `platform_teams`:

```text
platform_teams
- id: uuid (PK, default gen_random_uuid())
- leader_user_id: uuid (FK -> auth.users, UNIQUE, NOT NULL)
- custom_name: text (nullable - jesli null, uzyj domyslnej nazwy "Zespol-X.Y.")
- is_independent: boolean (default false) -- status niezaleznosci
- created_at: timestamptz (default now())
- updated_at: timestamptz (default now())
```

RLS: tylko admini maja dostep do odczytu i zapisu.

### Nowe pliki

#### 1. `src/hooks/usePlatformTeams.ts`

Hook do pobierania i zarzadzania danymi zespolow:
- Pobiera liderow z `leader_permissions` + `profiles` (eq_id, imie, nazwisko)
- Dla kazdego lidera wywoluje RPC `get_organization_tree` (juz istnieje)
- Pobiera custom nazwy i status niezaleznosci z `platform_teams`
- Generuje domyslne nazwy "Zespol-X.Y."
- Buduje hierarchie: wykrywa liderow-w-strukturze-innych-liderow
- Filtruje: niezalezne zespoly sa wycinane z drzewa nadrzednego lidera
- Zwraca posortowana liste zespolow ze statystykami i informacja o podzespolach
- Obsluguje zapis/aktualizacje custom nazwy i statusu niezaleznosci

#### 2. `src/components/admin/PlatformTeamsManagement.tsx`

Glowny komponent modulu. Zawiera:

**Statystyki ogolne** (gora):
- Laczna liczba zespolow
- Laczna liczba czlonkow
- Srednia na zespol

**Lista zespolow** (kazdy jako accordion):
- Nazwa zespolu (domyslna lub custom) + badge "Niezalezny" jesli `is_independent`
- Lider: imie, nazwisko, eq_id, avatar
- Liczba czlonkow (bezposrednich + z podzespolow, z wylaczeniem niezaleznych)
- Mozliwosc rozwijania -> lista czlonkow z rolami i poziomami
- Jesli w zespole sa inni liderzy (podzespoly):
  - Wyswietlane jako wyroznionyе sekcje wewnatrz
  - Nazwa podzespolu + liczba czlonkow
  - Mozliwosc rozwijania podzespolu

**Akcje admina** (per zespol):
- Edycja nazwy zespolu (inline edit lub dialog)
- Przelacznik "Niezalezny" (switch) -- wylacza zespol spod nadzoru lidera wyzej

### Przyklad wizualny

```text
+-----------------------------------------------+
| Zespoly platformy PureLifeCenter              |
| [4 zespoly] [146 czlonkow] [sr. 36/zespol]   |
+-----------------------------------------------+
|                                                |
| v Zespol-S.S. (Sebastian Snopek)    [58 os.]  |
|   Lider: Sebastian Snopek (EQ: 121118999)     |
|   [Edytuj nazwe] [Niezalezny: wyl.]           |
|                                                |
|   Czlonkowie bezposredni:                      |
|   +-- Partner: Jan Kowalski (EQ: ...)         |
|   +-- Klient: Anna Nowak (EQ: ...)            |
|                                                |
|   Podzespol: Zespol-M.K. (Marek Kowal) [12os] |
|     +-- Klient: Ewa Zak (EQ: ...)             |
|     +-- Klient: Piotr Lis (EQ: ...)           |
|                                                |
| v Zespol-J.W. (Jaroslaw Wiglusz)    [18 os.]  |
|   [Niezalezny: wyl.]                          |
|   ...                                          |
|                                                |
| v Zespol-A.B. (Anna Baran)          [8 os.]   |
|   [Niezalezny: WLACZONY] (badge)              |
|   -- Ten zespol nie podlega liderowi wyzej --  |
|   ...                                          |
+-----------------------------------------------+
```

### Zmiany w istniejacych plikach

#### 3. `src/components/admin/AdminSidebar.tsx`

- Dodanie nowego elementu w kategorii "users":
  ```
  { value: 'platform-teams', labelKey: 'platformTeams', icon: UsersRound }
  ```
- Import ikony `UsersRound` z lucide-react
- Dodanie klucza w `hardcodedLabels`: `platformTeams: 'Zespoly platformy'`

#### 4. `src/pages/Admin.tsx`

- Import `PlatformTeamsManagement`
- Dodanie renderowania w odpowiednim `TabsContent`:
  ```
  {activeTab === 'platform-teams' && <PlatformTeamsManagement />}
  ```

### Szczegoly techniczne

- Wykorzystuje istniejaca funkcje RPC `get_organization_tree(p_root_eq_id, p_max_depth)` -- nie trzeba tworzyc nowej
- Wykrywanie podzespolow: po pobraniu drzew wszystkich liderow, sprawdza sie czy eq_id lidera B wystepuje w drzewie lidera A
- Niezaleznosc: jesli `is_independent = true`, czlonkowie tego zespolu (lacznie z liderem) sa odejmowani z drzewa nadrzednego
- Tabela `platform_teams` jest opcjonalna -- jesli brak rekordu dla lidera, uzywane sa wartosci domyslne (nazwa automatyczna, niezaleznosc = false)

### Kolejnosc implementacji

1. Migracja DB: tabela `platform_teams` + RLS
2. Hook `usePlatformTeams.ts`
3. Komponent `PlatformTeamsManagement.tsx`
4. Integracja w `AdminSidebar.tsx` i `Admin.tsx`
