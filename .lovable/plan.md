

## Rozszerzenie dialogu kolizji o dodatkowe informacje

### Problem
Dialog kolizji pokazuje tylko tytul i typ wydarzenia. Brakuje:
1. Kto prowadzi (host)
2. Przedział czasowy kolidujacego wydarzenia
3. Ilu czlonkow zespolu lidera jest zapisanych na to wydarzenie

### Rozwiazanie

#### Zmiana 1: Rozszerzenie funkcji SQL `check_event_conflicts`

Funkcja RPC zwraca obecnie `(id, title, event_type)`. Rozszerzymy ja o:
- `host_name text` - nazwa prowadzacego
- `conflict_start timestamptz` - start kolidujacego terminu
- `conflict_end timestamptz` - koniec kolidujacego terminu
- `team_registered_count bigint` - liczba zapisanych czlonkow zespolu

Dodajemy nowy parametr `p_user_id uuid DEFAULT NULL` - ID aktualnego uzytkownika, aby moc policzyc zapisanych czlonkow jego zespolu (uzytkownicy z tym samym `upline_eq_id` co `eq_id` lidera).

Logika liczenia zespolu:
```text
SELECT COUNT(*) FROM event_registrations er
JOIN profiles p ON p.user_id = er.user_id
WHERE er.event_id = e.id
  AND er.status = 'registered'
  AND p.upline_eq_id = (SELECT eq_id FROM profiles WHERE user_id = p_user_id)
```

Dla czesci 1 (bez occurrences): `conflict_start = e.start_time`, `conflict_end = e.end_time`
Dla czesci 2 (z occurrences): `conflict_start/end` obliczone z jsonb

#### Zmiana 2: Aktualizacja UI dialogu kolizji

W obu formularzach (`WebinarForm.tsx` i `TeamTrainingForm.tsx`) dialog kolizji wyswietli liste wszystkich kolidujacych wydarzen w formie kartek, kazda zawierajaca:
- Tytul i typ wydarzenia (jak dotychczas)
- Prowadzacy (host_name)
- Przedzial czasowy (np. "17:00 - 18:30")
- Liczba zapisanych czlonkow zespolu (np. "3 osoby z Twojego zespolu sa zapisane")

#### Zmiana 3: Przekazanie user_id do RPC

W wywolaniach `supabase.rpc('check_event_conflicts', ...)` dodanie parametru `p_user_id: user.id`.

### Podsumowanie zmian

| Element | Zmiana |
|---------|--------|
| Migracja SQL | Rozszerzenie `check_event_conflicts` o `host_name`, `conflict_start`, `conflict_end`, `team_registered_count`, nowy parametr `p_user_id` |
| `WebinarForm.tsx` | Przekazanie `p_user_id`, rozbudowa dialogu kolizji |
| `TeamTrainingForm.tsx` | Przekazanie `p_user_id`, rozbudowa dialogu kolizji |
| `types.ts` | Automatyczna aktualizacja typow RPC |

### Szczegoly techniczne SQL

Nowa sygnatura:
```sql
RETURNS TABLE(
  id uuid,
  title text,
  event_type text,
  host_name text,
  conflict_start timestamptz,
  conflict_end timestamptz,
  team_registered_count bigint
)
```

Lateralne podzapytanie dla team_registered_count:
```sql
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS cnt
  FROM event_registrations er
  JOIN profiles p2 ON p2.user_id = er.user_id
  WHERE er.event_id = e.id AND er.status = 'registered'
    AND p2.upline_eq_id = (SELECT eq_id FROM profiles WHERE user_id = p_user_id)
) team_count ON true
```

