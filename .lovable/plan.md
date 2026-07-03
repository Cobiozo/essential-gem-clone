## Problem — dlaczego liczniki nie rosły

W `src/pages/HealthyKnowledgePlayer.tsx` (linie 69–75) licznik był podbijany tak:

```ts
await supabase
  .from('healthy_knowledge')
  .update({ view_count: data.view_count + 1 })
  .eq('id', id);
```

Dwa błędy:

1. **RLS blokuje UPDATE dla nie-adminów.** Polityki na `healthy_knowledge`:
   - `hk_admin_full_access` — `ALL` tylko gdy `is_admin()`
   - `hk_role_based_read` — tylko `SELECT` dla partnera/klienta/specjalisty
   
   Efekt: gdy podgląd otwierał partner, klient, specjalista lub gość (HK OTP), UPDATE po cichu nie zapisywał żadnego wiersza (RLS zwraca 0 rows, brak błędu w UI). Rósł tylko licznik przy odsłonach administratora.

2. **Race condition read-modify-write.** Nawet dla admina dwa równoległe otwarcia odczytywały tę samą wartość i zapisywały `+1` zamiast `+2`.

## Czy można nadrobić przeszłe wyświetlenia

**Nie w sposób wiarygodny.** W bazie nie ma tabeli logów odsłon dla `healthy_knowledge` (jest tylko skalarne `view_count`, brak `healthy_knowledge_views` czy podobnej). Nie istnieje więc źródło prawdy, z którego dałoby się odtworzyć historyczne kliknięcia „Podgląd". Jedyne, co można zrobić uczciwie, to zresetować liczniki do zera i liczyć od nowa (do decyzji użytkownika — domyślnie **nie ruszam** istniejących wartości, żeby nie kasować danych admin-owych).

## Naprawa

### 1) Migracja — atomowy inkrement omijający RLS

```sql
CREATE OR REPLACE FUNCTION public.increment_hk_view(_material_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.healthy_knowledge
     SET view_count = COALESCE(view_count, 0) + 1
   WHERE id = _material_id
     AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.increment_hk_view(uuid) TO authenticated, anon;
```

- `SECURITY DEFINER` — pozwala każdemu zalogowanemu (i anonimowemu gościowi HK OTP) podbić licznik bez otwierania UPDATE-a na całej tabeli.
- Jedno atomowe `UPDATE ... SET x = x + 1` — koniec race condition.
- `is_active = true` — nie liczymy odsłon ukrytych materiałów.

### 2) `src/pages/HealthyKnowledgePlayer.tsx` (linie 69–75)

Zamiast `.update({ view_count: ... + 1 })`:

```ts
if (!hasIncrementedViewRef.current) {
  hasIncrementedViewRef.current = true;
  await supabase.rpc('increment_hk_view', { _material_id: id });
}
```

Ref `hasIncrementedViewRef` zostaje — chroni przed podwójnym naliczeniem w tym samym mountowaniu (StrictMode / szybki nawrót).

## Zakres — czego NIE zmieniam

- Widok karty `view_count` (linia 300) — czyta tę samą kolumnę, po naprawie sam się aktualizuje.
- Kolumna `view_count`, polityki RLS, uprawnienia na tabeli — bez zmian.
- Statystyki HK OTP (`HkStatisticsPanel`) — poza zakresem.
- Historyczne liczby — bez zmian (brak danych do rekonstrukcji).
