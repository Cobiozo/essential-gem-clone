

# Zmiany w widżecie "Moje spotkania"

## Zakres zmian

**Plik:** `src/components/dashboard/widgets/MyMeetingsWidget.tsx`

### 1. Pełny tytuł wydarzenia
Linia 396: usunąć klasę `truncate` z `<span>` tytułu, aby wyświetlał pełną nazwę zamiast obciętej.

### 2. Przycisk "Szczegóły" obok "WEJDŹ" dla webinarów/spotkań zespołu
W `getActionButton()` (linie 195-247 — blok "15 min before or during event"): dla typów grupowych (`webinar`, `auto_webinar`, `meeting_public`, `team_training`) dodać obok przycisku WEJDŹ przycisk "Szczegóły" nawigujący do odpowiedniej strony z query param `?event=ID`:
- webinar/auto_webinar → `/events/webinars?event=${event.id}`
- meeting_public/team_training → `/events/team-meetings?event=${event.id}`

Również w bloku linie 260-275 (dalsze spotkania grupowe) — ten przycisk "Szczegóły" już istnieje, bez zmian.

### 3. Flaga języka i przycisk "Zaproś gościa"
Dodać import `InvitationLanguageSelect` i `UserPlus` + stan `inviteLang`. Przy każdym wydarzeniu grupowym (webinar, team_training) dodać pod tytułem/datą sekcję z:
- `<InvitationLanguageSelect>` (flaga języka)
- Przycisk `UserPlus` "Zaproś" kopiujący link zaproszenia

Logika kopiowania analogiczna do `EventCard.tsx` — `copyToClipboard` z szablonem `getInvitationLabels`.

### 4. Grupowanie wg dnia, potem wg typu
Zmienić logikę grupowania (linie 116-123):
- Najpierw pogrupować wydarzenia po dacie dnia (format `yyyy-MM-dd`)
- W ramach każdego dnia pogrupować po `event_type`
- Sortować dni chronologicznie
- W renderze: nagłówek dnia (np. "11 marca 2026"), pod nim sekcje typów z ikoną i badge liczbowym

Struktura renderowania:
```text
┌─ 11 marca 2026 (środa) ─────────────┐
│  🎥 WEBINARY (1)                     │
│    TESTOWY  11 mar 22:10  [WEJDŹ]    │
│  👥 SPOTKANIE ZESPOŁU (2)            │
│    Networking...  11 mar 07:00       │
├─ 12 marca 2026 (czwartek) ───────────┤
│  👥 SPOTKANIE ZESPOŁU (1)            │
│    Networking...  12 mar 07:00       │
└──────────────────────────────────────┘
```

## Pliki do edycji
1. `src/components/dashboard/widgets/MyMeetingsWidget.tsx` — wszystkie 4 zmiany

