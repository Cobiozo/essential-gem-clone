Zidentyfikowany problem: obecny link z ekranu (`https://purelife.info.pl/uploads/training-media/...mp4`) zwraca `404` oraz `content-type: text/html`, więc serwer nie ma fizycznego pliku pod zapisanym URL. Dodatkowo walidacja w przeglądarce opiera się na `HEAD` do zewnętrznej domeny, który w preview kończy się `Failed to fetch`, więc obecny mechanizm nie blokuje złych URL-i wystarczająco pewnie.

Plan naprawy:

1. Ujednolicić konfigurację uploadu News Hub
   - Dodać w `src/lib/storageConfig.ts` jawne foldery News Hub, w tym dedykowany folder dla wideo, np. `training-media/news-hub/videos`.
   - Usunąć lokalne, ręcznie wpisane mapowanie folderów z `useNewsHub.ts` i oprzeć je o wspólną konfigurację.
   - Wszystkie requesty uploadu dalej będą iść przez `STORAGE_CONFIG.UPLOAD_API_URL`, bez hardcodowania `/upload` w logice News Hub.

2. Naprawić upload wideo, żeby nie zapisywał nieistniejących URL-i
   - W `useNewsHub.ts` po uploadzie VPS weryfikować nie tylko obecność `url`, ale też realną dostępność pliku.
   - Dla wideo wymagać statusu `2xx/206` oraz `content-type` `video/*` albo bezpiecznie tolerowany `application/octet-stream`.
   - Jawnie odrzucać `404`, `text/html`, puste `content-type` przy wideo oraz odpowiedzi, które wyglądają jak fallback SPA.
   - Gdy weryfikacja z przeglądarki jest blokowana przez CORS (`Failed to fetch`), nie traktować tego jako sukcesu dla wideo — wyświetlić błąd i nie zapisywać URL-a.

3. Poprawić miejsca uploadu w edytorach
   - `PostFormDialog.tsx`: dla postów typu `video` przekazywać `kind: 'video'`, żeby walidacja była wymuszona również w klasycznym formularzu, nie tylko w edytorze blokowym.
   - `MediaControls.tsx`: zachować wymuszone `kind: 'video'` dla uploadu MP4.
   - `BlockListEditor.tsx`: upewnić się, że blok wideo używa folderu video/media i `kind: 'video'`, a pliki do pobrania zostają w folderze plików.

4. Ulepszyć obsługę błędu w odtwarzaczach
   - W `PostContent.tsx` i `BlockRenderer.tsx` odtwarzacz pokaże jasny komunikat błędu, jeśli URL zwróci HTML, 404 lub przeglądarka nie załaduje metadanych wideo.
   - Nie będzie już cichego odtwarzacza `0:00` bez informacji.

5. Dodać minimalną odporność na stare błędne URL-e
   - Stare, już zapisane URL-e, które zwracają HTML/404, pozostaną oznaczone jako błędne i wymagające ponownego uploadu.
   - Nowy upload nie zapisze już takiego URL-a do posta/bloku.

Zakres techniczny zmian:
- `src/lib/storageConfig.ts`
- `src/hooks/useNewsHub.ts`
- `src/components/news-hub/PostFormDialog.tsx`
- `src/components/news-hub/editor/MediaControls.tsx`
- `src/components/news-hub/editor/BlockListEditor.tsx`
- `src/components/news-hub/PostContent.tsx`
- `src/components/news-hub/BlockRenderer.tsx`

Po wdrożeniu sprawdzę ponownie nagłówki przykładowego URL-a oraz logikę, która blokuje zapis URL-a, jeśli serwer zwraca HTML/404 zamiast MP4.