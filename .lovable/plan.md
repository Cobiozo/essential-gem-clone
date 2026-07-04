## Problem 1: Bug — nie można włączyć własnego linku Zoom

W `OccurrencesEditor.tsx` `hasCustomLink` wymaga niepustego stringa po `trim()`, ale po włączeniu przełącznika ustawiamy `zoom_link: ''`. Efekt: przełącznik natychmiast wraca do "off" i pole `<Input>` nigdy się nie pojawia.

**Fix:** rozdzielić stan "tryb własnego linku" od "wartość URL". Użyć osobnego lokalnego stanu `customEnabled[index]` (albo sentinel — `zoom_link === null` = użyj głównego, `''` lub string = własny). Najczystsze: traktować `zoom_link !== null && zoom_link !== undefined` jako "custom mode włączony" (nawet pusty string). Wtedy `hasCustomLink = occ.zoom_link !== null && occ.zoom_link !== undefined`, a switch przełącza między `null` a `''`.

## Problem 2: Biblioteka linków Zoom liderów + wybór w terminie

### Baza danych
Nowa tabela `leader_zoom_links`:
- `user_id` (właściciel — lider)
- `label` (np. "Główny pokój", "Spotkania 1:1")
- `zoom_url`
- `is_default` (opcjonalnie)
- RLS: lider zarządza swoimi; admin czyta wszystkie; specialist/klient bez dostępu.

### Panel Lidera — nowa zakładka "Moje linki Zoom"
Nowy komponent `LeaderZoomLinks.tsx` dodany do routingu Panelu Lidera (lista + dodaj/edytuj/usuń). Zwykły CRUD na `leader_zoom_links` z filtrem `user_id = auth.uid()`.

### Edytor terminu w Zdarzeniach (admin)
W `OccurrencesEditor` zamiast pojedynczego switcha — Select "Źródło linku Zoom":
1. **Główny link wydarzenia** (domyślnie) → `zoom_link: null`
2. **Własny link dla tego terminu** → `zoom_link: '<url>'` + pole Input
3. **Link lidera** → `zoom_link: '<url wybrany z listy>'` + `zoom_link_source: 'leader:<user_id>:<link_id>'` (dla śledzenia)

Aby odróżnić "custom URL" vs "leader link" po zapisie, dodać opcjonalne pole `zoom_link_source?: 'custom' | 'main' | { leader_user_id: string; link_id: string }` w `EventOccurrence` (JSONB, nie wymaga migracji `events`).

Admin ładuje listę linków wszystkich liderów przez query do `leader_zoom_links` (z joinem do `profiles` dla imion). Nowy hook `useLeaderZoomLinks()`.

### Wybór linku lidera — UI
W wierszu terminu, gdy wybrane "Link lidera": pokazać `<Combobox>`/`<Select>` z opcjami zgrupowanymi po liderze: "Jan Kowalski — Główny pokój (https://...)". Po wyborze zapisuje się URL do `zoom_link` + metadane do `zoom_link_source`.

### Consumers
`getOccurrenceJoinLink()` w `useOccurrences.ts` nie zmienia się — nadal czyta `occurrence.zoom_link || event.zoom_link`. Źródło (main/custom/leader) to tylko metadana admina.

## Pliki do zmiany

- `supabase/migrations/...sql` — nowa tabela `leader_zoom_links` + GRANT + RLS + trigger `updated_at`
- `src/types/occurrences.ts` — dodać opcjonalne `zoom_link_source`
- `src/components/admin/OccurrencesEditor.tsx` — fix bug (null vs empty), zmiana z Switch na Select 3-opcjowy + wybór linku lidera; przyjmuje prop `leaderLinks`
- `src/components/admin/TeamTrainingForm.tsx` — załadować i przekazać `leaderLinks`
- `src/hooks/useLeaderZoomLinks.ts` — nowy hook (fetch + CRUD)
- `src/components/leader/LeaderZoomLinks.tsx` — nowy komponent zakładki
- Routing/menu Panelu Lidera — dorzucić zakładkę "Linki Zoom" (potrzebuję potwierdzić którą stronę/plik menu edytować — sprawdzę w build mode)

## Pytania

Czy każdy lider może mieć wiele linków Zoom (np. różne pokoje), czy tylko jeden? Zakładam **wiele** z etykietami — potwierdź jeśli inaczej.
