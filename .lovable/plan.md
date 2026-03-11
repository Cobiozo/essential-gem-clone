

# Fallback: ostrzeżenie do admina gdy brak linku w wydarzeniu

## Problem
Jeśli wydarzenie ma puste `zoom_link` i `location`, uczestnicy nie otrzymają linku do dołączenia — ale nikt nie zostaje o tym powiadomiony.

## Rozwiązanie
W trzech kluczowych miejscach dodać sprawdzenie: jeśli `zoom_link` i `location` są puste, wysłać powiadomienie do wszystkich adminów (`user_notifications`) z ostrzeżeniem i linkiem do edycji wydarzenia.

### Zmiana 1: `send-webinar-confirmation/index.ts`
W bloku immediate reminder (linia ~632), gdy `immediateZoomLink` jest pusty — zamiast po cichu pomijać, wstawić insert do `user_notifications` dla adminów:
```typescript
if (!immediateZoomLink) {
  // Warn admins: event has no join link
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');
  if (admins?.length) {
    await supabase.from('user_notifications').insert(
      admins.map(a => ({
        user_id: a.user_id,
        notification_type: 'system',
        source_module: 'events',
        title: 'Brak linku do wydarzenia!',
        message: `Wydarzenie "${eventTitle}" (ID: ${eventId}) nie ma skonfigurowanego linku Zoom ani lokalizacji. Uczestnik ${firstName} (${email}) zarejestrował się, ale nie otrzymał linku do dołączenia.`,
        link: '/admin/events',
        metadata: { event_id: eventId, severity: 'warning' }
      }))
    );
}
```

### Zmiana 2: `send-bulk-webinar-reminders/index.ts`
Po linii ~340 (`const zoomLink = ...`), jeśli `zoomLink` jest pusty i `config.includeLink` jest true, wysłać analogiczne ostrzeżenie do adminów:
```typescript
if (!zoomLink && config.includeLink) {
  // Insert admin warning notification
}
```

### Zmiana 3: `process-pending-notifications/index.ts`
Analogiczny check przy wysyłaniu przypomnień z linkiem — jeśli event nie ma linku, powiadomić adminów.

### Pliki do edycji
1. `supabase/functions/send-webinar-confirmation/index.ts` — warning przy pustym linku w immediate reminder
2. `supabase/functions/send-bulk-webinar-reminders/index.ts` — warning przy pustym linku w bulk reminders
3. `supabase/functions/process-pending-notifications/index.ts` — warning przy pustym linku w CRON reminders

