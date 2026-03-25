

# Plan udoskonalenia Auto-Webinarów

Bazując na audycie, plan podzielony na 3 fazy: naprawy krytyczne, ulepszenia funkcjonalne, rozszerzenia.

---

## Faza 1 — Naprawy krytyczne (stabilność)

### 1.1 RLS dla anonimowych użytkowników na publicznej stronie
**Migracja SQL** — dodać polityki SELECT dla roli `anon` na `auto_webinar_config` i `auto_webinar_videos`, aby publiczna strona `/auto-webinar/watch/:slug` mogła pobierać dane bez logowania.

### 1.2 Autoplay policy — muted start + przycisk unmute
**Plik:** `AutoWebinarEmbed.tsx`
- Video startuje z `muted={true}`
- Overlay z przyciskiem "🔊 Włącz dźwięk" pojawia się na playerze
- Po kliknięciu: `video.muted = false`, ukryj overlay
- Eliminuje blokadę autoplay we wszystkich przeglądarkach

### 1.3 Obsługa błędów video
**Plik:** `AutoWebinarEmbed.tsx`
- Dodać `onError` na `<video>` — wyświetlić komunikat "Nie udało się załadować transmisji. Spróbuj odświeżyć stronę."
- Dodać `onStalled` / `onWaiting` — pokazać spinner/bufor overlay

### 1.4 Error state i retry w hookach
**Plik:** `useAutoWebinar.ts`
- Dodać `error` state do `useAutoWebinarConfig` i `useAutoWebinarVideos`
- Automatyczny retry (3 próby z backoff) przy błędzie sieci

---

## Faza 2 — Ulepszenia funkcjonalne

### 2.1 Kontrolki playera (volume, fullscreen)
**Nowy komponent:** `AutoWebinarPlayerControls.tsx`
- Pasek na dole playera: przycisk mute/unmute, suwak głośności, przycisk fullscreen
- Styl: półprzezroczyste tło, auto-hide po 3s bez ruchu myszy

### 2.2 Walidacja godzin w panelu admina
**Plik:** `AutoWebinarManagement.tsx`
- Blokada zapisu gdy `start_hour >= end_hour`
- Komunikat walidacyjny pod polami godzin

### 2.3 Publiczna strona — lepszy fallback
**Plik:** `AutoWebinarPublicPage.tsx`
- Gdy `is_enabled = false` → przekierowanie na stronę główną zamiast komunikatu "Auto-webinary są wyłączone"
- Gdy poza godzinami → komunikat "Transmisja zakończyła się. Następna sesja wkrótce." (bez ujawniania mechaniki)

### 2.4 Optymalizacja timera synchronizacji
**Plik:** `useAutoWebinar.ts` (`useAutoWebinarSync`)
- Zmienić interwał z 1s na 10s dla ogólnej synchronizacji
- Przełączać na 1s tylko podczas countdown (secondsToNext <= 300)

---

## Faza 3 — Rozszerzenia (roadmap)

### 3.1 Analityka oglądalności
- Nowa tabela `auto_webinar_views` (user_id, video_id, joined_at, left_at, watch_duration_seconds)
- Hook `useAutoWebinarTracking` — loguje wejście/wyjście z pokoju
- Sekcja w panelu admina z podstawowymi statystykami

### 3.2 Podgląd admina
**Plik:** `AutoWebinarManagement.tsx`
- Przycisk "Podgląd pokoju" otwierający modal z `AutoWebinarEmbed` w trybie preview (ignoruje harmonogram, odtwarza pierwszy aktywny film)

---

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| Migracja SQL | RLS anon dla config + videos |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Muted autoplay, unmute overlay, error handling |
| `src/hooks/useAutoWebinar.ts` | Error/retry, optymalizacja timera |
| `src/components/auto-webinar/AutoWebinarPlayerControls.tsx` | **Nowy** — volume, fullscreen |
| `src/components/auto-webinar/AutoWebinarManagement.tsx` | Walidacja godzin, podgląd admina |
| `src/pages/AutoWebinarPublicPage.tsx` | Lepszy fallback gdy wyłączone |
| Migracja SQL (faza 3) | Tabela `auto_webinar_views` |
| `src/hooks/useAutoWebinarTracking.ts` | **Nowy** — tracking oglądalności |

