

## Maksymalizacja wysyłki bez zmiany interwału crona

### Obecny stan

| Element | Wartość | Wąskie gardło |
|---------|---------|---------------|
| BATCH_SIZE (bulk sender) | 10 | Małe paczki |
| DB writes per recipient | 4 sekwencyjne `await` (email_logs, occurrence_reminders_sent, legacy guest/user flags) | 4× RTT na odbiorcę |
| Scheduler → bulk sender | Sekwencyjnie (1 term → czeka → następny) | Tylko 1 event naraz |
| Okna czasowe 15min | 5-25 min (20 min szerokości) | Email "za 15 min" wysłany 25 min wcześniej |
| SMTP connection | Nowe połączenie na każdy email | Overhead TLS handshake |

### Plan zmian

#### 1. Bulk sender: BATCH_SIZE 10 → 25, równoległe zapisy DB

**Plik**: `supabase/functions/send-bulk-webinar-reminders/index.ts`

Po wysłaniu SMTP, zamiast 4 sekwencyjnych `await` (linie 609-668), wykonać je równolegle w `Promise.all`:

```text
// TERAZ (4 sekwencyjne await per recipient):
await sendSmtpEmail(...)           // ~500ms
await supabase.from("email_logs").insert(...)         // ~100ms
await supabase.from("occurrence_reminders_sent").upsert(...)  // ~100ms
await supabase.from("guest/event_registrations").update(...)  // ~100ms
// = ~800ms per recipient

// PO ZMIANIE (1 SMTP + 3 równoległe DB):
await sendSmtpEmail(...)           // ~500ms
await Promise.all([
  supabase.from("email_logs").insert(...),
  supabase.from("occurrence_reminders_sent").upsert(...),
  supabase.from("guest/event_registrations").update(...),
])                                  // ~100ms (równolegle)
// = ~600ms per recipient
```

BATCH_SIZE z 10 na 25 — więcej odbiorców przetwarzanych równolegle w `Promise.allSettled`.

**Efekt**: Przy 25 odbiorcach w paczce i 3 równoległych DB writes, jedna paczka zajmie ~600ms zamiast ~8s (10×800ms). Przepustowość rośnie z ~12/s na ~40/s.

#### 2. Scheduler: Równoległe wywołania bulk sendera (paczki po 3 termy)

**Plik**: `supabase/functions/process-pending-notifications/index.ts`

Zamiast sekwencyjnej pętli (linia 436):
```text
for term of matchingTerms:
  await invoke("send-bulk-webinar-reminders", term)
```

Zmienić na paczki po 3 termy równolegle:
```text
for (let i = 0; i < matchingTerms.length; i += 3) {
  const chunk = matchingTerms.slice(i, i + 3);
  const results = await Promise.allSettled(
    chunk.map(term => supabase.functions.invoke("send-bulk-webinar-reminders", { body: {...} }))
  );
  // ... aggregate results
}
```

3 eventy przetwarzane jednocześnie zamiast po kolei.

#### 3. Zawężenie okien czasowych (precyzja)

**Plik**: `supabase/functions/send-bulk-webinar-reminders/index.ts` (linia 177) + `process-pending-notifications/index.ts` (linia 354-358)

```text
Typ      Stare           Nowe            Precyzja
15min    5-25 min        10-20 min       ±5 min (zamiast ±10)
1h       45-75 min       50-70 min       ±10 min
2h       105-135 min     110-130 min     ±10 min
12h      11h-13h         11.5h-12.5h     ±30 min
24h      23h-25h         23.5h-24.5h     ±30 min
```

#### 4. Cron interval_minutes: 30 → 5

**SQL migration**: `UPDATE cron_settings SET interval_minutes = 5` — by funkcja nie skipowała runów. Bez zmiany pg_cron schedule (nadal `*/5`).

### Szacowany efekt

```text
                          PRZED              PO
BATCH_SIZE:               10                 25
DB writes:                4 sekwencyjne      3 równoległe
Termy równolegle:         1                  3
Email/paczka czas:        ~8s                ~0.6s
Przepustowość/run:        ~275 email         ~1500+ email
Precyzja 15min:           ±10 min            ±5 min
Cron schedule:            */5 (bez zmian)    */5 (bez zmian)
```

### Bezpieczeństwo

- `occurrence_reminders_sent` z unique constraint chroni przed duplikatami nawet przy równoległym przetwarzaniu
- `Promise.allSettled` — failure jednego terma/recipienta nie blokuje reszty
- `isTimeoutApproaching()` nadal sprawdzany po każdej paczce

### Pliki do modyfikacji

1. `supabase/functions/send-bulk-webinar-reminders/index.ts` — BATCH_SIZE=25, Promise.all na DB writes, węższe okna w `determineReminderType`
2. `supabase/functions/process-pending-notifications/index.ts` — równoległe paczki terminów po 3, węższe okna w `reminderWindows`
3. **SQL migration** — `UPDATE cron_settings SET interval_minutes = 5`

