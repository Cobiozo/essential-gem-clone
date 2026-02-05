

# Analiza problemu: Meta tagi OG nie synchronizują się

## Zidentyfikowany problem

### Rozbieżność danych

| Źródło | og:image URL | Stan |
|--------|--------------|------|
| **Baza danych** (page_settings) | `og-image-1770279843027.jpg` | Nowy obrazek (zespół) |
| **index.html** (linie 31, 37) | `og-image-1770241448116.png` | Stary obrazek (kropla) |

### Przyczyna główna

**Architektura SPA React ma fundamentalne ograniczenie:**
- Panel admina zapisuje ustawienia OG do bazy danych
- Hook `useDynamicMetaTags` aktualizuje meta tagi, ale tylko PO załadowaniu JavaScript w przeglądarce
- Social media crawlery (Facebook, WhatsApp, Messenger) NIE uruchamiają JavaScript - odczytują tylko statyczny HTML z `index.html`
- Statyczne wartości w `index.html` nigdy nie są automatycznie aktualizowane

**Wynik:** Zmiany w panelu admina zapisują się do bazy, ale nigdy nie trafiają do `index.html`, który czytają crawlery.

---

## Rozwiązanie: Edge Function jako Proxy dla Crawlerów

### Koncepcja

Stworzymy Edge Function, która:
1. Wykrywa crawlery social media po User-Agent
2. Dla crawlerów - zwraca dynamicznie wygenerowany HTML z aktualnymi meta tagami z bazy
3. Dla normalnych użytkowników - przepuszcza do standardowej aplikacji SPA

### Schemat działania

```text
                    ┌──────────────────────┐
                    │   Żądanie HTTP       │
                    │   purelife.info.pl   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Edge Function:       │
                    │ og-meta-proxy        │
                    └──────────┬───────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
     ┌─────────▼─────────┐     │     ┌─────────▼─────────┐
     │ Crawler?          │     │     │ Zwykły użytkownik │
     │ (Facebook, WA)    │     │     │                   │
     └─────────┬─────────┘     │     └─────────┬─────────┘
               │               │               │
     ┌─────────▼─────────┐     │     ┌─────────▼─────────┐
     │ Zwróć HTML z      │     │     │ Zwróć normalną    │
     │ aktualnymi meta   │     │     │ stronę SPA        │
     │ tagami z bazy     │     │     │                   │
     └───────────────────┘     │     └───────────────────┘
```

---

## Pliki do utworzenia/modyfikacji

### 1. Nowa Edge Function: `supabase/functions/og-meta-proxy/index.ts`

Funkcja która:
- Sprawdza User-Agent pod kątem crawlerów: `facebookexternalhit`, `WhatsApp`, `Twitterbot`, `LinkedInBot`, `Slackbot`
- Pobiera aktualne meta tagi z tabeli `page_settings`
- Zwraca minimalny HTML z prawidłowymi meta tagami dla crawlerów
- Dla normalnych użytkowników - zwraca status 200 z informacją że to nie crawler (hosting może użyć tego jako fallback)

### 2. Aktualizacja `index.html`

Dodanie placeholdera wskazującego na edge function jako alternatywne źródło meta:
```html
<!-- Fallback for crawlers - updated dynamically via edge function -->
```

---

## Implementacja techniczna

### Edge Function kod:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'WhatsApp',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Pinterest',
  'Discordbot',
]

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return CRAWLER_USER_AGENTS.some(crawler => 
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const userAgent = req.headers.get('user-agent')
  
  // Jeśli nie jest crawler, zwróć pustą odpowiedź
  if (!isCrawler(userAgent)) {
    return new Response(JSON.stringify({ crawler: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Pobierz meta tagi z bazy
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data } = await supabase
    .from('page_settings')
    .select('og_title, og_description, og_image_url, og_site_name, og_url')
    .eq('page_type', 'homepage')
    .single()

  const ogTitle = data?.og_title || 'Pure Life Center'
  const ogDescription = data?.og_description || 'Zmieniamy życie i zdrowie ludzi na lepsze'
  const ogImage = data?.og_image_url || ''
  const ogSiteName = data?.og_site_name || 'Pure Life Center'
  const ogUrl = data?.og_url || 'https://purelife.info.pl'

  // Zwróć HTML z meta tagami
  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>${ogTitle}</title>
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:site_name" content="${ogSiteName}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDescription}" />
  <meta name="twitter:image" content="${ogImage}" />
</head>
<body></body>
</html>`

  return new Response(html, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
})
```

---

## Konfiguracja hostingu (wymagane po stronie serwera)

Po wdrożeniu Edge Function, na serwerze produkcyjnym (purelife.info.pl) należy skonfigurować przekierowanie crawlerów:

### Nginx:

```nginx
location / {
  if ($http_user_agent ~* "facebookexternalhit|WhatsApp|Twitterbot") {
    proxy_pass https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/og-meta-proxy;
  }
  # normalna konfiguracja dla zwykłych użytkowników
}
```

### Apache (.htaccess):

```apache
RewriteEngine On
RewriteCond %{HTTP_USER_AGENT} (facebookexternalhit|WhatsApp|Twitterbot) [NC]
RewriteRule ^$ https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/og-meta-proxy [P,L]
```

---

## Alternatywne rozwiązanie (prostsze, ale wymaga ręcznej aktualizacji)

Jeśli konfiguracja serwera proxy nie jest możliwa, możemy:
1. Zaktualizować `index.html` aby zawierał aktualny URL obrazka
2. Dodać w panelu admina przycisk "Pobierz zaktualizowany index.html" który wygeneruje plik z aktualnymi meta tagami
3. Admin musi ręcznie wgrać ten plik na serwer produkcyjny

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `supabase/functions/og-meta-proxy/index.ts` | Nowa Edge Function do obsługi crawlerów |
| `index.html` | Aktualizacja statycznych meta tagów (opcjonalnie) |
| Konfiguracja hostingu | Przekierowanie crawlerów do Edge Function |

---

## Natychmiastowa poprawka

Zaktualizować `index.html` linie 31 i 37 aby zawierały aktualny URL obrazka z bazy:
```html
<meta property="og:image" content="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/og-image-1770279843027.jpg" />
<meta name="twitter:image" content="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/og-image-1770279843027.jpg" />
```

Następnie opublikować zmiany i użyć Facebook Debugger "Scrape Again".

