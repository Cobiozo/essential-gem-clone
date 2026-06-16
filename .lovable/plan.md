## Cel
Klik w zdjęcie galerii (News Hub) otwiera modal podglądu w tej samej karcie, ze strzałkami ← → do przechodzenia między zdjęciami, zamykaniem (ESC/X) i obsługą swipe na mobile.

## Zakres
1. **Nowy komponent** `src/components/news-hub/GalleryLightbox.tsx`
   - Props: `images: string[]`, `startIndex: number`, `open: boolean`, `onClose()`
   - Bazuje na `Dialog` z shadcn (czarne tło, max-w-7xl, obraz `object-contain` do 90vh)
   - Strzałki ← → (przyciski + klawiatura ArrowLeft/ArrowRight, ESC zamyka), licznik „3 / 12"
   - Swipe lewo/prawo (touchstart/touchend) na mobile
   - Przyciski „Pobierz / Zapisz do galerii" (reuse `shareOrDownloadImage` jak w `GalleryElement`)
   - Zapętlenie (ostatnie → pierwsze)

2. **`BlockRenderer.tsx` (case `'gallery'`, linie 96–110)**
   - Zamienić `<a target="_blank">` na `<button onClick={() => openAt(i)}>`
   - Wyrenderować `<GalleryLightbox />` ze stanem `openIndex`

3. **`PostContent.tsx` (sekcja `post.type === 'gallery'`)**
   - Ten sam zabieg: `<button>` zamiast `<a target="_blank">` + `<GalleryLightbox />`

4. **`GalleryElement.tsx`** (już ma modal, ale bez strzałek)
   - Dorzucić nawigację ← →, klawiaturę i swipe (ten sam UX), żeby galerie w innych miejscach też miały spójne zachowanie

## Poza zakresem
- Edytor postów / panel administracyjny (bez zmian)
- Zoom / pinch-to-zoom (nie wymagane przez użytkownika)
- Zapis kolejności / pełnoekranowy tryb Fullscreen API
