

## Problem: Obecności kumulowane i przypisywane do złych webinarów

### Diagnoza

Dane w bazie:
- Email `tatanabacznosci@gmail.com` ma **10 rejestracji** na różne sloty i różne wydarzenia (BO + HC), wszystkie z tego samego dnia
- Ma **7 rekordów widoku** w `auto_webinar_views`, wszystkie z `guest_registration_id = null`
- Jeden widok trwa 2166 sekund (36m 6s) na filmie HC (`b80557fa`)
- Fallback w `ContactEventInfoButton.tsx` (linie 106-124) dopasowuje widoki do rejestracji **wyłącznie po dacie** (`regDay === viewDay`)
- Efekt: ten sam widok 36m 6s jest przypisywany do WSZYSTKICH rejestracji z tego dnia — niezależnie od wydarzenia (BO vs HC) i slotu

### Łańcuch powiązań w bazie

```text
guest_event_registrations.event_id  →  auto_webinar_config.event_id  →  auto_webinar_videos.config_id  →  auto_webinar_views.video_id
```

Rejestracja ma `event_id`. Widok ma `video_id`. Można je powiązać przez tabelę config.

### Plan naprawy

**Plik: `src/components/team-contacts/ContactEventInfoButton.tsx`**

Zmiana logiki fallback (linie 92-126):

1. Pobrać mapowanie `video_id → event_id` z tabel `auto_webinar_videos` + `auto_webinar_config`:
   - JOIN: `auto_webinar_videos.config_id = auto_webinar_config.id` → pobieramy `video_id` i `event_id`
   - Tworzymy `Map<video_id, event_id>`

2. Przy pobieraniu widoków po email (`emailViews`), dołączyć też `video_id` do selecta

3. Zmienić dopasowanie z samego dnia na:
   - **event_id musi się zgadzać** (widok.video_id → mapowanie → event_id === rejestracja.event_id)
   - **slot_time musi się zgadzać** (porównanie godziny widoku z `slot_time` rejestracji, z tolerancją ±30 minut)
   - Dopiero potem brać widok z największym `watch_duration_seconds`

4. Każdy użyty widok oznaczyć jako "zajęty" (Set), aby ten sam widok nie był przypisany do wielu rejestracji

### Efekt

- Każda rejestracja na konkretny webinar pokaże TYLKO dane z tego webinaru
- Widok HC nie będzie przypisany do rejestracji BO i odwrotnie
- Widok z jednego slotu nie będzie przypisany do innego slotu
- Nie narusza żadnej istniejącej funkcjonalności — zmiana dotyczy wyłącznie logiki fallback w jednym pliku

