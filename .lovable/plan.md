
# Plan: Naprawa pobierania danych reflinku dla wszystkich ról

## Zidentyfikowany problem

Zapytanie w `Auth.tsx` (linie 187-205) używa JOINa klienta Supabase:

```typescript
supabase
  .from('user_reflinks')
  .select(`
    id, target_role, click_count, creator_user_id,
    profiles!user_reflinks_creator_user_id_fkey(
      user_id, first_name, last_name, eq_id, email
    )
  `)
```

**Problem:** Klient Supabase dla niezalogowanego użytkownika wykonuje JOIN między dwiema tabelami z różnymi politykami RLS. Mimo że obie tabele mają polityki pozwalające na odczyt (user_reflinks: "Anyone can read valid reflinks", profiles: "Anyone can search for guardians"), JOIN po stronie klienta może zwracać `null` dla zagnieżdżonego obiektu `profiles`.

**Dotyczy WSZYSTKICH ról:** client, partner, specjalista - ponieważ problem jest w mechanizmie JOINa, nie w danych.

---

## Rozwiązanie

Utworzenie funkcji SQL `SECURITY DEFINER` która:
1. Pobiera dane reflinku z tabeli `user_reflinks`
2. Dołącza dane twórcy z tabeli `profiles` w jednym zapytaniu serwerowym
3. Waliduje czy reflink jest aktywny i niewygasły
4. Zwraca wszystkie potrzebne dane jako płaski obiekt

---

## Zmiany techniczne

### 1. Nowa funkcja SQL: `get_reflink_with_creator`

```sql
CREATE OR REPLACE FUNCTION public.get_reflink_with_creator(reflink_code_param text)
RETURNS TABLE(
  id uuid,
  target_role text,
  click_count integer,
  creator_user_id uuid,
  creator_first_name text,
  creator_last_name text,
  creator_eq_id text,
  creator_email text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.id,
    ur.target_role,
    ur.click_count,
    ur.creator_user_id,
    p.first_name,
    p.last_name,
    p.eq_id,
    p.email
  FROM public.user_reflinks ur
  INNER JOIN public.profiles p ON p.user_id = ur.creator_user_id
  WHERE ur.reflink_code = reflink_code_param
    AND ur.is_active = true
    AND ur.expires_at > now()
  LIMIT 1;
$$;
```

### 2. Modyfikacja `Auth.tsx` - użycie RPC zamiast JOINa

**Plik:** `src/pages/Auth.tsx` (linie 186-243)

Zmiana z bezpośredniego zapytania z JOINem na wywołanie RPC:

```typescript
// PRZED (linie 187-243):
supabase
  .from('user_reflinks')
  .select(`
    id, target_role, click_count, creator_user_id,
    profiles!user_reflinks_creator_user_id_fkey(...)
  `)
  .eq('reflink_code', ref)
  .eq('is_active', true)
  .gt('expires_at', new Date().toISOString())
  .single()
  .then(async ({ data }) => {
    // ... obsługa danych z zagnieżdżonym profiles
  });

// PO:
supabase
  .rpc('get_reflink_with_creator', { reflink_code_param: ref })
  .single()
  .then(async ({ data, error }) => {
    if (error) {
      console.error('Error fetching reflink:', error);
      return;
    }
    if (data) {
      setActiveTab('signup');
      
      // Ustaw rolę z reflinku
      if (data.target_role) {
        setReflinkRole(data.target_role);
        setRole(data.target_role);
      }
      
      // Dane twórcy są bezpośrednio w obiekcie data (płaska struktura)
      if (data.creator_user_id) {
        setSelectedGuardian({
          user_id: data.creator_user_id,
          first_name: data.creator_first_name,
          last_name: data.creator_last_name,
          eq_id: data.creator_eq_id,
          email: data.creator_email
        });
      }
      
      // Inkrementacja click_count (osobne zapytanie)
      await supabase
        .from('user_reflinks')
        .update({ click_count: (data.click_count || 0) + 1 })
        .eq('id', data.id);
      
      // Log click event
      await supabase
        .from('reflink_events')
        .insert({
          reflink_id: data.id,
          event_type: 'click',
          target_role: data.target_role
        });
    }
  });
```

---

## Lista plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa funkcja `get_reflink_with_creator` |
| `src/pages/Auth.tsx` | Zmiana zapytania z JOINa na RPC (linie 186-243) |

---

## Weryfikacja po wdrożeniu

Po implementacji przetestować linki dla wszystkich ról:

| Rola | Przykładowy link | Oczekiwany opiekun |
|------|------------------|-------------------|
| **Specjalista** | `?ref=u-hfed38-121229225` | Wees Mooi (EQID: 121229225) |
| **Klient** | `?ref=u-h50qpy-121118999` | Sebastian Snopek (EQID: 121118999) |
| **Partner** | `?ref=u-17rrt7-121182249` | Joanna Górska (EQID: 121182249) |

Dla każdego linku sprawdzić:
1. Automatyczne przełączenie na zakładkę "Zarejestruj się"
2. Rola ustawiona i zablokowana (disabled)
3. Opiekun wyświetlony z imieniem, nazwiskiem i EQID
4. Pole opiekuna zablokowane (disabled)
5. Komunikat "Rola została ustawiona przez link polecający"
6. Komunikat "Opiekun został ustawiony przez link polecający" (jeśli tłumaczenie istnieje)
