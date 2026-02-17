

# Naprawa bledu "src_not_supported" po zmianie na redirect 302

## Problem

Element `<video src="stream-media?token=...">` otrzymuje odpowiedz 302 z Edge Function, ale przegladarka nie moze podazyc za cross-origin redirectem do VPS (`purelife.info.pl`), poniewaz VPS nie wysyla naglowkow CORS. Skutek: `MEDIA_ERR_SRC_NOT_SUPPORTED` w petli.

## Rozwiazanie

Zamiast ustawiac URL proxy jako `<video src>`, klient wykona `fetch()` do `stream-media?token=...` z `redirect: 'manual'`, odczyta naglowek `Location` z odpowiedzi 302, i uzyje tego URL bezposrednio jako `<video src>`.

Alternatywnie (prostsze): zmiana `stream-media` Edge Function aby zamiast 302 zwracala JSON z prawdziwym URL, a klient pobiera ten URL i ustawia go jako src. To jest rownowazne z obecnym podejsciem, ale dziala z `<video>`.

### Wybrane podejscie: JSON response zamiast 302

Edge Function `stream-media` bedzie zwracac:
```text
{ "url": "https://purelife.info.pl/uploads/..." }
```

Klient (`SecureMedia.tsx`) zamiast ustawiac `getStreamMediaUrl(token)` jako src, wykona fetch do tego URL i uzyje zwroconego `url` jako src.

## Zmiany techniczne

### 1. `supabase/functions/stream-media/index.ts`

Zmiana z `302 redirect` na `200 JSON response`:

```text
PRZED:
  return new Response(null, {
    status: 302,
    headers: { Location: realUrl, ... }
  })

PO:
  return new Response(JSON.stringify({ url: realUrl }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
```

### 2. `src/lib/mediaTokenService.ts`

Nowa funkcja `resolveStreamUrl(token)` ktora:
1. Wykonuje fetch do `stream-media?token=...`
2. Parsuje JSON response
3. Zwraca prawdziwy URL

```text
export async function resolveStreamUrl(token: string): Promise<string> {
  const response = await fetch(getStreamMediaUrl(token));
  const data = await response.json();
  return data.url;
}
```

### 3. `src/components/SecureMedia.tsx`

W bloku generowania tokenu (linie ~286-294):

```text
PRZED:
  const token = await generateMediaToken(mediaUrl);
  const proxyUrl = getStreamMediaUrl(token);
  setSignedUrl(proxyUrl);  // <video src="stream-media?token=..."> -- nie dziala z 302!

PO:
  const token = await generateMediaToken(mediaUrl);
  const realUrl = await resolveStreamUrl(token);
  setSignedUrl(realUrl);  // <video src="https://purelife.info.pl/..."> -- dziala!
```

Analogiczna zmiana w bloku odswiezania tokenu (linie ~298-314).

## Bezpieczenstwo

- Prawdziwy URL pojawia sie w `<video src>` i w Network tab, ale jest chroniony tokenem jednorazowym
- Uzytkownik musi byc zalogowany aby uzyskac token
- Token wygasa po 5 minutach / 100 uzyciach
- URL nie jest widoczny w kodzie zrodlowym strony (ustawiany dynamicznie przez JavaScript)

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/functions/stream-media/index.ts` | 302 redirect -> 200 JSON response |
| `src/lib/mediaTokenService.ts` | Dodanie `resolveStreamUrl()` |
| `src/components/SecureMedia.tsx` | Uzycie `resolveStreamUrl()` zamiast `getStreamMediaUrl()` |

