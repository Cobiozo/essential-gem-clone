

# Audyt Akademii pod kątem iOS (iPhone, iPad, MacBook Safari)

## Zidentyfikowane problemy

### Problem 1: Fullscreen nie działa na iOS Safari
**Krytyczność: WYSOKA**

`handleFullscreen` w `SecureMedia.tsx` (linia 239-264) używa tylko `Element.requestFullscreen()` — API **niedostępnego na iOS Safari** (poza iPadOS 12+ w ograniczonym zakresie). Na iPhone fullscreen na `<div>` w ogóle nie działa. Jedyny sposób to `video.webkitEnterFullscreen()` na samym elemencie `<video>`.

Porównanie: `AutoWebinarPlayerControls.tsx` poprawnie obsługuje iOS fallback (webkitEnterFullscreen, webkitRequestFullscreen) — ale `SecureMedia` tego nie robi.

**Naprawa**: Dodać iOS fallback w `handleFullscreen` — jeśli `requestFullscreen` nie jest dostępne lub rzuca błąd, wywołać `video.webkitEnterFullscreen()`. Dodać nasłuchiwanie `webkitbeginfullscreen`/`webkitendfullscreen` do śledzenia stanu fullscreen.

---

### Problem 2: `video.play()` po `await` — złamany łańcuch gestów na iOS
**Krytyczność: WYSOKA**

iOS wymaga, aby `video.play()` było wywołane **synchronicznie** w obrębie gestu użytkownika. W `handlePlayPause` (linia 1428-1436) `play()` jest wywoływane synchronicznie — to jest OK. Ale w wielu innych miejscach:
- `handleCanPlay` (linia 838): `video.play()` wywoływane asynchronicznie po buforowaniu — iOS może zablokować
- `handleRetry` (linia 1458): `video.play().catch(() => { video.load(); video.play()... })` — podwójne async play
- Visibility recovery (linia 1365): `setTimeout(() => video.play()...)` — async, iOS blokuje
- Smart buffering resume (linia 922-924): async play po buforowaniu

**Naprawa**: W miejscach, gdzie `play()` jest wywoływane poza gestem, dodać `.catch(() => {})` i wyświetlić wizualny przycisk "Dotknij, aby kontynuować" zamiast próbować auto-play. Alternatywnie: nie pauzować wideo na iOS podczas smart bufferingu (linia 748 już to robi dla mobile, ale guard jest oparty o `window.innerWidth` — na iPadzie w landscape to > 768px, więc iPad jest traktowany jak desktop).

---

### Problem 3: `visibilitychange` pauzuje wideo, ale auto-resume nie działa na iOS
**Krytyczność: ŚREDNIA**

Linia 1347-1371: Gdy użytkownik przełącza apkę (np. odbiera SMS), wideo jest pauzowane. Przy powrocie `setTimeout(() => video.play(), 500)` — iOS blokuje auto-play po powrocie z background. Użytkownik musi ręcznie kliknąć Play, ale spinner "Ładowanie..." może być widoczny, myląc użytkownika.

**Naprawa**: Po powrocie z tła na iOS, nie próbować auto-play. Zamiast tego wyświetlić overlay z dużym przyciskiem Play (tap-to-resume), który jest w synchronicznym kontekście gestu.

---

### Problem 4: Detecja mobile oparta o `window.innerWidth` zamiast User Agent
**Krytyczność: ŚREDNIA**

Linia 743, 1345: `const isMobileDevice = window.innerWidth < 768 || 'ontouchstart' in window`. iPad w landscape ma 1024px+ szerokości, ale dalej jest iOS z tymi samymi ograniczeniami co iPhone. `'ontouchstart' in window` łapie iPada, ale iPad z klawiaturą może nie mieć touch events aktywnych.

**Naprawa**: Użyć bardziej niezawodnej detekcji iOS:
```typescript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
```

---

### Problem 5: `completeCurrentLesson` — supabase upsert może cicho failować na słabym łączu iOS
**Krytyczność: ŚREDNIA**

W `TrainingModule.tsx` linia 487: `supabase.from('training_progress').upsert(...)` — jeśli połączenie jest niestabilne (częste na iOS mobilnym), zapis może się nie powieść, a toast "Lekcja zaliczona" się nie pojawi. Nie ma mechanizmu retry ani zapisu offline.

