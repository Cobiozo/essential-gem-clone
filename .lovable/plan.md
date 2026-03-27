

## Diagnoza problemów

### Problem 1: Nakładanie się wideo BO i HC
W `useAutoWebinar.ts` linia 56: gdy `configId` jest `undefined` (co dzieje się podczas ładowania konfiguracji, bo `config?.id` zwraca `undefined` gdy config jest null), hook pobiera **WSZYSTKIE wideo bez filtra kategorii**. To oznacza, że przez chwilę po wejściu ładowane są filmy z obu kategorii jednocześnie.

```text
config = null (loading) → config?.id = undefined → fetchVideos() → SELECT * bez filtra → filmy BO + HC razem
```

### Problem 2: Szarpanie i przeładowywanie wideo
Efekt odtwarzania wideo (linia 155) zależy od `[currentVideo, startOffset, showWelcome, previewMode, videos]`:
- **`startOffset`** zmienia się co 10 sekund (nowa wartość z `useAutoWebinarSync`), co za każdym razem odpala cleanup + ponowne uruchomienie efektu
- **`videos`** — referencja tablicy zmienia się gdy przejdzie z "wszystkie wideo" (bug z pkt 1) na przefiltrowane
- Choć guard `currentSrcRef` zapobiega przeładowaniu `src`, sam cleanup efektu usuwa listener `canplay`, co może powodować niestabilność w trakcie buforowania

---

## Plan naprawy

### 1. Eliminacja nakładania BO/HC — `useAutoWebinar.ts`
- Zmienić `useAutoWebinarVideos`: gdy `configId` jest `undefined`, **nie pobierać niczego** — zwracać pustą tablicę i `loading: true`
- Usunąć legacy path (linia 56-79) który fetchuje bez filtra
- Dzięki temu wideo ładują się dopiero gdy znany jest `config_id` konkretnej kategorii

### 2. Stabilizacja odtwarzania — `AutoWebinarEmbed.tsx`
- Usunąć `startOffset` i `videos` z tablicy zależności efektu odtwarzania (linia 226)
- Użyć `startOffsetRef` do przechowywania aktualnego offsetu — efekt odczyta go przy `canplay`
- Zależności efektu: tylko `currentVideo?.video_url`, `showWelcome`, `previewMode`
- To gwarantuje, że wideo ładuje się **raz** i nie jest przerywane przez cykliczne aktualizacje sync

### 3. Stabilizacja referencji currentVideo — `useAutoWebinarSync.ts`
- Użyć `useRef` dla poprzedniego `currentVideo` i wywoływać `setCurrentVideo` tylko gdy `video.id` faktycznie się zmieni
- Zapobiegnie to niepotrzebnym re-renderom co 10 sekund

### Pliki do zmiany:
| Plik | Zmiana |
|------|--------|
| `src/hooks/useAutoWebinar.ts` | Usunąć legacy fetch bez filtra; czekać na configId |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Wyciągnąć startOffset do ref; uprościć deps efektu |
| `src/hooks/useAutoWebinarSync.ts` | Stabilizacja referencji currentVideo (set tylko przy zmianie id) |

