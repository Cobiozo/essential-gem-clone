

# Plan: 3 poprawki Auto-Webinar

## 1. Baner "Dziękujemy" pojawia się za wcześnie (BUG KRYTYCZNY)

**Przyczyna**: Funkcja `findCurrentSlot()` (linia 15-42 w `useAutoWebinarSync.ts`) definiuje okno slotu jako `slot.seconds + linkExpirySec` (domyślnie 10 min). Gdy wideo trwa dłużej (np. 18:34), po 10 minutach slot "wygasa" i hook przestaje zwracać wideo.

Dotyczy to zarówno gości jak i zalogowanych użytkowników — `findCurrentSlot` jest używane dla zalogowanych, a dla gości analogiczny warunek `sinceSlot > linkExpirySec` istnieje na linii 206.

**Rozwiązanie** w `useAutoWebinarSync.ts`:
- `findCurrentSlot()`: zmienić `windowEnd` z `slot.seconds + linkExpirySec` na `slot.seconds + Math.max(linkExpirySec, maxVideoDuration + 60)` — gdzie `maxVideoDuration` to najdłuższy film w playliście. Alternatywnie: przekazać listę wideo do `findCurrentSlot` i użyć duration danego slotu.
- Prościej: zmienić `windowEnd` na `slot.seconds + maxVideoDurationSec + roomCloseAfterEndSec` aby okno slotu zawsze obejmowało pełne odtwarzanie + 1 min podziękowania.
- Dla gości: warunek na linii 206 już jest poprawiony (`sinceSlot >= duration`), ale trzeba sprawdzić czy `duration` jest prawidłowe.

**Plik**: `src/hooks/useAutoWebinarSync.ts`

## 2. Podgląd wideo w playliście admina

**Problem**: W tabeli playlisty (AutoWebinarManagement.tsx) brak możliwości podglądu wideo — jest tylko miniaturka/ikonka.

**Rozwiązanie**: Dodać przycisk "Podgląd" (ikona Play) obok każdego wideo w tabeli. Po kliknięciu otwiera Dialog z odtwarzaczem `<video>` pokazującym `video.video_url`.

**Plik**: `src/components/admin/AutoWebinarManagement.tsx`

## 3. Ukrycie lupy PLC OMEGA BASE na stronach auto-webinar

**Problem**: `ChatWidgetsWrapper` w `App.tsx` (linia 190) ukrywa widget na `/auto-webinar` i `/a-w`, ale te prefiksy SĄ już w `knownPrefixes`. Trzeba sprawdzić czy trasa rejestracji gościa jest objęta.

**Rozwiązanie**: W `App.tsx` linii 195 — dodać dodatkowy warunek: jeśli ścieżka zaczyna się od `/auto-webinar` lub `/a-w`, ukryć widget (analogicznie do `isMeetingPage`). Aktualnie warunek `!user` ukrywa widget dla niezalogowanych, ale zalogowani admini/partnerzy widzą lupę na stronie auto-webinaru.

**Plik**: `src/App.tsx` — dodać `const isAutoWebinarPage = path.startsWith('/auto-webinar') || path.startsWith('/a-w');` i uwzględnić w warunku ukrywania.

## Podsumowanie

| Plik | Zmiana |
|------|--------|
| `useAutoWebinarSync.ts` | `findCurrentSlot` — okno slotu = max(linkExpiry, videoDuration) + 60s |
| `AutoWebinarManagement.tsx` | Przycisk podglądu wideo z dialogiem odtwarzacza |
| `App.tsx` | Ukrycie lupy OMEGA na stronach `/auto-webinar` i `/a-w` |

