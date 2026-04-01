

# Fix: Goście z przeszłych terminów otrzymują przypomnienia o nowych terminach

## Analiza problemu

Wydarzenie "Prezentacja możliwości biznesowych" (`58aac028`) jest **jednoterminowe** (brak `occurrences`). Administrator aktualizuje `start_time` co tydzień na nowy termin. Stare rejestracje gości pozostają ze statusem `registered` i `occurrence_date = null`, `occurrence_index = null`.

W `send-bulk-webinar-reminders`:
- Linia 403: `if (termOccurrenceIndex !== null && event.occurrences)` → **false** dla wydarzeń jednoterminowych
- Efekt: **ZERO filtrowania** — wszyscy goście z `status='registered'` dostają przypomnienia, nawet ci zarejestrowani 2 tygodnie temu na miniony termin

## Rozwiązanie (dwuczęściowe)

### Część 1: Filtrowanie w `send-bulk-webinar-reminders` (natychmiastowa ochrona)

**Plik: `supabase/functions/send-bulk-webinar-reminders/index.ts`**

Po pobraniu gości (linia ~399), dla wydarzeń **bez `occurrences`** (jednoterminowych), dodać filtr:
- Goście których `created_at` jest wcześniejszy niż `start_time - 8 dni` → pominąć
- Logika: jeśli gość zarejestrował się ponad 8 dni przed aktualnym `start_time`, to rejestracja dotyczyła poprzedniego terminu

```ts
// For single-occurrence events, filter out stale registrations
// (guests who registered for a previous occurrence before start_time was updated)
if (!event.occurrences || !Array.isArray(event.occurrences) || event.occurrences.length === 0) {
  const registrationWindowMs = 8 * 24 * 60 * 60 * 1000; // 8 days
  const cutoffDate = new Date(termDatetime.getTime() - registrationWindowMs);
  const beforeCount = guests.length;
  guests = guests.filter((g: any) => new Date(g.created_at) >= cutoffDate);
  if (beforeCount !== guests.length) {
    console.log(`[bulk-reminders] Single-occurrence stale guest filter: ${beforeCount} → ${guests.length} (removed ${beforeCount - guests.length} old registrations)`);
  }
}
```

To samo dla `userRegs` (rejestracje użytkowników).

Wymaga dodania `created_at` do selectów na liniach 395 i 431.

### Część 2: CRON — automatyczne zamykanie starych rejestracji

**Plik: `supabase/functions/process-pending-notifications/index.ts`**

Dodać nowy krok na początku CRON-a: dla wydarzeń jednoterminowych (bez `occurrences`) których `end_time` już minęło, oznaczyć wszystkie rejestracje gości jako `completed`:

```ts
// Step 0: Close stale guest registrations for single-occurrence events
// whose end_time has passed
const { data: pastSingleEvents } = await supabase
  .from("events")
  .select("id, title, end_time")
  .lt("end_time", now.toISOString())
  .eq("is_active", true)
  .is("occurrences", null);

for (const evt of (pastSingleEvents || [])) {
  const { data: staleGuests, error: staleErr } = await supabase
    .from("guest_event_registrations")
    .update({ status: "completed" })
    .eq("event_id", evt.id)
    .eq("status", "registered")
    .select("id");
  
  if (staleGuests && staleGuests.length > 0) {
    console.log(`[CRON] Closed ${staleGuests.length} stale guest registrations for ended event: ${evt.title}`);
  }
}
```

To samo dla `event_registrations` (użytkownicy zarejestrowani).

**Uwaga**: To zadziała tylko gdy `end_time < now` — czyli PO zakończeniu wydarzenia. Następny CRON zamknie rejestracje automatycznie, zanim admin zaktualizuje `start_time` na nowy termin.

### Część 3: Natychmiastowe czyszczenie obecnych danych

Migracja SQL do jednorazowego zamknięcia starych rejestracji gości:

```sql
UPDATE guest_event_registrations 
SET status = 'completed'
WHERE event_id = '58aac028-c68f-45c8-9999-d34b5ebb9ced'
  AND status = 'registered'
  AND created_at < '2026-03-30T00:00:00Z';
```

## Pliki do edycji

1. `supabase/functions/send-bulk-webinar-reminders/index.ts` — filtr stale registrations
2. `supabase/functions/process-pending-notifications/index.ts` — auto-close po zakończeniu
3. Migracja SQL — jednorazowe czyszczenie

## Efekt

- Goście zarejestrowani na miniony termin nie otrzymają przypomnień o nowym terminie
- CRON automatycznie zamyka rejestracje po zakończeniu wydarzenia
- Filtr w bulk-reminders stanowi dodatkowe zabezpieczenie

