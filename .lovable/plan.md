
# Plan: Naprawa wyświetlania obrazka OG na WhatsApp/Messenger

## Zidentyfikowany problem

### Przyczyna
**WhatsApp i Messenger NIE uruchamiają JavaScript** - ich crawlery odczytują tylko statyczny HTML.

Aktualnie:
- Hook `useDynamicMetaTags` poprawnie aktualizuje meta tagi, ale dopiero PO załadowaniu strony w przeglądarce
- Crawlery social media czytają tylko to, co jest w `index.html`
- W `index.html` (linia 31 i 37) jest **stary placeholder URL**: `https://lovable.dev/opengraph-image-p98pqg.png`
- W bazie danych jest **prawidłowy URL obrazka**: `https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/og-image-1770241448116.png`

## Rozwiązanie

Zaktualizować `index.html` aby zawierał prawidłowy URL obrazka OG z bazy danych:

```html
<!-- Linia 31 -->
<meta property="og:image" content="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/og-image-1770241448116.png" />

<!-- Linia 37 -->
<meta name="twitter:image" content="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/og-image-1770241448116.png" />
```

## Plik do modyfikacji

| Plik | Linie | Zmiana |
|------|-------|--------|
| `index.html` | 31, 37 | Zamiana URL obrazka z lovable.dev na Supabase storage |

## Po wdrożeniu

Po aktualizacji kodu i opublikowaniu, należy odświeżyć cache na platformach społecznościowych:
1. **Facebook/Messenger**: https://developers.facebook.com/tools/debug/ → wpisz `purelife.info.pl` → "Scrape Again"
2. **WhatsApp**: cache odświeża się automatycznie po kilku godzinach (lub można wysłać link z `?v=2` na końcu aby wymusić)

## Uwaga na przyszłość

Jeśli chcesz dynamicznie zmieniać obrazek OG bez edycji kodu, potrzebne byłoby Server-Side Rendering (SSR) lub serwer proxy który generuje HTML z meta tagami. W aktualnej architekturze (SPA React) statyczne wartości w `index.html` muszą być aktualizowane ręcznie lub przez deploy.
