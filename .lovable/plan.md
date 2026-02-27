

## Widok administratora: Wszystkie zespoły w Bibliotece

### Problem
Administrator widzi zasoby zespołowe tak samo jak zwykły członek -- tylko jednego zespołu (swojego). Powinien widzieć **wszystkie zespoły osobno**, z mozliwoscia klikniecia w kazdy zespol i przegladania jego dokumentow i grafik.

### Rozwiazanie

#### 1. Nowa funkcja SQL: `get_all_team_knowledge_resources` (migracja)

Dla administratorow -- zwraca **wszystkie** zasoby z `knowledge_resources` gdzie `created_by IS NOT NULL`, pogrupowane z informacja o liderze i nazwie zespolu.

```sql
CREATE OR REPLACE FUNCTION public.get_all_team_knowledge_resources()
RETURNS TABLE(
  resource_id uuid,
  leader_user_id uuid,
  leader_first_name text,
  leader_last_name text,
  team_custom_name text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT 
    kr.id, kr.created_by,
    p.first_name, p.last_name,
    pt.custom_name
  FROM knowledge_resources kr
  INNER JOIN profiles p ON p.user_id = kr.created_by
  LEFT JOIN platform_teams pt ON pt.leader_user_id = kr.created_by
  WHERE kr.created_by IS NOT NULL AND kr.status = 'active'
  ORDER BY kr.created_at DESC;
END;
$$;
```

#### 2. Zmiana logiki w `KnowledgeCenter.tsx`

**Dla admina:**
- Uzyc `get_all_team_knowledge_resources()` zamiast `get_team_knowledge_resources(user_id)`
- W zakladce "team" zamiast jednej plaskiej listy, wyswietlic **liste zespolow** (karty/akordeony)
- Kazdy zespol to rozwijana sekcja z nazwa "Baza wiedzy Zespol-I.N." i licznikiem zasobow
- Po kliknieciu/rozwinieciu zespolu -- wewnetrzne pod-zakladki "Dokumenty" i "Grafiki" (identycznie jak dla zwyklego czlonka)
- Zakladka glowna "Zasoby zespolow" (zamiast "Baza wiedzy Zespol-S.S.") z lacznym licznikiem

**Dla zwyklego czlonka zespolu:**
- Bez zmian -- jak dotychczas

#### 3. Szczegoly implementacji UI (admin)

Struktura widoku admina w zakladce "team":

```text
[Dokumenty edukacyjne] [Grafiki 180]     <przerwa>     [Zasoby zespolow 15]

-- po kliknieciu --

Accordion/Card per team:
  [v] Zespol-S.S. (8 zasobow)
      [Dokumenty 3] [Grafiki 5]
      ... wyszukiwarka, filtry, karty/siatka ...

  [>] Zespol-A.B. (7 zasobow)
```

Kazdy rozwiniety zespol ma:
- Wewnetrzne Tabs "Dokumenty" / "Grafiki" z licznikami
- Wyszukiwarke i filtr kategorii (stan per-team -- uzycie lokalnego stanu w komponencie zespolu)
- Dokumenty jako lista kart (`renderResourceCard`)
- Grafiki jako siatka (`GraphicsCard`)

#### 4. Wyodrebnienie komponentu `TeamKnowledgeSection`

Aby uniknac rozdmuchania `KnowledgeCenter.tsx`, wyodrebniony zostanie komponent `TeamKnowledgeSection` przyjmujacy:
- `teamName: string`
- `resources: KnowledgeResource[]`
- `onSelectGraphic: (r: KnowledgeResource) => void`

Komponent sam zarzadza stanem pod-zakladek, wyszukiwarki i filtrow.

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa funkcja `get_all_team_knowledge_resources` |
| `src/pages/KnowledgeCenter.tsx` | Import `isAdmin` z AuthContext, warunkowe uzycie nowego RPC, widok admin vs member |
| `src/components/knowledge/TeamKnowledgeSection.tsx` | **Nowy** -- wyodrebniony komponent sekcji zespolu (dokumenty+grafiki z filtrami) |

### Sekwencja

1. Migracja SQL (nowa funkcja)
2. Utworzenie `TeamKnowledgeSection.tsx`
3. Aktualizacja `KnowledgeCenter.tsx` -- logika admin vs member, Accordion z zespolami dla admina

