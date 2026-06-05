## Cel

W miejscu obecnego nagłówka „Centrum Aktualności" (ikona + tytuł + podtytuł) dodać konfigurowalny **baner hero**, który admin może wgrać, edytować i pozycjonować — podobnie jak okładki postów w News Hub.

## Co zobaczy użytkownik

Na górze `/aktualnosci` zamiast statycznego tytułu pojawi się baner:
- Tło: wgrane zdjęcie/grafika (lub gradient jeśli brak)
- Na wierzchu: tytuł + podtytuł (edytowalne)
- Opcjonalny przycisk CTA (tekst + link)
- Nakładka koloru z regulowanym kryciem (czytelność tekstu)

Gdy baner jest wyłączony — fallback do obecnego nagłówka (kompatybilność wsteczna).

## Co zobaczy admin

Nowa zakładka **„Baner Centrum Aktualności"** w `/admin/news-hub` z pełnym edytorem:

**Treść**
- Włącz/wyłącz baner (switch)
- Tytuł (text)
- Podtytuł (text)
- CTA: etykieta + URL (oba opcjonalne)

**Obraz tła**
- Upload pliku (przez istniejące `uploadNewsHubFile` → folder `covers` lub nowy `banners`)
- Pole URL (możliwość wklejenia)
- Dopasowanie: cover / contain / fill
- Pozycja: siatka 3×3 (top-left … bottom-right) — jak w `CoverControls`
- Wysokość: slider 200–700 px (mobile auto-skala)

**Wygląd tekstu**
- Kolor tytułu, podtytułu, CTA
- Wyrównanie: left / center / right
- Rozmiar tytułu (slider)

**Nakładka**
- Kolor (color picker)
- Krycie 0–100%
- Gradient on/off (pion od dołu — dla czytelności)

**Podgląd na żywo** nad formularzem.

## Implementacja techniczna

**Nowa tabela** `news_hub_banner_config` (single-row, `id boolean PK = true`, jak `news_hub_settings`):
```
enabled bool, image_url text, title text, subtitle text,
cta_label text, cta_url text,
fit text, position text, height int,
overlay_color text, overlay_opacity numeric, overlay_gradient bool,
title_color text, subtitle_color text, text_align text, title_size int,
updated_at timestamptz
```
RLS: SELECT dla wszystkich (anon+authenticated), UPDATE/INSERT tylko admin via `has_role`. GRANT-y zgodnie z regułą `public-schema-grants`.

**Nowy hook** `useNewsHubBanner.ts` — pobiera config + realtime subskrypcja (analogicznie do `useNewsHubSettings`).

**Nowy komponent** `src/components/news-hub/NewsHubBanner.tsx` — renderuje baner; przyjmuje config jako props.

**Nowy komponent admin** `src/components/admin/news-hub/NewsHubBannerEditor.tsx` — formularz w stylu istniejących edytorów (Card + Inputs + `CoverControls`-like pozycja); upload przez `uploadNewsHubFile(file, 'covers')`.

**Modyfikacja `NewsHubPage.tsx`** — sekcja `<section className="container ... pt-10 pb-6">` (linie 110–125) zastąpiona warunkowo:
- `bannerConfig?.enabled && bannerConfig.image_url` → `<NewsHubBanner config={...} />`
- inaczej → obecny nagłówek (fallback)

**Modyfikacja `NewsHubAdminPage.tsx`** — dodanie nowej zakładki/sekcji „Baner" obok zarządzania postami i widocznością.

## Zakres NIE-objęty

- Wideo jako tło (tylko obraz) — jeśli chcesz, dodam w kolejnej iteracji
- Wiele banerów / rotacja / harmonogram
- Per-rola baner (jeden globalny dla całego modułu)

## Pliki

Nowe:
- `supabase/migrations/<ts>_news_hub_banner_config.sql`
- `src/hooks/useNewsHubBanner.ts`
- `src/components/news-hub/NewsHubBanner.tsx`
- `src/components/admin/news-hub/NewsHubBannerEditor.tsx`

Edytowane:
- `src/pages/NewsHubPage.tsx` (warunkowy render banera)
- `src/pages/NewsHubAdminPage.tsx` (nowa zakładka)
