

# Plan: Przyspieszenie wysyłki wszystkich emaili w CRON

## Obecny stan

Funkcja `process-pending-notifications/index.ts` zawiera **`delay(1000)`** (1 sekundę) między każdym emailem w **7 miejscach**:

| Krok | Typ emaila | Linia | Delay |
|------|-----------|-------|-------|
| 3 | Welcome emails | ~234 | 1000ms |
| 4 | Training notifications | ~288 | 1000ms |
| 6 | Retry failed emails | ~444 | 1000ms |
| 7 | Training reminders | ~510 | 1000ms |
| 8b | Contact reminders | ~704 | 1000ms |
| 9 | Post-event thank you (users) | ~852 | 1000ms |
| 9 | Post-event thank you (guests) | ~898 | 1000ms |

Każdy email dodatkowo wywołuje osobną Edge Function (`supabase.functions.invoke`), co dodaje ~500ms narzutu. Razem: ~2.5-3s na email, co przy limicie 55s daje max **18-20 emaili na cykl CRON**.

## Proponowane zmiany

### 1. Zmniejszenie delay z 1000ms na 200ms (wszystkie kroki)

Zmiana we wszystkich 7 miejscach. Serwer SMTP obsłuży 5 emaili/s bez problemów.

### 2. Efekt

```text
Przed:  ~2.5s/email → ~20 emaili / cykl CRON (55s)
Po:     ~1.7s/email → ~30 emaili / cykl CRON (55s)
         ↑ wzrost przepustowości o ~50%
```

Dla 78 gości: z ~25 minut do ~15 minut.

### Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/functions/process-pending-notifications/index.ts` | Zamiana `delay(1000)` na `delay(200)` we wszystkich 7 lokalizacjach |

### Bezpieczeństwo

- Logika deduplikacji (flagi `thank_you_sent`, `notification_sent`, `reminder_sent`) pozostaje bez zmian
- Limity czasowe (55s timeout) pozostają bez zmian
- Żadne zmiany w logice wyboru odbiorców

