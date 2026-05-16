
# Statystyki użytkowników: błąd `u[i] is not a function` + audyt pętli

## 1. Root cause błędu na produkcji

**Plik:** `src/components/admin/UserStatistics.tsx`, linie 525–541.

Mieszanie typów wykresów Recharts — wewnątrz `<AreaChart>` jest też `<Line>`:

```tsx
<AreaChart data={stats.trend}>
  ...
  <Area type="monotone" dataKey="count" ... />
  <Line type="monotone" dataKey="cumulative" ... />   {/* ⛔ nieprawidłowe dziecko */}
</AreaChart>
```

`<Line>` nie jest legalnym dzieckiem `<AreaChart>` — w dev (StrictMode) lib jest pobłażliwy, ale w **minified prod build** Recharts iteruje po komponentach jako `children[i].type(...)` i wywala się dokładnie tak jak na zrzucie: `u[i] is not a function`. Dlatego błąd pojawia się tylko na produkcji.

**Fix (1 zmiana):** zamienić wrapper na `ComposedChart`, który oficjalnie pozwala mieszać `Area` + `Line`:

```tsx
import { ComposedChart, Area, Line, ... } from 'recharts';
...
<ComposedChart data={stats.trend}> ... <Area .../> <Line .../> </ComposedChart>
```

## 2. Obciążenie serwera — co realnie kosztuje na tej zakładce

`fetchAllProfiles` (linie 59–78) pobiera **wszystkie** profile z 28 kolumnami w pętli paginacji po 1000. Dla bazy z 5k+ użytkowników: 5+ round-tripów × ~500 KB JSON = duże obciążenie sieci i RAM-u klienta, a po stronie DB jeden tabelowy scan na zakładkę. Cache w React Query trzyma tę kopię w pamięci 10 min.

**Rekomendacja (opcjonalna, niezależna od fixu #1):** przenieść agregacje (KPI, kraje, miasta, trend, lejek) do funkcji RPC `get_user_statistics()` w Supabase i zwracać gotowy JSON ~5 KB zamiast surowych wierszy. Drugi krok to lazy-load samej zakładki (już jest w `Admin.tsx` jako import bezpośredni — zmienić na `lazy()`).

## 3. Audyt pętli (frontend + serwer)

**Skan frontu:**
- 44 `setInterval` — wszystkie sprawdzone hooki/komponenty mają `clearInterval` w cleanupie (próbka: `useNotifications`, `useAutoWebinarSync`, `useVersionPolling`, `useInactivityTimeout`, `WelcomeWidget`, `NewsTicker`, `SWUpdateBanner`, `MFAChallenge`, `HtmlPage`).
- 26 plików z realtime `supabase.channel(...)` — 14 najważniejszych zweryfikowanych: każdy ma `removeChannel`/`unsubscribe` w cleanupie. Brak osieroconych kanałów.
- Nie znaleziono `useEffect` bez tablicy zależności, który by setState w innym setState (potencjalny re-render loop) w hot-path komponentach Admina.

**Skan backendu:**
- Postgres ERROR/FATAL w ostatnich 6h: **8 wpisów** — w normie, brak narastającego loopu.
- Edge Functions w ostatniej godzinie: tylko CRON `process-pending-notifications` (2 wywołania) i `send-meeting-reminders` (2) + `get-vapid-public-key` (7) i 1 inna. Brak HTTP 5xx, brak loopów wywołań.
- CRON `process-pending-notifications` ma już logikę "skip if interval not reached, no critical events" — działa zgodnie z założeniami.

**Wniosek:** żadnej pętli serwerowej / klienckiej. Postrzegane "obciążenie serwera" przy klikaniu w statystyki to **jednorazowy ciężki download** wszystkich profili (punkt 2) plus crash Recharts (punkt 1), nie pętla.

## 4. Plan działania

```text
Krok 1 (krytyczny — odblokowuje zakładkę)
  - UserStatistics.tsx: AreaChart → ComposedChart, dodać import ComposedChart

Krok 2 (opcjonalny — odciążenie serwera, do zatwierdzenia osobno)
  - Migracja: funkcja get_user_statistics() w Postgresie z agregacjami
  - UserStatistics.tsx: zamienić fetchAllProfiles na .rpc('get_user_statistics')
  - Admin.tsx: lazy() na UserStatistics
```

Krok 1 zrobię od razu — to jedna mała zmiana, bez ryzyka regresji. Krok 2 to większy ruch (nowa funkcja w DB + refactor komponentu) — czeka na osobne zatwierdzenie.
