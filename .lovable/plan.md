

# Plan: Aktualizacja index.html z aktualnymi ustawieniami OG

## Aktualny stan w bazie danych

| Pole | Wartość |
|------|---------|
| `og_title` | Pure Life Center |
| `og_description` | "ZMIENIAMY ŻYCIE I ZDROWIE LUDZI NA LEPSZE" Najwyższa jakość produktu i etyczny biznes. |
| `og_image_url` | `og-image-1770283130175.jpeg` (logo Pure Life - złota kropla) |
| `og_site_name` | Pure Life Center |
| `og_url` | purelife.info.pl |

## Problem

W `index.html` jest stary URL obrazka:
```
og-image-1770279843027.jpg
```

A w bazie jest nowy:
```
og-image-1770283130175.jpeg
```

## Zakres zmian

### Plik: `index.html`

Aktualizacja linii 27-38 z nowymi wartościami:

```html
<meta property="og:title" content="Pure Life Center" />
<meta property="og:description" content="&quot;ZMIENIAMY ŻYCIE I ZDROWIE LUDZI NA LEPSZE&quot; Najwyższa jakość produktu i etyczny biznes." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://purelife.info.pl" />
<meta property="og:image" content="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/og-image-1770283130175.jpeg" />
<meta property="og:site_name" content="Pure Life Center" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Pure Life Center" />
<meta name="twitter:description" content="&quot;ZMIENIAMY ŻYCIE I ZDROWIE LUDZI NA LEPSZE&quot; Najwyższa jakość produktu i etyczny biznes." />
<meta name="twitter:image" content="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/og-image-1770283130175.jpeg" />
```

## Co się zmieni

| Element | Stara wartość | Nowa wartość |
|---------|---------------|--------------|
| `og:description` | Zmieniamy życie i zdrowie ludzi na lepsze | "ZMIENIAMY ŻYCIE I ZDROWIE LUDZI NA LEPSZE" Najwyższa jakość produktu i etyczny biznes. |
| `og:image` | og-image-1770279843027.jpg | og-image-1770283130175.jpeg |
| `og:url` | https://purelife.info.pl | https://purelife.info.pl (bez zmian) |
| `twitter:description` | j.w. | j.w. |
| `twitter:image` | j.w. | j.w. |

## Po wdrożeniu

1. Opublikuj zmiany (Publish)
2. Wgraj `dist/` na serwer produkcyjny
3. Użyj [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → "Scrape Again"

