## Zmiany w sekcji komentarzy

**1. `src/hooks/useNewsHubComments.ts`**
- `EDIT_WINDOW_MS` z 5 minut → **1 minuta** (`60 * 1000`).

**2. `src/components/news-hub/CommentsSection.tsx`**
- Usunąć tekst „· Edycja możliwa przez 5 minut" pod polem nowego komentarza (zostawić tylko licznik znaków `0/2000`).
- Usunąć badge z zegarem (`Clock` + `timeLeft(...)`) przy komentarzach w oknie edycji.
- Usunąć nieużywane importy (`Clock`) oraz pomocnicze `useNow` / `timeLeft`.

Bez zmian: logika 1-minutowego okna nadal obowiązuje (autor po minucie nie zobaczy „Edytuj"/„Usuń"), moderacja, wulgaryzmy i realtime pozostają bez zmian.