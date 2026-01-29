

# Plan: Dodanie polityki RLS INSERT dla adminów

## Problem

Kiedy admin generuje PureLink w imieniu innego użytkownika, operacja kończy się błędem:
> "new row violates row-level security policy for table 'user_reflinks'"

**Przyczyna**: Polityka INSERT sprawdza `creator_user_id = auth.uid()`, ale admin ustawia `creator_user_id` na ID partnera (nie swoje). Brakuje polityki INSERT pozwalającej adminom na tworzenie linków dla dowolnych użytkowników.

### Aktualne polityki dla `user_reflinks`:

| Operacja | Polityka | Status |
|----------|----------|--------|
| SELECT | Admins can read all reflinks | ✓ |
| UPDATE | Admins can update any reflink | ✓ |
| DELETE | Admins can delete any reflink | ✓ |
| INSERT | **BRAK dla adminów** | ❌ |

## Rozwiązanie

Dodać nową politykę RLS INSERT dla adminów:

```sql
CREATE POLICY "Admins can create reflinks for any user"
ON user_reflinks FOR INSERT
TO authenticated
WITH CHECK (is_admin());
```

Dzięki temu admin będzie mógł tworzyć linki z dowolnym `creator_user_id` (w imieniu każdego użytkownika).

## Migracja bazy danych

```sql
-- Add INSERT policy for admins to create reflinks on behalf of any user
CREATE POLICY "Admins can create reflinks for any user"
ON user_reflinks FOR INSERT
TO authenticated
WITH CHECK (is_admin());
```

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Dodanie polityki INSERT dla adminów |

## Po wdrożeniu

1. Admin będzie mógł generować PureLinki dla każdego użytkownika
2. Zwykli użytkownicy nadal będą ograniczeni do tworzenia linków tylko dla siebie (zgodnie z limitem)
3. Link wygenerowany przez admina będzie przypisany do wybranego użytkownika jako twórca

