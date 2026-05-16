
# Audyt: mapa w statystykach + ostatnie zmiany

## TL;DR

Brak rzeczywistych pętli ani obciążenia serwera w tej chwili. Edge Functions w ostatnich 24h: tylko 5 wywołań (CRON-y), `geocode-cities` / `geocode-city-boundary` — **0 wywołań**. Ostatnie zmiany (ComposedChart, gcTime, revokeObjectURL, drop console, retry certyfikatów) są bezpieczne.

Znalazłem jednak **jedno niezamknięte ryzyko** w `UserWorldMap.tsx` — niekończące się polling, gdy geokodowanie utknie. Do naprawy prewencyjnie.

## Co sprawdzono

### 1. Mapa świata (`UserWorldMap.tsx`)

- **`refetchInterval` polluje co 5s** dopóki `pending > 0` (linia 84–87):
  ```ts
  refetchInterval: (q) => {
    const d = q.state.data as { pending: number } | undefined;
    return d && d.pending > 0 ? 5000 : false;
  }
  ```
  Działa tylko gdy zakładka jest otwarta (`refetchOnWindowFocus: false`, ale `refetchInterval` jest niezależny). Jeśli backend `geocode-cities` nigdy nie zejdzie do `pending=0` (np. limit OpenStreetMap, błąd quota, miasto niegeokodowalne pozostające w kolejce), zapytanie poleci co 5s w nieskończoność — 720 wywołań/godz na otwartą kartę admina.
  
  **Status w produkcji:** ostatnie 24h — **0 wywołań** `geocode-cities`. Pętli faktycznie nie ma, ale ryzyko jest realne.

- **`animateTo` / `requestAnimationFrame`** (linie 198–223): poprawny `cancelAnim()` przed nową animacją, kończy się gdy `t >= 1`. Brak wycieku.

- **`onMoveEnd → setPosition`** z guardem `isAnimatingRef`: brak feedback-loopa podczas animacji.

- **`Geographies geography={worldTopo}`** renderuje ~250 polygonów krajów + iteruje `normalizeCountry()` na każdej zmianie zoom. Drobny koszt CPU, **nie pętla**.

- **Brak `useEffect` w komponencie** — żadnego setState w setState.

### 2. Edge Functions — ostatnie 24h

| Funkcja | Wywołania |
|---|---|
| `process-pending-notifications` (CRON 1 min) | 2 |
| `send-meeting-reminders` (CRON 5 min) | 2 |
| `refresh-google-tokens` | 1 |
| `geocode-cities` | **0** |
| `geocode-city-boundary` | **0** |

CRON-y działają zgodnie z planem — żadnych retry-loopów, żadnych 5xx, żadnego narastania ruchu. Mapa nie generuje ruchu na produkcji.

### 3. Ostatnie zmiany (Phase 1/2 audytu + fix Recharts)

| Zmiana | Ryzyko |
|---|---|
| `AreaChart → ComposedChart` w `UserStatistics` | Brak — zmiana render-only |
| `QueryClient { gcTime: 10min }` | Brak — bounded cache |
| `vite.config.ts esbuild.drop console/debugger` (prod) | Brak — build-time |
| 9× `URL.revokeObjectURL(...)` | Brak — czyszczenie blobów |
| `useCertificateGeneration` retry 2× + cleanup | Brak — bounded |
| `ImageUploadInput` revoke przed nowym `setCropSrc` | Brak |

Żaden z tych edytów nie wprowadza realtime channel, intervalu ani nieskończonej pętli.

### 4. Pozostałe potencjalne źródła obciążenia

- `fetchAllProfiles` w `UserStatistics` — single pull wszystkich profili przy każdym otwarciu zakładki (jeden tabelowy scan po stronie DB + payload zależny od liczby userów). Cache 60s w React Query, gcTime 10 min, więc maks. 1 request na minutę na admina. Akceptowalne, ale do optymalizacji w przyszłości (RPC z agregacją).
- Realtime channels — brak nowych dodanych w ostatnich edytach.

## Plan naprawczy (1 mała zmiana)

**Plik:** `src/components/admin/UserWorldMap.tsx`

Dodać twarde ograniczenie pętli polling geocoding:

```ts
const pollAttemptsRef = useRef(0);

const { data, isFetching, refetch } = useQuery({
  queryKey,
  queryFn: async () => {
    const r = await geocodeCities(items, false);
    pollAttemptsRef.current = r.pending > 0 ? pollAttemptsRef.current + 1 : 0;
    return r;
  },
  enabled: items.length > 0,
  staleTime: 24 * 60 * 60 * 1000,
  refetchOnWindowFocus: false,
  // Stop polling after 30 attempts (~2.5 min) to prevent runaway loops
  refetchInterval: (q) => {
    const d = q.state.data as { pending: number } | undefined;
    if (!d || d.pending === 0) return false;
    if (pollAttemptsRef.current >= 30) return false;
    return 5000;
  },
});
```

Po naciśnięciu „Odśwież" licznik się resetuje (przez `refetch` + ręczny reset w handlerze przycisku).

To wszystko — żadnych zmian DB, edge functions, ani innych komponentów. Reszta audytu wypada czysto.
