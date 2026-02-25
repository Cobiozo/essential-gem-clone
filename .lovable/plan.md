
## Reorganizacja zakladek w Panelu Lidera - Spotkania indywidualne

### Zmiany

**1. Zakladka "Harmonogram" -> "Najblizsze Twoje spotkania" (tylko przyszle, aktywne)**

Plik: `src/components/events/LeaderMeetingSchedule.tsx`
- Zmienic zapytanie: dodac filtr `.eq('is_active', true)` i `.gte('start_time', new Date().toISOString())` -- tylko przyszle aktywne spotkania
- Zmienic pusty stan: "Brak zaplanowanych spotkan" zamiast "Brak zarezerwowanych spotkan"
- Sortowanie od najwczesniejszych (juz jest ascending: true)

**2. Zakladka "Historia" -- przeszle + anulowane + mozliwosc usuwania**

Plik: `src/components/events/IndividualMeetingsHistory.tsx`
- Zmienic zapytanie: zamiast `lt('end_time', now)` uzyc logiki OR: spotkania ktore sie odbyly (end_time < now) ORAZ spotkania anulowane (is_active = false, niezaleznie od daty)
- Pobrac dodatkowe pola: `description`, `is_active` -- do wyswietlenia pelnych danych (prospekt, cel, notatki) i statusu (odbyte/anulowane)
- Dodac przycisk "Usun" (ikona kosza) przy kazdym spotkaniu w historii
- Usuwanie: `supabase.from('events').delete().eq('id', meetingId).eq('host_user_id', user.id)` z potwierdzeniem (AlertDialog)
- Wyswietlic badge statusu: "Odbyte" (zielony) vs "Anulowane" (czerwony)
- Wyswietlic dane prospekta/cel konsultacji (parsowanie JSON z description)

**3. Zmiana nazw zakladek**

Plik: `src/components/events/UnifiedMeetingSettingsForm.tsx` (linie 431-442)
- "Ustawienia" -> "Ustawienia Twojej dostepnosci"
- "Harmonogram" -> "Najblizsze Twoje spotkania"
- "Historia" -- bez zmian

### Podsumowanie plikow

| Plik | Zmiana |
|------|--------|
| `UnifiedMeetingSettingsForm.tsx` | Zmiana nazw 2 zakladek (linie 431-437) |
| `LeaderMeetingSchedule.tsx` | Filtr: tylko przyszle aktywne spotkania |
| `IndividualMeetingsHistory.tsx` | Dodac: anulowane spotkania, pelne dane, przycisk usuwania z potwierdzeniem |
