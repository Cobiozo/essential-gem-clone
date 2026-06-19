## Cel

Dodać do "Wyzwania 90-dniowego" opcjonalny baner główny z edytorem identycznym jak w Aktualnościach (Centrum Aktualności): włącznik, podgląd na żywo, upload obrazu, tytuł/podtytuł, CTA, dopasowanie, pozycja, wysokość, nakładka i krycie, gradient, kolory tekstu, wyrównanie, rozmiar tytułu.

## Co powstanie

1. **Tabela `challenge_banner_config`** – kopia struktury `news_hub_banner_config` (singleton z `id = true`):
   - `enabled`, `image_url`, `title`, `subtitle`, `cta_label`, `cta_url`
   - `fit` (cover/contain/fill), `position`, `height`
   - `overlay_color`, `overlay_opacity`, `overlay_gradient`
   - `title_color`, `subtitle_color`, `text_align`, `title_size`
   - RLS: SELECT dla wszystkich zalogowanych, INSERT/UPDATE tylko admin. GRANT-y dla `authenticated` i `service_role` wg standardu projektu.

2. **Hook `useChallengeBanner.ts`** – analogiczny do `useNewsHubBanner` (defaults, refresh, realtime subscribe, save/upsert).

3. **Komponent `ChallengeBanner.tsx`** – wizualnie taki sam jak `NewsHubBanner` (mobilna pełna szerokość + desktopowy background-image, gradient/overlay, CTA), z fallbackiem do nagłówka tekstowego gdy baner wyłączony.

4. **Komponent `ChallengeBannerEditor.tsx`** – kopia `NewsHubBannerEditor` (lewa kolumna: podgląd na żywo używający `ChallengeBanner`; prawa kolumna: wszystkie kontrolki — toggle, pola tekstowe, upload obrazu, URL, dopasowanie, pozycja 3×3, wysokość, kolor nakładki + krycie, gradient, kolory tytułu/podtytułu, wyrównanie, rozmiar tytułu).

5. **Integracja**:
   - `ChallengeAdminPage.tsx`: nowa zakładka **"Baner"** (pierwsza lub po "Ustawienia"), renderująca `ChallengeBannerEditor`.
   - `ChallengePage.tsx` (strona użytkownika): na górze `<ChallengeBanner config={config} fallback={…obecny nagłówek z `banner_url`/tytułem…} />`.
   - Pole `banner_url` w `challenge_settings` zostaje (backwards compat) jako fallback gdy nowy baner wyłączony i brak obrazu.

6. **Upload obrazu** – do istniejącego bucketu używanego przez moduł wyzwania (lub `news-hub` jeśli wspólny). Jeśli brak — utworzymy publiczny bucket `challenge-banner` w tej samej migracji.

## Szczegóły techniczne

- Typy Supabase: dodać tabelę do `src/integrations/supabase/types.ts` (lub użyć `as any` jak w `useNewsHubBanner`).
- Realtime: kanał `challenge_banner_config_changes`.
- Brak zmian w logice samego wyzwania (zadania, uczestnicy, statystyki).

## Pytanie

Czy baner ma być widoczny:
- (A) tylko na stronie wyzwania `/challenge` dla uczestników/zalogowanych, czy
- (B) także na publicznej stronie wyzwania jeśli taka istnieje?

Domyślnie zakładam (A).
