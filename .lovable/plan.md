## Intro wideo na starcie aplikacji

Krótki film (MP4) odtwarzany jako splash screen przy każdym wejściu/odświeżeniu strony, z możliwością pominięcia po 1–2 s, wyciszony domyślnie z opcją włączenia dźwięku. Konfigurowalny przez admina.

### 1. Baza danych — tabela `intro_video_settings` (single row)

Pola:
- `enabled` (bool) — globalny włącznik
- `video_url` (text) — URL pliku MP4 w Supabase Storage
- `show_on_auth_only` (bool, default false) — tylko przy logowaniu vs cała aplikacja
- `frequency` (enum: `always` / `once_per_session` / `once_per_day`) — jak często
- `skip_after_ms` (int, default 1500) — po ilu ms pokazać przycisk "Pomiń"
- `allow_skip` (bool, default true)
- `default_muted` (bool, default true)
- `show_on_anonymous` (bool, default true) — też dla niezalogowanych
- `updated_at`, `updated_by`

RLS: SELECT dla wszystkich (anon + authenticated), UPDATE tylko admin.

### 2. Storage bucket `intro-videos`

Publiczny bucket na pliki MP4. Admin uploaduje plik z panelu, link trafia do `video_url`.

### 3. Panel admina — `src/components/admin/IntroVideoSettings.tsx`

Nowa sekcja w panelu CMS/Ustawienia:
- Przełącznik "Włącz intro wideo"
- Upload pliku MP4 (z podglądem i walidacją: max ~10 MB, zalecane ≤5 s)
- Pole "URL wideo" (alternatywa)
- Select: częstotliwość (zawsze / raz na sesję / raz dziennie)
- Slider: opóźnienie przycisku Pomiń (0–5000 ms)
- Checkboxy: pokazuj na auth, pokazuj anonimowym, pozwól pominąć, domyślnie wyciszone
- Podgląd na żywo

### 4. Komponent `src/components/intro/IntroVideoOverlay.tsx`

Fullscreen overlay (`z-[9999]`) z:
- `<video autoPlay muted={muted} playsInline>` z `src` z ustawień
- Przycisk "Pomiń ▶" pojawia się po `skip_after_ms` (animowany fade-in)
- Ikona głośnika (Volume2/VolumeX) w rogu — toggle mute
- Po `onEnded` lub kliknięciu Pomiń → fade-out i unmount
- Zapis do sessionStorage / localStorage według `frequency`:
  - `always` → brak zapisu
  - `once_per_session` → `sessionStorage.intro_played`
  - `once_per_day` → `localStorage.intro_played_date`

### 5. Integracja w `src/App.tsx`

- Hook `useIntroVideo()` (`src/hooks/useIntroVideo.ts`) pobiera ustawienia (cache 5 min) i decyduje czy renderować overlay
- Renderowanie warunkowe na poziomie App, nad całym routerem
- Respektuje `show_on_auth_only` (sprawdza route) i `show_on_anonymous` (sprawdza user)
- Nie blokuje ładowania aplikacji — overlay nakłada się na już renderowaną treść

### Szczegóły techniczne

- Wideo `playsInline` + `muted` na starcie (wymóg autoplay w przeglądarkach)
- Preload: `preload="auto"`, fallback gdy plik nie załaduje się w 2 s → auto-skip
- Mobile: pełny ekran, `object-fit: cover`
- Dostępność: `aria-label`, focus na przycisk Pomiń, Esc = pomiń
- Brak wpływu na PWA splash (to oddzielna warstwa wewnątrz aplikacji)

### Pliki

Nowe:
- `supabase/migrations/<ts>_intro_video.sql` (tabela + RLS + bucket policies)
- `src/components/intro/IntroVideoOverlay.tsx`
- `src/hooks/useIntroVideo.ts`
- `src/components/admin/IntroVideoSettings.tsx`

Edytowane:
- `src/App.tsx` — montaż overlay
- Panel admina (dodanie zakładki/sekcji "Intro wideo")
- `src/integrations/supabase/types.ts` (auto)