**Naprawa**: Dodać retry (1-2 próby z 2s opóźnieniem) w `completeCurrentLesson`. Zapisywać status zaliczenia w `localStorage` jako backup i synchronizować przy kolejnym załadowaniu strony. Dodać wyraźny feedback wizualny (spinner na przycisku już jest — OK).

---

### Problem 6: `beforeunload` i `visibilitychange` — `keepalive fetch` na iOS Safari
**Krytyczność: NISKA-ŚREDNIA**

Linia 416-440: `fetch(..., { keepalive: true })` w `beforeunload` — iOS Safari ma ograniczone wsparcie dla `keepalive`. Pozycja wideo może nie zostać zapisana przy zamknięciu przeglądarki.

**Naprawa**: Przenieść zapis pozycji do `visibilitychange` (linia 452-471 — już jest!) i `pagehide` jako główny mechanizm. `beforeunload` zostawić jako fallback. Na iOS `pagehide` jest bardziej niezawodny niż `beforeunload`.

---

### Problem 7: Brak obsługi `ended` event na wideo — ręczne kliknięcie "Zalicz" wymagane
**Krytyczność: NISKA**

Na iOS wideo po zakończeniu nie auto-zalicza lekcji (by design — `completion_method` wymaga ręcznego kliknięcia). Ale przycisk "Zalicz lekcję" jest daleko pod wideo na małym ekranie iPhone — użytkownik może nie przewinąć i nie zobaczyć go.

**Naprawa**: Po zakończeniu wideo (event `ended`), auto-scrollować do przycisku "Zalicz lekcję" lub wyświetlić floating przycisk na dole ekranu.

---

## Plan zmian

### Plik 1: `src/components/SecureMedia.tsx`

1. **iOS Fullscreen** — rozbudować `handleFullscreen`:
   - Próbować `container.requestFullscreen()` → fallback `video.webkitEnterFullscreen()`
   - Dodać listenery `webkitbeginfullscreen` / `webkitendfullscreen`

2. **iOS detection helper** — dodać stałą `isIOSDevice` opartą o UA + maxTouchPoints

3. **Smart buffering na iOS** — nie pauzować wideo na iOS (rozszerzyć guard z linii 748 o `isIOSDevice`)

4. **Visibility recovery** — na iOS zamiast auto-play po powrocie, ustawić stan "tap to resume" (nowy stan `showTapToResume`), renderować overlay z przyciskiem Play

5. **play() calls safety** — dodać `.catch(() => {})` do wszystkich asynchronicznych `video.play()` wywołań (już częściowo jest, ale brakuje w kilku miejscach)

### Plik 2: `src/pages/TrainingModule.tsx`

1. **completeCurrentLesson retry** — dodać 1 retry z 2s opóźnieniem przy błędzie sieci

2. **Auto-scroll do przycisku zaliczenia** — po event `ended` na wideo, scrollować do przycisku "Zalicz lekcję" (użyć `ref` + `scrollIntoView`)

3. **localStorage backup** — przy udanym zaliczeniu, natychmiast zapisać `is_completed: true` do localStorage. Przy ładowaniu strony sprawdzić localStorage i zsynchronizować z bazą jeśli potrzeba.

4. **pagehide** — dodać listener `pagehide` obok `beforeunload` dla lepszej kompatybilności iOS

### Plik 3: `src/components/training/VideoControls.tsx`

1. **Większy przycisk Play na mobile** — zwiększyć min-height do 48px na touch devices

### Plik 4: `src/lib/videoBufferConfig.ts`

1. **iOS detection** — dodać `isIOSDevice()` helper exportowany z tego modułu
2. **iOS-specific config** — na iOS użyć `preloadStrategy: 'auto'` i mniejszy `smartBufferingDelayMs` (brak Connection API)

## Podsumowanie priorytetów

| # | Problem | Wpływ | Złożoność |
|---|---------|-------|-----------|
| 1 | Fullscreen iOS | Wysoki | Niska |
| 2 | play() po await | Wysoki | Średnia |
| 3 | Visibility resume | Średni | Niska |
| 4 | Detekcja iOS | Średni | Niska |
| 5 | Retry zaliczenia | Średni | Niska |
| 6 | beforeunload/pagehide | Niski | Niska |
| 7 | Auto-scroll do przycisku | Niski | Niska |

