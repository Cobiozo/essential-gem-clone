
## Plan: Rozszerzenie Panelu Lidera o zarzadzanie zespolem + Historia czynnosci w CMS

### Zakres zmian

Cztery glowne obszary:
1. **Panel Lidera** - wyswietlenie nazwy zespolu lidera z mozliwoscia edycji
2. **Panel Lidera (struktura)** - oznaczenie liderow-podzespolow w drzewie z opcja przelaczenia niezaleznosci
3. **Tabela `platform_team_actions`** - historia czynnosci liderow w obszarze zespolow
4. **CMS Admin** - widok historii czynnosci w zakladce "Zespoly platformy"

---

### 1. Baza danych - nowa tabela historii

Nowa tabela `platform_team_actions` rejestrujaca kazda czynnosc lidera:

```text
platform_team_actions
- id: uuid (PK)
- leader_user_id: uuid (NOT NULL) -- kto wykonal akcje
- action_type: text (NOT NULL) -- 'rename_team' | 'toggle_independence'
- target_team_leader_id: uuid -- na czyim zespole wykonano (moze byc == leader_user_id)
- old_value: text (nullable)
- new_value: text (nullable)
- created_at: timestamptz (default now())
```

RLS: admini maja SELECT, liderzy maja INSERT (tylko swoje akcje) i SELECT (tylko swoje).

---

### 2. Panel Lidera - Sekcja "Moj zespol" w headerze

W pliku `src/pages/LeaderPanel.tsx` dodanie pod naglowkiem "Panel Lidera" karty z:
- Nazwa zespolu lidera (pobrana z `platform_teams` lub domyslna "Zespol-X.Y.")
- Przycisk "Edytuj nazwe" otwierajacy dialog
- Liczba czlonkow w zespole

Nowy hook `src/hooks/useLeaderTeam.ts`:
- Pobiera dane zespolu biezacego lidera z `platform_teams`
- Pobiera profil lidera (imie, nazwisko dla domyslnej nazwy)
- Funkcja `updateMyTeamName(newName)` - zapisuje w `platform_teams` i loguje w `platform_team_actions`

---

### 3. Panel Lidera (struktura) - oznaczenie liderow-podzespolow

W `LeaderOrgTreeView.tsx` (lub w osobnym komponencie):
- Przy wyswietlaniu drzewa, czlonkowie bedacy liderami (maja rekord w `leader_permissions`) sa oznaczeni badge "Lider" + nazwa ich zespolu
- Lider widzi przelacznik "Niezaleznosc" przy kazdym podliderze w swojej strukturze
- Zmiana niezaleznosci logowana do `platform_team_actions`

Nowy hook `src/hooks/useSubTeamLeaders.ts`:
- Pobiera liste user_id liderow z `leader_permissions`
- Pobiera ich nazwy zespolow z `platform_teams`
- Funkcja `toggleSubLeaderIndependence(subLeaderUserId, value)` - aktualizuje `platform_teams.is_independent` i loguje akcje

---

### 4. CMS Admin - Historia czynnosci

Rozszerzenie `PlatformTeamsManagement.tsx` o nowa sekcje "Historia czynnosci":
- Tabela/lista chronologiczna z `platform_team_actions`
- Kolumny: Data, Lider (kto), Akcja (opis), Zespol (na jakim), Stara wartosc, Nowa wartosc
- Filtrowanie po typie akcji i po liderze
- Paginacja (ostatnie 50 wpisow)

Nowy hook `src/hooks/usePlatformTeamActions.ts`:
- Pobiera dane z `platform_team_actions` z joinami na `profiles` (imiona liderow)
- Obsluguje paginacje i filtry

---

### 5. Synchronizacja nazwy miedzy Panelem Lidera a CMS

Obie strony (lider i admin) operuja na tej samej tabeli `platform_teams`:
- Lider zmienia nazwe -> widoczne natychmiast w CMS admina
- Admin zmienia nazwe -> widoczne natychmiast w Panelu Lidera
- Kazda zmiana logowana do `platform_team_actions` z informacja kto zmienil

---

### Zmiany w plikach

| Plik | Zmiana |
|------|--------|
| **Migracja SQL** | Nowa tabela `platform_team_actions` + RLS |
| `src/hooks/useLeaderTeam.ts` | **NOWY** - dane zespolu lidera, edycja nazwy |
| `src/hooks/useSubTeamLeaders.ts` | **NOWY** - lista podliderow, toggle niezaleznosci |
| `src/hooks/usePlatformTeamActions.ts` | **NOWY** - historia czynnosci |
| `src/hooks/usePlatformTeams.ts` | Dodanie logowania akcji przy updateTeamName i toggleIndependence |
| `src/pages/LeaderPanel.tsx` | Sekcja "Moj zespol" z nazwa i edycja |
| `src/components/leader/LeaderOrgTreeView.tsx` | Oznaczenie podliderow + toggle niezaleznosci |
| `src/components/admin/PlatformTeamsManagement.tsx` | Sekcja "Historia czynnosci" |

### Kolejnosc implementacji

1. Migracja DB (`platform_team_actions`)
2. Hook `useLeaderTeam` + sekcja w `LeaderPanel`
3. Hook `useSubTeamLeaders` + rozszerzenie `LeaderOrgTreeView`
4. Hook `usePlatformTeamActions` + historia w CMS
5. Logowanie akcji w istniejacym `usePlatformTeams`
