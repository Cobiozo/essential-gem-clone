
## Baza wiedzy zespolu -- pelna implementacja

### Opis problemu
Obecnie `knowledge_resources` nie ma kolumny `created_by`, wiec nie mozna powiazac zasobow z konkretnym liderem. Liderzy nie maja mozliwosci wrzucania plikow dla swojego zespolu. Zasoby z `visible_to_everyone = false` sa widoczne dla wszystkich liderow, a nie tylko dla konkretnego zespolu.

### Plan rozwiazania

#### 1. Migracja SQL -- dodanie kolumny `created_by`

Dodac kolumne `created_by UUID REFERENCES auth.users(id)` do tabeli `knowledge_resources`. Istniejace rekordy (admina) pozostana z `created_by = NULL`.

```sql
ALTER TABLE knowledge_resources ADD COLUMN created_by UUID REFERENCES auth.users(id);
```

Zaktualizowac RLS, aby liderzy z `can_manage_knowledge_base` mogli INSERT/UPDATE/DELETE swoich zasobow (gdzie `created_by = auth.uid()`).

#### 2. Zmiana logiki widocznosci zasobow

Nowa zasada:
- **Admin-created** (`created_by IS NULL`): widoczne wg istniejacych flag (`visible_to_everyone`, `visible_to_partners`, itd.) -- to jest obecna Biblioteka
- **Leader-created** (`created_by IS NOT NULL`): widoczne TYLKO dla lidera i jego downline (zespolu)

#### 3. Leader Panel -- dodanie mozliwosci zarzadzania zasobami

W `LeaderKnowledgeView.tsx` dodac:
- Przycisk "Dodaj zasob" (dialog z formularzem: tytul, opis, typ, kategoria, plik/link, flagi akcji)
- Upload plikow do Supabase Storage (bucket `knowledge-files`)
- Zapis do `knowledge_resources` z `created_by = auth.uid()`, `visible_to_everyone = false`
- Mozliwosc edycji i usuwania swoich zasobow
- Filtrowanie: lider widzi TYLKO zasoby gdzie `created_by = auth.uid()`

#### 4. Biblioteka glowna -- dodatkowa zakladka zespolowa

W `KnowledgeCenter.tsx` dodac trzecia zakladke po "Dokumenty edukacyjne" i "Grafiki":
- **"Baza wiedzy Zespol-S.S."** -- dynamiczna nazwa z inicjalami lidera
- Logika:
  1. Pobrac liste liderow uzytkownika przez RPC `get_user_leader_ids`
  2. Dla kazdego lidera, pobrac jego zasoby z `knowledge_resources` WHERE `created_by = leader_user_id`
  3. Pobrac nazwe zespolu z `platform_teams.custom_name` lub wygenerowac "Zespol-I.N." z inicjalow
  4. Wyswietlic zasoby pogrupowane per zespol (jesli user ma wiele liderow)
- Zakladka widoczna tylko gdy istnieja zasoby zespolowe

#### 5. Nazewnictwo zespolow

Funkcja pomocnicza do generowania nazwy zespolu:
- Jesli `platform_teams.custom_name` istnieje -- uzyj jej
- W przeciwnym razie: "Zespol-{pierwsza litera imienia}.{pierwsza litera nazwiska}." np. "Zespol-S.S." dla Sebastian Snopek

Ta sama logika nazewnictwa powinna byc stosowana wszedzie, gdzie pojawia sie odniesienie do zespolu (wydarzenia, baza wiedzy, itp.).

#### 6. Wydarzenia -- dodanie nazwy zespolu

W widoku kalendarza/wydarzen, przy wydarzeniach typu `team_training`/`webinar` z `host_user_id`, wyswietlac badge "Zespol-S.S." zamiast ogolnego "Spotkanie zespolu".

### Szczegoly techniczne

**Pliki do zmiany/utworzenia:**

1. **Nowa migracja SQL**: 
   - `ALTER TABLE knowledge_resources ADD COLUMN created_by UUID`
   - Polityki RLS dla liderow (INSERT/UPDATE/DELETE WHERE created_by = auth.uid())
   - Utworzenie lub aktualizacja polityki SELECT (leader-created resources widoczne dla downline)

2. **Nowy hook `src/hooks/useTeamName.ts`**:
   - Pobiera nazwe zespolu lidera (custom_name lub generuje z inicjalow)
   - Reuse'owalny w calej aplikacji

3. **`src/components/leader/LeaderKnowledgeView.tsx`** (duza przebudowa):
   - Dodanie formularza dodawania/edycji zasobow
   - Upload plikow do Storage
   - CRUD zasobow z `created_by` = current user
   - Filtr: tylko zasoby `created_by = auth.uid()`

4. **`src/pages/KnowledgeCenter.tsx`** (rozszerzenie):
   - Nowa zakladka "Baza wiedzy Zespol-X.Y." 
   - Pobranie zasobow liderow z upline
   - Wyswietlenie z tym samym ukladem co Dokumenty/Grafiki

5. **`src/types/knowledge.ts`** (rozszerzenie):
   - Dodanie `created_by` do interfejsu `KnowledgeResource`

6. **`src/integrations/supabase/types.ts`** (auto-update po migracji)

7. **Komponenty wydarzen** (opcjonalnie w tej iteracji):
   - Dodanie badge "Zespol-S.S." do kart wydarzen zespolowych

### Kolejnosc implementacji

1. Migracja SQL (kolumna + RLS)
2. Hook `useTeamName`
3. Aktualizacja typow
4. LeaderKnowledgeView -- CRUD zasobow
5. KnowledgeCenter -- zakladka zespolowa
6. Badge nazwy zespolu w wydarzeniach
