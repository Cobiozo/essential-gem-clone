
# Plan: Naprawa uprawnień RLS dla zatwierdzania szkoleń

## Zdiagnozowany problem

Błąd: `"new row violates row-level security policy for table \"training_progress\""`

### Analiza polityk RLS

**Tabela `training_progress` - obecne polityki:**
| Operacja | Polityka | Warunek |
|----------|----------|---------|
| SELECT | Admins can view all progress | `is_admin()` ✅ |
| SELECT | Users can view own progress | `auth.uid() = user_id` |
| INSERT | Users can insert own progress | `auth.uid() = user_id` ❌ |
| UPDATE | Users can update own progress | `auth.uid() = user_id` ❌ |

**Problem**: Brakuje polityk pozwalających adminowi na INSERT i UPDATE postępu innych użytkowników!

**Tabela `training_assignments`**: Ma politykę `ALL` dla admina - działa poprawnie.

---

## Rozwiązanie

### Migracja SQL - dodanie brakujących polityk RLS

```sql
-- Polityka pozwalająca adminom wstawiać postęp dla dowolnego użytkownika
CREATE POLICY "Admins can insert training progress"
  ON training_progress
  FOR INSERT
  TO public
  WITH CHECK (is_admin());

-- Polityka pozwalająca adminom aktualizować postęp dowolnego użytkownika  
CREATE POLICY "Admins can update training progress"
  ON training_progress
  FOR UPDATE
  TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- Polityka pozwalająca adminom usuwać postęp (dla resetowania)
CREATE POLICY "Admins can delete training progress"
  ON training_progress
  FOR DELETE
  TO public
  USING (is_admin());
```

---

## Szczegóły techniczne

| Element | Zmiana |
|---------|--------|
| Baza danych | Dodanie 3 nowych polityk RLS dla `training_progress` |

### Po migracji - nowe polityki:

| Operacja | Polityka | Warunek |
|----------|----------|---------|
| SELECT | Admins can view all progress | `is_admin()` |
| INSERT | **Admins can insert training progress** | `is_admin()` ✅ NOWA |
| UPDATE | **Admins can update training progress** | `is_admin()` ✅ NOWA |
| DELETE | **Admins can delete training progress** | `is_admin()` ✅ NOWA |

---

## Oczekiwany efekt

Po zastosowaniu migracji:
1. Przycisk "✓" przy nieukończonych lekcjach będzie działać
2. Przycisk "Zatwierdź" przy module będzie działać
3. Przycisk "Resetuj" przy lekcji/module będzie działać (wymaga DELETE)

Kod w `TrainingManagement.tsx` nie wymaga zmian - problem leży wyłącznie w brakujących politykach RLS w bazie danych.
