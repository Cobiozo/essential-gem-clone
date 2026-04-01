

# Fix: Brak danych o obecności gościa w CRM + brak emaila po webinarze

## Zdiagnozowane problemy

Zbadałem bazę danych i kod. Znalazłem **trzy oddzielne przyczyny**:

### Problem 1: CRM nie widzi obecności gościa (RLS)
Widoki (`auto_webinar_views`) tego gościa mają `guest_registration_id = NULL`. CRM próbuje fallbacku po emailu, ale **polityka RLS blokuje partnerowi dostęp** do takich wierszy. Polityka `users_select_own_contact_views` wymaga `guest_registration_id IS NOT NULL` — więc partner nie może odczytać żadnego widoku bez powiązania.

### Problem 2: `guest_registration_id` nie jest zapisywany na widoku
Hook trackingowy tworzy widok z `guest_registration_id = null` (bo resolution jeszcze nie zakończył się), a późniejszy update albo nie dociera (race condition), albo jest blokowany. Obie ścieżki (INSERT z wartością i UPDATE po fakcie) muszą być bardziej niezawodne.

### Problem 3: Email po webinarze nigdy się nie wysyła
Wydarzenie "Bussines Opportunity" ma `end_time = 2035-12-31` (odległa data), `occurrences = null`. CRON szuka wydarzeń z `end_time` w ostatnich 2 godzinach — więc **nigdy nie znajdzie tego wydarzenia**. Auto-webinary ze slotami wymagają innej logiki: koniec slotu = `slot_time + czas_trwania_wideo`.

---

## Rozwiązanie

### 1. Nowa polityka RLS na `auto_webinar_views` (migracja SQL)

Dodać politykę SELECT pozwalającą partnerowi czytać widoki po `guest_email`, gdy email należy do jego kontaktu:

```sql
CREATE POLICY "partners_select_views_by_contact_email"
ON public.auto_webinar_views FOR SELECT TO authenticated
USING (
  guest_email IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM team_contacts tc
    WHERE tc.email = auto_webinar_views.guest_email
      AND tc.user_id = auth.uid()
      AND tc.is_active = true
  )
);
```

To odblokuje fallback w ContactEventInfoButton bez `guest_registration_id`.

### 2. Poprawka linkowania `guest_registration_id` w trackingu

W `useAutoWebinarTracking.ts`:
- W `createView`: dodać retry — jeśli INSERT przeszedł z `guest_registration_id = null`, uruchomić jednorazowy setTimeout (2s) który ponownie sprawdzi ref i zaktualizuje
- W useEffect na `guestRegistrationId`: dodać retry z krótkim opóźnieniem jeśli `viewId.current` jest jeszcze null

### 3. Logika post-event emaili dla auto-webinarów ze slotami

W `process-pending-notifications/index.ts` (Step 9), po przetworzeniu standardowych `endedTerms`, dodać osobny blok:

1. Pobrać wszystkie aktywne `auto_webinar_config` z `event_id`
2. Pobrać aktywne wideo i ich `duration_seconds`
3. Pobrać rejestracje gości z `slot_time` (bez `occurrence_date`) gdzie `thank_you_sent = false`
4. Dla każdej rejestracji obliczyć: `slot_end = registered_at_date + slot_time + duration_seconds`
5. Jeśli `slot_end` mieści się w oknie "ostatnie 2 godziny → teraz" → przetworzyć gościa (sprawdzić obecność → wysłać email)

```
Logika:
slot_datetime = registered_at.date + 'T' + slot_time (w strefie Warsaw)
slot_end = slot_datetime + video.duration_seconds
if (slot_end >= 2h_ago && slot_end <= now) → process guest
```

### Pliki do edycji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa polityka RLS `partners_select_views_by_contact_email` |
| `src/hooks/useAutoWebinarTracking.ts` | Retry linkowania `guest_registration_id` |
| `supabase/functions/process-pending-notifications/index.ts` | Blok post-event dla auto-webinar slotów |

