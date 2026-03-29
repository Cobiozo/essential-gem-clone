

## Plan: Panel admina — resetowanie zapisów na wydarzenia

### Co zostanie dodane

W panelu `EventRegistrationsManagement` (zakładka "Rejestracje na wydarzenia") dodamy trzy opcje resetowania:

1. **Reset globalny** — anuluje WSZYSTKIE aktywne zapisy na wybrane wydarzenie (wszyscy użytkownicy + goście)
2. **Reset dla wybranego użytkownika** — anuluje zapisy konkretnego użytkownika na wybrane wydarzenie (przycisk przy każdym wierszu)
3. **Reset dla roli** — anuluje zapisy wszystkich użytkowników z daną rolą (client/partner/specjalista) na wybrane wydarzenie

### Interfejs

- **Przycisk globalny**: "Resetuj wszystkie zapisy" z potwierdzeniem w dialogu (ile rekordów zostanie anulowanych)
- **Przycisk per-użytkownik**: Ikona X przy każdym wierszu rejestracji ze statusem "registered"
- **Filtr po roli**: Dropdown "Resetuj zapisy dla roli..." z opcjami (client, partner, specjalista, admin)
- Każda akcja wymaga potwierdzenia w dialogu z liczbą dotkniętych rekordów

### Logika

Wszystkie operacje wykonują UPDATE na `event_registrations`:
```sql
SET status = 'cancelled', cancelled_at = NOW()
WHERE event_id = :eventId AND status = 'registered'
  -- + opcjonalnie: AND user_id = :userId
  -- + opcjonalnie: AND user_id IN (SELECT user_id FROM profiles WHERE role = :role)
```

Dla gości analogicznie na `guest_event_registrations`.

Po resecie — automatyczne odświeżenie listy rejestracji.

### Pliki do zmiany

- `src/components/admin/EventRegistrationsManagement.tsx` — dodanie przycisków, dialogów potwierdzenia i handlerów resetowania

### Szczegóły techniczne

- Operacje korzystają z istniejącego klienta Supabase (RLS pozwala adminowi na update)
- Toast z informacją ile zapisów zostało anulowanych
- Przycisk globalny i per-rola umieszczone obok istniejącego przycisku "Wyślij follow-up"
- Przycisk per-użytkownik w kolumnie "Akcje" tabeli rejestracji

