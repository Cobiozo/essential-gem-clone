

# Problem: CRON UI zmienia tylko tabelę `cron_settings`, nie aktualizuje prawdziwego `pg_cron`

## Diagnoza

Interfejs admina (`CronJobsManagement.tsx`) przy zmianie interwału aktualizuje **tylko** tabelę `cron_settings` (pole `interval_minutes`). Natomiast prawdziwy harmonogram `pg_cron` pozostaje ustawiony na `'0,30 * * * *'` (co 30 minut) — tak jak w migracji `20260304130305`.

Edge function `process-pending-notifications` jest wywoływana przez `pg_cron` co 30 minut. Wewnątrz funkcji jest dodatkowy check `interval_minutes`, ale to nic nie daje — jeśli `pg_cron` uruchamia funkcję co 30 minut, to nawet przy ustawieniu 5 minut, funkcja po prostu nie zostanie wywołana częściej.

```text
Admin UI → cron_settings.interval_minutes = 5  ✅ zapisano
pg_cron → schedule = '0,30 * * * *'            ❌ nie zmieniono!
Efekt: funkcja uruchamia się co 30 min, nie co 5 min
```

## Plan naprawy

### Zmiana 1: Natychmiastowa aktualizacja pg_cron na `*/5 * * * *`
Nowa migracja SQL, która zmieni harmonogram `pg_cron` na co 5 minut. To zapewni że `pg_cron` wywołuje edge function co 5 minut. Wewnętrzny check `interval_minutes` w edge function nadal kontroluje czy faktycznie uruchomić logikę (jeśli admin ustawi np. 15 minut, funkcja zostanie wywołana co 5 minut ale wykona się tylko co 15 minut).

### Zmiana 2: Dynamiczna aktualizacja pg_cron z UI
Utworzyć funkcję bazodanową `update_cron_schedule(p_job_name TEXT, p_interval_minutes INT)` (SECURITY DEFINER, admin-only), która:
- Oblicza odpowiedni cron expression (`*/5`, `*/10`, `*/15`, `0,30` itd.)
- Wywołuje `cron.unschedule()` + `cron.schedule()` z nowym harmonogramem

W `CronJobsManagement.tsx` → `handleIntervalChange` — po zapisie do `cron_settings`, wywołać `supabase.rpc('update_cron_schedule', ...)` żeby rzeczywiście zaktualizować `pg_cron`.

### Pliki do edycji
1. **Migracja SQL** — `cron.unschedule` + `cron.schedule` z `*/5 * * * *` + funkcja `update_cron_schedule`
2. **`src/components/admin/CronJobsManagement.tsx`** — po `handleIntervalChange` wywołać RPC `update_cron_schedule`

