## Problem

Na mobile i tablecie:
1. **Baner Centrum Aktualności** (`NewsHubBanner.tsx`) — używa stałej `height` w px i `background-size: cover/contain/fill`, przez co grafika jest przycinana po bokach zamiast skalować się do szerokości ekranu.
2. **Cover artykułu** (`PostContent.tsx`) — używa `object-fit: cover` z `aspect-[16/10]`, więc grafika 9:16 (pionowa) jest mocno przycinana po bokach.

Użytkownik chce, aby na mobile/tablet **cała grafika była widoczna i dopasowana do szerokości ekranu** (bez przycinania), a wysokość dostosowywała się proporcjonalnie.

## Rozwiązanie

### 1. `src/components/news-hub/NewsHubBanner.tsx`

- Poniżej breakpointu `md` (768px) renderować baner jako pojedynczy `<img>` z `w-full h-auto object-contain`, zamiast `div` z `background-image` i sztywną wysokością.
- Tekst (title / subtitle / CTA) na mobile pozostaje pod obrazkiem (stack), nie jako overlay — żeby nic nie zasłaniało skalowanej grafiki.
- Od `md` w górę zachować obecne zachowanie z `background-image`, overlayem i overlay-tekstem.
- Usunąć poziomy padding kontenera na mobile (`px-0 sm:px-4`), żeby baner sięgał od krawędzi do krawędzi telefonu.
- Zaokrąglenia: `rounded-none sm:rounded-2xl` na mobile (pełna szerokość), `rounded-2xl` od `sm` w górę.

### 2. `src/components/news-hub/PostContent.tsx`

- Dla cover image: na mobile użyć `object-contain` zamiast `object-cover`, bez wymuszonego `aspect-[16/10]` — `w-full h-auto`, max-height `max-h-[70vh]`.
- Od `md` w górę zachować obecne ustawienia (z opcjonalnym `cover.height` / `cover.fit`).
- Tło `bg-muted` zostaje, żeby pionowe grafiki nie wyglądały „goło".

### Szczegóły techniczne

- Breakpoint przełączenia: Tailwind `md` (≥768px) — odpowiada `useIsMobile` w projekcie.
- Style overrides (`cover.height`, `cover.fit`, `cover.position`) nadal honorowane od `md` w górę; na mobile ignorowane na rzecz pełnego dopasowania do szerokości.
- Banner `config.height` jest stosowane tylko od `md` w górę.

## Pliki

- `src/components/news-hub/NewsHubBanner.tsx`
- `src/components/news-hub/PostContent.tsx`

Bez zmian w backendzie, bez migracji.
