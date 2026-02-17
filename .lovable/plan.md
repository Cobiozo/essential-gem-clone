

# Naprawa nieskonczonego buforowania wideo — zmiana z proxy na redirect 302

## Diagnoza problemu

Edge Function `stream-media` aktualnie dziala jako **pelny proxy** — pobiera caly plik wideo z VPS i streamuje go bajt po bajcie do przegladarki. To powoduje:

1. **Limity czasu Edge Functions** (~60s) — polaczenie jest przerywane przy dlugich plikach wideo
2. **max_uses=5 jest za male** — przegladarka wysyla wiele zadan Range (kazde zuzywa 1 uzycie tokenu)
3. **Broken pipe / connection closed** — Edge Function nie nadaza ze streamingiem duzych plikow

## Rozwiazanie — Redirect 302 zamiast proxy

Zamiast streamowac plik przez Edge Function, funkcja `stream-media` bedzie:
1. Walidowac token (czy istnieje, nie wygasl, nie wyczerpany)
2. Zwracac **redirect 302** do prawdziwego URL
3. Przegladarka automatycznie podazy za redirectem i pobiera plik bezposrednio z VPS

### Kompromis bezpieczenstwa

- Prawdziwy URL pojawia sie w zakladce Network w DevTools, ale **NIE** w kodzie zrodlowym strony ani w `<video src>`
- URL jest znacznie trudniejszy do znalezienia niz wczesniej (trzeba przejrzec setki zadan sieciowych)
- Token nadal chroni przed bezposrednim udostepnianiem linku — skopiowanie URL proxy zwroci 403

### Dodatkowe zabezpieczenie

- Zwiekszenie `max_uses` z 5 do 100 (przegladarka wykonuje wiele zadan Range)
- Dodanie naglowka `Content-Disposition: inline` (sugeruje odtwarzanie zamiast pobierania)

## Zmiany techniczne

### 1. `supabase/functions/stream-media/index.ts`

Zamiana pelnego proxy na redirect 302:

```text
PRZED (pelny proxy):
  const mediaResponse = await fetch(realUrl, { headers: fetchHeaders })
  return new Response(mediaResponse.body, { status: mediaResponse.status, headers })

PO (redirect 302):
  // Walidacja tokenu (bez zmian)
  // Zamiast streamowania — redirect
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': realUrl,
      'Cache-Control': 'no-store, no-cache',
    }
  })
```

Edge Function konczy prace w <100ms zamiast trzymac polaczenie przez minuty.

### 2. `supabase/functions/generate-media-token/index.ts`

Zwiekszenie `max_uses` z 5 do 100:

```text
PRZED: max_uses: 5
PO:    max_uses: 100
```

### 3. `src/components/SecureMedia.tsx`

Bez zmian w logice komponentu — `<video src="stream-media?token=...">` dziala identycznie z redirectem 302, przegladarka automatycznie podaza za przekierowaniem.

## Przepływ po zmianach

```text
1. SecureMedia generuje token -> ustawia src="stream-media?token=abc"
2. Przegladarka wysyla GET z Range header
3. Edge Function waliduje token (~50ms) -> zwraca 302 do prawdziwego URL
4. Przegladarka podaza za redirectem -> pobiera dane bezposrednio z VPS
5. Wideo odtwarza sie plynnie — bez limitu czasu Edge Function
6. Kolejne zadania Range uzywaja tego samego tokenu (max 100 uzyc)
7. Token odswiezany co 3.5 min (istniejaca logika)
```

## Wplyw na istniejace funkcje

| Funkcja | Wplyw |
|---------|-------|
| Sledzenie postepu | Bez zmian — `timeupdate` event dziala identycznie |
| Wznawianie od zapisanej pozycji | Bez zmian — `initialTime` ustawiany jak dotychczas |
| Kontrola predkosci | Bez zmian — `playbackRate` na elemencie `<video>` |
| Buforowanie / seeking | **Poprawione** — brak limitu czasu proxy |
| Tryby kontroli (restricted/secure) | Bez zmian |
| Odswiezanie tokenu | Bez zmian — co 3.5 min |

## Podsumowanie

| Plik | Zmiana |
|------|--------|
| `supabase/functions/stream-media/index.ts` | Zamiana proxy na redirect 302 |
| `supabase/functions/generate-media-token/index.ts` | max_uses: 5 -> 100 |

Dwa pliki, minimalne zmiany, rozwiazuje problem nieskonczonego buforowania.

