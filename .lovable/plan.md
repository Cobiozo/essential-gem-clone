

## Problem

Dwa bledy w panelu lidera:

1. **Usuwanie nie odswierza listy**: Zapytanie w `LeaderEventsView` nie filtruje po `is_active`, wiec "usuniete" wydarzenia nadal sa widoczne.

2. **Brak ostrzezenia o kolizji**: Zapytanie sprawdzajace kolizje dziala pod RLS. Polityka `events_select_for_users` wymaga `is_active = true` ORAZ warunkow widocznosci (np. `visible_to_partners`). Jesli kolidujace wydarzenie nie jest widoczne dla roli lidera, zapytanie zwraca pusty wynik i dialog kolizji sie nie pojawia.

## Rozwiazanie

### Zmiana 1: Filtr `is_active` w liscie wydarzen

**Plik: `src/components/leader/LeaderEventsView.tsx`** (linia 33)

Dodanie `.eq('is_active', true)` do zapytania pobierajacego wydarzenia lidera. Dzieki temu soft-deleted wydarzenia znikna natychmiast po invalidacji cache.

### Zmiana 2: Funkcja RPC do sprawdzania kolizji (omija RLS)

Utworzenie funkcji SQL `check_event_conflicts` ktora sprawdza kolizje po stronie serwera z uprawnieniami `SECURITY DEFINER` — widzi wszystkie aktywne wydarzenia niezaleznie od roli uzytkownika.

```sql
CREATE FUNCTION check_event_conflicts(
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_exclude_event_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, title text, event_type text)
AS $$
  SELECT id, title, event_type
  FROM events
  WHERE is_active = true
    AND event_type IN ('webinar', 'team_training', 'spotkanie_zespolu')
    AND start_time < p_end_time
    AND end_time > p_start_time
    AND (p_exclude_event_id IS NULL OR id != p_exclude_event_id)
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Zmiana 3: Uzycie RPC w formularzach

**Pliki: `WebinarForm.tsx` i `TeamTrainingForm.tsx`**

Zamiana bezposredniego zapytania `.from('events').select(...)` na wywolanie RPC:

```typescript
const { data: conflictingEvents } = await supabase.rpc('check_event_conflicts', {
  p_start_time: startTime,
  p_end_time: endTime,
  p_exclude_event_id: editingEvent?.id || null,
});
```

Dzieki temu lider zobaczy kolizje z KAZDYM aktywnym wydarzeniem na platformie, niezaleznie od ustawien widocznosci.

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `LeaderEventsView.tsx` | Dodanie `.eq('is_active', true)` w zapytaniu |
| Migracja SQL | Nowa funkcja `check_event_conflicts` (SECURITY DEFINER) |
| `WebinarForm.tsx` | Zamiana zapytania kolizji na `supabase.rpc(...)` |
| `TeamTrainingForm.tsx` | Zamiana zapytania kolizji na `supabase.rpc(...)` |

