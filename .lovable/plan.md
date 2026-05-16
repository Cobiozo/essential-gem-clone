## 1) Naprawa obcinania zawartości po prawej

Wiersze listy banerów w `AppBannersManager` mają układ poziomy z badge'ami (severity, audiencja, URL) i tekstem opisu, które wychodzą poza kontener po prawej. Cała sekcja „Banery aplikacji" jest też w karcie z `overflow: hidden`.

**Fix:**
- W `src/components/admin/AppBannersManager.tsx`:
  - Wiersz banera: zmienić nagłówek z badge'ami na `flex flex-wrap min-w-0`, każdy badge `shrink-0`, tekst opisu `truncate` wewnątrz `min-w-0`.
  - Akcje (switch + przyciski) wydzielić do osobnego `flex shrink-0 gap-1` z `ml-auto`, by trzymały się prawej krawędzi.
  - Header karty: opis (`CardDescription`) `break-words` żeby nie był ucinany.
- W `src/pages/Admin.tsx` (kontener taba ustawień, jeśli ma `overflow-hidden` lub `max-w` powodujący clipping) — sprawdzić i ewentualnie dodać `min-w-0` do wrappera kolumny treści.

Sprawdzę faktyczne wymiary po naprawie zrzutem ekranu w 1416×890.

## 2) Symulator audiencji w panelu admina

Nowy moduł w `AppBannersManager` — panel „Podgląd dla użytkownika":

**UI (rozwijana sekcja nad listą banerów):**
- Tryb symulacji: `przełącznik on/off`
- Wybór symulowanego użytkownika — dwa tryby:
  - **Manualny:** select roli (`admin | partner | specjalista | klient | lider | gość-niezalogowany`) + checkboxy „brakujące pola profilu" (lista z `FIELD_LABELS`)
  - **Realny użytkownik:** autocomplete po email/imię (z `profiles`), automatycznie wczytuje rolę z `user_roles` i sprawdza brakujące pola z `profiles`
- Pole „Symulowana ścieżka" (input, domyślnie `/dashboard`) — żeby przetestować `hide_on_paths`

**Wynik:**
- Pod panelem renderowana lista banerów, które **przeszłyby filtr** dla symulowanego kontekstu (te same reguły co w `AppBanners`: enabled, hide_on_paths, starts_at/ends_at, audience_type) — wyrenderowane przez istniejący `BannerCard`.
- Banery, które **nie przechodzą** — wyświetlone na szaro z etykietą powodu (`Wyłączony`, `Ukryty na tej ścieżce`, `Audiencja: role X`, `Brak wymaganych pól (wszystkie uzupełnione)`, `Poza oknem czasowym`, `Nie jest na liście użytkowników`).
- Liczniki: „Wyświetlonych: N / Wszystkich: M".

**Implementacja:**
- Wyodrębnić funkcję `matchBanner(banner, ctx)` z `AppBanners.tsx` → wspólna w `src/components/banners/bannerMatching.ts`, zwracająca `{ visible: boolean, reason?: string }`.
- Użyć tej samej funkcji w `AppBanners` (refaktor bez zmiany zachowania) i w nowym `BannerSimulator` w panelu admina.
- Autocomplete realnych użytkowników: `supabase.from('profiles').select('user_id,first_name,last_name,email').ilike('email',...)` + role z `user_roles`.

### Pliki

**Nowe:**
- `src/components/banners/bannerMatching.ts` — wspólna logika dopasowania
- `src/components/admin/BannerSimulator.tsx` — UI symulatora

**Zmieniane:**
- `src/components/banners/AppBanners.tsx` — użycie `matchBanner`
- `src/components/admin/AppBannersManager.tsx` — fix układu wiersza + zamontowanie `BannerSimulator`

Po akceptacji wykonuję zmiany i weryfikuję zrzutem ekranu w 1416×890.