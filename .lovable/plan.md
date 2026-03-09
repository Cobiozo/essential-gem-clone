

# Automatyczne Webinary — Cykliczne Odtwarzanie Nagrań MP4

## Koncepcja

System "Auto-Webinar" — pokój webinarowy odtwarzający nagrania MP4 w pętli co godzinę. Uczestnicy dołączają przez standardowy mechanizm rejestracji/zaproszeń i oglądają zsynchronizowane wideo (wszyscy widzą ten sam moment nagrania, zsynchronizowany z pełną godziną). Nie wymaga hosta na żywo.

## Architektura

```text
┌──────────────────────┐
│  Panel Admina        │
│  - Upload MP4        │
│  - Playlist / kolejka│
│  - Konfiguracja      │
└────────┬─────────────┘
         │
   ┌─────▼──────────┐       ┌────────────────────┐
   │ auto_webinar_   │       │ events (existing)  │
   │ videos (nowa)   │       │ event_type =       │
   │                 │       │ 'auto_webinar'     │
   └─────────────────┘       └────────┬───────────┘
                                      │
                          ┌───────────▼────────────┐
                          │ AutoWebinarRoom.tsx     │
                          │ - HTML5 <video> player  │
                          │ - Sync do pełnej godz.  │
                          │ - Chat (opcjonalny)     │
                          │ - Lista uczestników     │
                          └────────────────────────┘
```

## Zmiany w bazie danych

### Nowa tabela: `auto_webinar_videos`
- `id`, `title`, `description`, `video_url` (ścieżka MP4 na VPS), `duration_seconds`, `thumbnail_url`
- `sort_order` (kolejność w playliście), `is_active`, `uploaded_by`, `created_at`

### Nowa tabela: `auto_webinar_config`
- `id`, `is_enabled` (globalny on/off), `playlist_mode` ('sequential' | 'random')
- `start_hour` (od której godziny, np. 8), `end_hour` (do której, np. 22)
- `interval_minutes` (domyślnie 60), `event_id` (powiązane wydarzenie)
- `chat_enabled`, `show_participant_count`

### Tabela `events` — nowy event_type
- Dodanie `'auto_webinar'` do istniejącego systemu wydarzeń
- Jedno wydarzenie typu `auto_webinar` = punkt wejścia do pokoju
- Rejestracja i zaproszenia działają identycznie jak dla webinarów

## Nowe komponenty frontend

1. **`AutoWebinarManagement.tsx`** — panel admina: upload MP4, zarządzanie playlistą (drag & drop kolejność), konfiguracja godzin i trybu
2. **`AutoWebinarRoom.tsx`** — pokój widza:
   - Oblicza która minuta nagrania powinna być odtwarzana (sync do pełnej godziny)
   - HTML5 `<video>` z `currentTime` ustawionym na offset od początku godziny
   - Jeśli wideo krótsze niż 60 min → ekran "Następny webinar za X minut"
   - Jeśli dłuższe → kontynuacja w następnej godzinie
   - Opcjonalny czat (Supabase Realtime) i licznik uczestników
3. **`AutoWebinarCard.tsx`** — karta wydarzenia na liście z informacją "Następny start za X minut"

## Logika synchronizacji

```text
currentHour = floor(now / 60min)
videoIndex = (currentHour - startHour) % totalVideos  // sequential
elapsed = now - currentHour                            // minuty od pełnej godziny
player.currentTime = elapsed (w sekundach)
```

Każdy uczestnik dołączający w trakcie godziny widzi wideo od tego samego momentu — efekt "live".

## Mechanizm uploadu

Wykorzystanie istniejącego VPS upload (server.js) dla plików MP4 — ten sam pipeline co inne media, z zapisem URL w `auto_webinar_videos`.

## Zaproszenia i rejestracja

Wydarzenie `auto_webinar` korzysta z istniejącego systemu:
- Widoczne w kalendarzu i liście wydarzeń
- Rejestracja standardowa (przycisk "Zapisz się")
- Linki zaproszeniowe (`/e/{slug}?ref={EQID}`)
- Tylko zarejestrowani użytkownicy mogą dołączyć do pokoju

## Zakres plików

| Plik | Zmiana |
|------|--------|
| `src/components/admin/AutoWebinarManagement.tsx` | **Nowy** — panel admina |
| `src/components/auto-webinar/AutoWebinarRoom.tsx` | **Nowy** — pokój odtwarzania |
| `src/components/auto-webinar/AutoWebinarCard.tsx` | **Nowy** — karta wydarzenia |
| `src/components/auto-webinar/AutoWebinarCountdown.tsx` | **Nowy** — timer do następnego startu |
| `src/types/events.ts` | Dodanie `'auto_webinar'` do `EventType` |
| `src/components/admin/EventsManagement.tsx` | Zakładka auto-webinarów |
| `src/components/events/EventCardCompact.tsx` | Obsługa typu `auto_webinar` |
| `src/pages/AutoWebinar.tsx` | **Nowy** — strona pokoju |
| `src/App.tsx` | Routing `/auto-webinar/:id` |
| Migracja SQL | 2 nowe tabele + RLS |

## Ograniczenia i uwagi

- Wideo nie jest streamowane przez WebRTC — to HTML5 `<video>` z synchronizacją czasową, co jest znacznie lżejsze i skalowalne
- Czat opcjonalny przez Supabase Realtime (kanał broadcast)
- System działa niezależnie od innych wydarzeń — nie blokuje kalendarza
- Admin może włączyć/wyłączyć auto-webinary jednym przełącznikiem

