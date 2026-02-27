
### Diagnoza (potwierdzona)

Sprawdziłem dane i kod end-to-end. Problem **nie leży już w samej polityce RLS SELECT** — ta polityka zawiera warunki:
- `created_by = auth.uid()`
- `created_by IN (SELECT get_user_leader_ids(auth.uid()))`

To jest poprawne.

Prawdziwa przyczyna: **RPC `get_team_knowledge_resources` wywala błąd SQL** i przez to frontend dostaje pusty zestaw danych dla zakładki zespołowej.

#### Dowody z projektu
1. W tabeli `knowledge_resources` istnieje aktywny zasób zespołowy:
   - `created_by = 60645dff-dfb2-40db-ae3b-d8f28507658e` (lider S.S.)
2. Użytkownik `sebastiansnopek210587@gmail.com` ma `upline_eq_id = 121118999`.
3. `get_user_leader_ids()` dla tego użytkownika zwraca lidera `60645dff-dfb2-40db-ae3b-d8f28507658e` (czyli S.S.) — relacja zespołowa działa.
4. `get_team_knowledge_resources(...)` zwraca błąd:
   - odwołanie do nieistniejącej kolumny `platform_teams.is_active`
5. Ten sam błąd został zapisany w migracji, która tworzyła funkcję (`LEFT JOIN public.platform_teams ... AND pt.is_active = true`), a w rzeczywistym schemacie `platform_teams` **nie ma kolumny `is_active`**.

### Co trzeba naprawić

#### 1) Poprawić funkcję SQL `get_team_knowledge_resources` (priorytet krytyczny)
- Usunąć warunek `pt.is_active = true` z JOIN do `platform_teams`.
- Zostawić logikę:
  - tylko `kr.created_by IS NOT NULL`
  - tylko `kr.status = 'active'`
  - tylko liderzy z `get_user_leader_ids(p_user_id)`

Efekt: RPC zacznie zwracać rekordy zespołowe, więc `hasTeamResources` w `KnowledgeCenter.tsx` stanie się `true`, a zakładka pojawi się.

#### 2) Uodpornić frontend (`KnowledgeCenter.tsx`) na błąd RPC
Aktualnie jeśli RPC padnie, interfejs po prostu nie pokazuje zakładki (bo dane są puste). Dodać:
- obsługę `isError` / `error` z React Query dla `teamResourceInfos`,
- czytelny komunikat diagnostyczny (np. toast) zamiast „cichego” braku zakładki,
- opcjonalnie fallback: pokazać placeholder „Baza wiedzy zespołu chwilowo niedostępna”.

To skraca czas diagnozy przy kolejnych incydentach.

#### 3) Poprawić `useTeamName.ts` (spójność i brak ukrytego błędu)
Hook też filtruje `platform_teams` po `is_active`, którego nie ma:
- usunąć `.eq('is_active', true)` w `useMyTeamName`.
- dzięki temu nazwa zespołu nie będzie zależna od błędnego filtra.

To nie blokuje samej zakładki w Bibliotece, ale usuwa drugi błąd tego samego typu.

---

### Sekwencja wdrożenia

1. Migracja SQL: `CREATE OR REPLACE FUNCTION get_team_knowledge_resources` (bez `pt.is_active`).
2. Aktualizacja hooka `useTeamName.ts` (usunąć filtr po nieistniejącej kolumnie).
3. Aktualizacja `KnowledgeCenter.tsx` o obsługę błędu RPC.
4. Weryfikacja danych dla konta `sebastiansnopek210587`:
   - `get_team_knowledge_resources(user_id)` zwraca zasób lidera S.S.,
   - widoczna zakładka: **„Baza wiedzy Zespół-S.S.”**,
   - po wejściu na zakładkę zasób jest widoczny.

---

### Kryteria akceptacji

- Członek zespołu S.S. widzi trzecią zakładkę w `/knowledge`:
  - **Baza wiedzy Zespół-S.S.**
- Zakładka ma licznik > 0 gdy lider dodał materiały.
- Lider nadal widzi wyłącznie swoje materiały w panelu lidera.
- Brak błędów SQL związanych z `platform_teams.is_active` w RPC i hookach nazewnictwa.

---

### Ryzyka i uwagi

- To regresja po migracji (funkcja oparta o nieaktualny schemat `platform_teams`).
- RLS dla `knowledge_resources` jest już zgodny z wymaganym modelem widoczności; obecny bug jest głównie w warstwie funkcji SQL + odporności UI.
