
## Problem

Zakladka "Baza wiedzy Zespol-S.S." nie pojawia sie w Bibliotece z dwoch powodow:

### 1. Brak zasobow liderskich w bazie
Aktualnie w tabeli `knowledge_resources` nie ma zadnych rekordow z `created_by IS NOT NULL`. Lider mogl probowac dodac zasoby, ale nie udalo sie z powodu problemu nr 2.

### 2. Polityka RLS SELECT blokuje dostep do zasobow liderskich (glowna przyczyna)
Obecna polityka SELECT na tabeli `knowledge_resources` pozwala czytac TYLKO zasoby z flagami widocznosci (`visible_to_everyone`, `visible_to_partners`, itp.):

```text
WHERE status = 'active' 
  AND (visible_to_everyone = true 
    OR (visible_to_clients = true AND role = 'client') 
    OR ...)
```

Zasoby tworzone przez liderow maja `visible_to_everyone = false` i wszystkie inne flagi rowniez `false`. W efekcie:
- Lider NIE MOZE odczytac swoich wlasnych zasobow po ich dodaniu
- Czlonkowie zespolu NIE MOGA odczytac zasobow lidera
- Zakladka zespolowa nigdy sie nie pojawi, bo zapytanie zawsze zwraca 0 wynikow

### Plan naprawy

#### 1. Aktualizacja polityki RLS SELECT (migracja SQL)

Rozszerzyc istniejaca polityke SELECT o dwa dodatkowe warunki:

```text
...istniejace warunki...
OR (created_by = auth.uid())  -- lider widzi swoje zasoby
OR (created_by IN (SELECT get_user_leader_ids(auth.uid())))  -- czlonkowie zespolu widza zasoby lidera
```

To jedyna zmiana potrzebna -- w jednej migracji SQL. Kod frontendu (`KnowledgeCenter.tsx`, `LeaderKnowledgeView.tsx`) jest juz prawidlowo zaimplementowany i gotowy do dzialania po naprawie RLS.

#### 2. Pliki do zmiany
- **Nowa migracja SQL**: DROP + CREATE polityki SELECT na `knowledge_resources` z rozszerzonymi warunkami

#### 3. Weryfikacja
Po naprawie:
- Lider (S.S.) bedzie mogl dodawac zasoby w Panelu Lidera i je widziec
- Uzytkownik `sebastiansnopek210587` (w zespole S.S.) zobaczy zakladke "Baza wiedzy Zespol-S.S." w Bibliotece
- Zasoby administracyjne pozostana bez zmian
