# Dlaczego kafelki wyglądają różnie

Obecnie siatka działa w trybie **Bento** (mieszane rozmiary) i kafelek różni się przez 3 czynniki ustawiane per post:

1. **Rozmiar bento** (`bento_size`: `s` / `m` / `l`) — „Promocje Maj" ma `l` (zajmuje 2×2), „Artykuł testowy" `m` (2×1), dwa puste to `s` (1×1).
2. **Przypięcie** — przypięty post jest wymuszany do rozmiaru `l` niezależnie od ustawienia.
3. **Okładka** — gdy brak `cover_url`/`media_url`, kafelek pokazuje placeholder (gradient w kolorze kategorii + ikona typu). Stąd te dwa „czerwone" prostokąty po prawej — to ogłoszenia bez okładki, w kategorii o czerwonym kolorze.

Czyli różnice są **zamierzone**, ale dziś nie da się wybrać prostego, równego układu „wszystko po środku / 2 / 3 kolumny". To dodajemy.

# Co zbudujemy

Globalne ustawienie układu listy postów (admin) + opcjonalny szybki wybór kolumn dla każdego widza.

## 1. Tryby układu (`grid_layout`)
- `bento` — obecny mieszany układ (domyślny, kompatybilny wstecz).
- `centered` — jedna kolumna, kafelki wycentrowane, max szerokość ~720 px (czyta się jak „artykuły").
- `cols-2` — równa siatka 2 kolumny (na mobile 1).
- `cols-3` — równa siatka 3 kolumny (sm: 2, mobile: 1).
- `cols-4` — równa siatka 4 kolumny (md: 3, sm: 2, mobile: 1).

W trybach `centered` / `cols-*`:
- ignorujemy `bento_size` i `is_pinned` (przypięte i tak idą na górę w sekcji „Przypięte", ale w równych rozmiarach),
- wszystkie kafelki mają **jednakową wysokość i proporcje** (aspect 16:9 okładka + jednolity blok tekstu).

## 2. Gdzie się ustawia
- **Admin → Zarządzaj Aktualnościami → ustawienie „Układ listy"** (Select z 5 opcjami + krótki podgląd ikonki). Zapis do nowej tabeli `news_hub_settings` (singleton) — nie miesza się z `cms_*`, izolacja modułu zachowana.
- **Na stronie `/aktualnosci`** dodajemy mały przełącznik (ikonki: 1/2/3/4 kolumny + bento) widoczny dla każdego, zapisany w `localStorage` jako preferencja użytkownika. Admin ustawia domyślny — użytkownik może go nadpisać dla siebie.

## 3. Zmiany w kodzie (frontend-only poza migracją settings)

- `src/types/newsHub.ts` — dodanie typu `NewsHubGridLayout`.
- `src/hooks/useNewsHubSettings.ts` (nowy) — read/write singletona `news_hub_settings.grid_layout`.
- `src/components/news-hub/BentoGrid.tsx`:
  - przyjmuje prop `layout`,
  - dla `bento` zachowuje obecny kod,
  - dla `centered` renderuje `flex flex-col items-center` z `max-w-3xl`,
  - dla `cols-N` renderuje `grid grid-cols-1 sm:grid-cols-2 ... gap-4 auto-rows-auto` bez `col-span`.
- `src/components/news-hub/GridLayoutSwitcher.tsx` (nowy) — pasek ikon nad listą, zapis do `localStorage`.
- `src/pages/NewsHubPage.tsx` — pobiera setting admina + preferencję usera, przekazuje do `BentoGrid`, renderuje switcher.
- `src/pages/NewsHubAdminPage.tsx` — sekcja „Ustawienia widoku" z Select layoutu.

## 4. Migracja

Pojedyncza tabela `news_hub_settings` (singleton, RLS: read = wszyscy zalogowani, write = admin) z polem `grid_layout TEXT DEFAULT 'bento'`. Domyślnie `bento`, więc obecny wygląd nie zmienia się dla nikogo zanim admin nie wybierze inaczej.

## 5. Co NIE zmieniamy
- Logika edytora bloków / treści postu — bez zmian.
- `bento_size` zostaje w bazie i działa w trybie `bento`; w pozostałych jest po prostu ignorowany (nic się nie traci).
- Inne moduły (CMS, partner pages, eventy) — nietknięte.

# Pytanie zanim wdrożę
Czy chcesz oba poziomy (admin ustawia domyślny + użytkownik może przełączać przyciskami nad listą), czy tylko jeden z nich?
