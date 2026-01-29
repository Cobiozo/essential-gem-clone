
# Plan: Naprawa PureLinków - błędy RLS i przekierowanie

## Zidentyfikowane problemy

### Problem 1: Błąd "new row violates row-level security policy for table 'user_reflinks'"

**Przyczyna**: Polityka RLS INSERT liczy **wszystkie linki** użytkownika (włącznie z nieaktywnymi), zamiast tylko aktywnych.

Aktualna polityka:
```sql
SELECT count(*) FROM user_reflinks 
WHERE creator_user_id = auth.uid()
-- ^ liczy WSZYSTKIE linki (w tym is_active = false)
```

Przykład Sebastiana Snopka (partner):
- Wszystkie linki: 3 (w tym 1 nieaktywny)
- Aktywne linki: 2
- Limit: 3
- Wynik: 3 >= 3 = BLOKADA (mimo że ma tylko 2 aktywne)

**Rozwiązanie**: Zmienić politykę RLS aby liczyła tylko aktywne linki:
```sql
SELECT count(*) FROM user_reflinks 
WHERE creator_user_id = auth.uid() 
  AND is_active = true  -- <- dodać ten warunek
```

### Problem 2: Linki nie przekierowują do rejestracji (signup)

**Przyczyna**: Kod w `Auth.tsx` jest poprawny i został już naprawiony, ale **zmiany mogą nie być opublikowane** na stronie produkcyjnej.

Kod już zawiera:
```typescript
const reflink = Array.isArray(data) ? data[0] : data;
if (reflink) {
  setActiveTab('signup'); // Przełącz na zakładkę rejestracji
  setRole(reflink.target_role);
  setSelectedGuardian({...});
}
```

**Rozwiązanie**: Wymagana jest **publikacja** zmian na produkcję.

---

## Plan naprawy

### Krok 1: Naprawić politykę RLS (migracja bazy danych)

Zmienić politykę INSERT dla `user_reflinks`, aby liczyła tylko aktywne linki:

```sql
DROP POLICY IF EXISTS "Users can create reflinks if permitted" ON user_reflinks;

CREATE POLICY "Users can create reflinks if permitted"
ON user_reflinks FOR INSERT
TO authenticated
WITH CHECK (
  creator_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM reflink_generation_settings rgs
    JOIN user_roles ur ON ur.role = rgs.role
    WHERE ur.user_id = auth.uid()
      AND rgs.can_generate = true
      AND user_reflinks.target_role = ANY(rgs.allowed_target_roles)
      AND (
        SELECT count(*) 
        FROM user_reflinks 
        WHERE creator_user_id = auth.uid()
          AND is_active = true  -- Liczyć tylko aktywne!
      ) < rgs.max_links_per_user
  )
);
```

### Krok 2: Publikacja zmian

Po zatwierdzeniu migracji, kliknij przycisk **Publish** w Lovable, aby wdrożyć:
- Naprawioną politykę RLS
- Poprawiony kod `Auth.tsx` z obsługą tablic z RPC

---

## Podsumowanie zmian

| Element | Zmiana |
|---------|--------|
| Polityka RLS `user_reflinks` INSERT | Dodanie warunku `is_active = true` przy liczeniu |
| Publikacja | Wdrożenie kodu z poprawkami na produkcję |

## Efekt po wdrożeniu

1. Użytkownicy będą mogli tworzyć nowe linki, jeśli ich liczba **aktywnych** linków jest poniżej limitu
2. Linki polecające będą poprawnie przekierowywać na zakładkę rejestracji z wypełnioną rolą i opiekunem
