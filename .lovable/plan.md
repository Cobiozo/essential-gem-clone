## Realny czas oglądania materiału Bazy Wiedzy

### Przyczyna (obecnie)
- `HKMaterialContactsList` liczy czas jako `last_activity_at − session_created_at`.
- `last_activity_at` ustawiane jest **jednorazowo** w `verify-hk-session` przy wejściu na materiał.
- Player (`HealthyKnowledgePlayer.tsx`) nie wysyła żadnego pingu — postęp zapisuje tylko do `localStorage`.
- Efekt: różnica ≈ 0 → zawsze „<1min", niezależnie od faktycznego oglądania.

### Rozwiązanie

**1. Migracja bazy — dodać sumowany czas oglądania w sekundach**
- `hk_otp_sessions.watched_seconds int not null default 0`
- Zachowujemy `last_activity_at` (używane też do weryfikacji sesji).

**2. Nowa edge function `hk-session-heartbeat`**
- Wejście: `session_token`, `delta_seconds` (max 30 na wywołanie — zabezpieczenie przed nabijaniem).
- Waliduje sesję (aktywna, niewygasła, kod nieunieważniony).
- `update hk_otp_sessions set watched_seconds = watched_seconds + least(delta, 30), last_activity_at = now() where session_token = ?`.
- Zwraca aktualny `watched_seconds`.

**3. Player `HealthyKnowledgePlayer.tsx` — heartbeat co 15 s**
- Interval liczy tylko gdy `isPlaying === true` i `document.visibilityState === 'visible'`.
- Co 15 s wysyła `delta_seconds = 15` do `hk-session-heartbeat`.
- Dodatkowy flush na `visibilitychange` (hidden) i `beforeunload` z resztówką sekund od ostatniego pingu (via `navigator.sendBeacon` lub `fetch keepalive`).
- Dla materiałów tekstowych/PDF: heartbeat co 30 s przy widoczności karty (bez zależności od `isPlaying`).

**4. UI — pokazać realny czas**
- `HKMaterialContactsList.formatDuration` przyjmuje `watched_seconds` zamiast pary dat.
- Format: `Xh Ym`, `Ym`, `Ys` (dla <1 min pokazujemy realne sekundy, np. „42 s", zamiast bezużytecznego „<1min").
- Zapytanie w hooku pobierającym sesje (`useContactHKSessions` lub odpowiednie) dodaje `watched_seconds` do selecta.

**5. Wstecznie**
- Dla starych sesji `watched_seconds = 0` → pokazujemy „—" (brak danych) zamiast „<1min", żeby odróżnić „nie mierzone" od „krótkie".

### Bezpieczeństwo
- Delta limitowana serverside (≤30 s/ping) — nie da się sztucznie napompować czasu.
- Heartbeat wymaga ważnego `session_token` (bez auth JWT — to sesja gościa), zwykła walidacja jak w `verify-hk-session`.
- Brak nowych uprawnień RLS (update leci przez service role w edge function).

### Poza zakresem
- Nie zmieniamy UI kodów w „Moje konto" (kolumna „Pozostało/Sesje" — to inne dane: TTL kodu i liczba użyć).
- Nie dotykamy `auto_webinar_views` ani innych systemów obecności.
