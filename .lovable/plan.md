# Audyt wydajności — raport z pomiarów (bez zmian w kodzie)

Wszystkie liczby pochodzą z realnego production buildu (`vite build`, 38.7 s) i skanu źródeł. Nie zmieniano package managera ani lockfile.

## A. Executive summary — 10 realnych problemów

| # | Problem | Pomiar | Prio |
|---|---|---|---|
| 1 | `Admin.tsx` = jeden monolit: 101 statycznych importów (59 modułów admina), 5545 linii, **0** `lazy()` | chunk `Admin.js` **2 476 kB / 574 kB gzip** (4 926 kB przed minifikacją) | P0 |
| 2 | `docx` (657 kB) w chunku Admin — używany tylko w `exports/platformStructureExport.ts` | 657 kB rendered w Admin | P0 |
| 3 | `lib-charts` (568 kB) i `lib-pdf` (639 kB) są **modulepreload w `index.html`** — pobierają się na `/` i `/login` | zob. `dist/index.html` | P0 |
| 4 | Entry `index.js` **1 659 kB / 390 kB gzip**; w środku m.in. `lucide-react` 771 kB, `SecureMedia.tsx` 84 kB, `CMSContent.tsx` 62 kB, `qrcode` 73 kB | initial JS ≈ 390 kB gzip + preloady | P0 |
| 5 | `public/geo/countries-50m.geojson` **3,0 MB** (+110m 838 kB) parsowany na main thread w mapie admina | 3,8 MB w `public/geo` | P1 |
| 6 | PWA ikony: `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png` po **1012 kB** każda; `favicon.png` 191 kB | 3 MB assetów | P1 |
| 7 | `AppContent` uruchamia globalnie `useVersionPolling`, `useSecurityPreventions`, `useDynamicMetaTags`, `useInactivityTimeout`, `useLastSeenUpdater` — również na trasach publicznych; logi `console.log` auth state przy każdej zmianie | 594 linie App.tsx | P1 |
| 8 | `lazyWithRetry` przy błędzie czyści **cały Cache Storage** i robi hard reload z `?v=` → ponowne pobranie wszystkich assetów | App.tsx 40–110 | P1 |
| 9 | 296 wystąpień `select('*')`, 34 pliki z `supabase.channel`, 33 z `postgres_changes` — brak wspólnej warstwy subskrypcji | skan src | P1 |
| 10 | Duplikacja bibliotek o tej samej funkcji: `xlsx` (869 kB) + `xlsx-js-style` (879 kB), `jspdf`+`html2pdf.js`+`html2canvas`+`pdfjs-dist`, `d3-geo`/`topojson`/`world-atlas` obok Leafleta | ~2,4 MB duplikatów | P1 |

## B. Bundle report

- Cały JS w `dist/assets`: **11 MB** (raw), CSS 234 kB.
- Initial JS (`/`): `index.js` 1 659 kB → **390 kB gzip** + modulepreload `lib-charts` (157 kB gzip) + `lib-pdf` (190 kB gzip) + `lib-carousel` ⇒ realnie **~750 kB gzip na starcie**.
- TOP chunki (raw): Admin 2 477 · index 1 659 · lib-xlsx 1 061 · lib-pdf 639 · lib-charts 568 · NewsHubPostPage 495 · pdf 337 · MeetingRoom 333 · lib-fabric 286 · MyAccount 275 · useDashboardMapSettings (Leaflet) 210 · TicketVerificationPanel 155.
- TOP paczki (rendered): xlsx-js-style 879 · xlsx 869 · lucide-react 771 · docx 657 · recharts 616 · pdfjs-dist 582 · leaflet 451 · html2canvas 401 · jspdf 394 · date-fns 314 · fabric 281 · fast-png 248 · prosemirror-view 239 · tiptap-core 195 · canvg 165 · peerjs 159 · lodash 151 · mediapipe 124.
- Trasy: `/` i `/login` → index + 3 preloady (nadmiar). `/dashboard` → index + Dashboard + widgety (+ Leaflet, jeśli aktywny widget mapy). `/admin` → index + **cały** Admin 2,5 MB.

## C. Ciężkie zależności — gdzie i jak

- `xlsx` — `EventRegistrationReport`, `TicketVerificationPanel`, `platformStructureExport` (statycznie) → `lib-xlsx`.
- `xlsx-js-style` — `EventFormSubmissions`, `EventFormPartnerStats` (statycznie) → `lib-xlsx`. **Dwie biblioteki Excel w projekcie.**
- `docx` — `platformStructureExport` (statycznie) → trafia do chunku **Admin**.
- `jspdf`/`html2canvas`/`html2pdf.js`/`pdfjs-dist` → `lib-pdf`/`pdf`, ale `lib-pdf` jest preloadowany z entry.
- `recharts` (8 miejsc: UserStatistics, SecurityDashboard, ChallengeStats, Omega*, Leader/Reflink, ui/chart) → `lib-charts`, preloadowany z entry.
- `fabric` — `TemplateDndEditor`, `BpFileMappingEditor` → `lib-fabric`, ładowany wyłącznie w Admin.
- `leaflet` + `markercluster` — `UserWorldMap*` → chunk `useDashboardMapSettings` (widget dashboardu!).
- `peerjs`, `@mediapipe/tasks-vision` — `MeetingRoom` (poprawnie odizolowane).
- `@tiptap/*` + prosemirror ≈ 560 kB — `news-hub/editor/RichTextEditor`.
- `d3-geo`, `topojson-client`, `world-atlas` — pozostałość po starej mapie D3, do zweryfikowania jako martwe zależności.

## D. Runtime report

- **Rendery:** `AuthContext` trzyma w jednym Context 12 wartości (session, user, profile, roles, MFA, loginTrigger, isFreshLogin, loading, rolesReady…) — każda zmiana renderuje wszystkich konsumentów, łącznie z `AppContent` (root). `Admin.tsx` (5545 linii) ma wszystkie zakładki w jednym drzewie — zmiana lokalnego stanu rekoncyliuje cały panel.
- **CPU:** interwały 500 ms–1 s: `SecureMedia` (500 ms sync + 1 s checkpoint + 10 s watchdog), `MeetingTimer`, `WelcomeWidget` (1 s przy zegarze), `DayCountdown`, `AdminPasswordGate` (500 ms), `SelectionOverlay` (250 ms), `useBrowserTranslationDetector` (4 s). Parsowanie GeoJSON 3 MB synchronicznie.
- **Sieć w idle (10 min, 1 zalogowany użytkownik):** version polling 60 s = 10 req; notifications polling 60 s = 10 req (gdy realtime off); `useLeaderApprovals` 60 s = 10 req; last-seen **UPDATE co 2 min = 5 zapisów**; realtime WS 1–N kanałów. Razem ≈ **30–40 requestów + 5 zapisów DB / 10 min / użytkownik**. Dla 100 użytkowników ≈ 3–4 tys. req i 500 UPDATE-ów; dla 1000 ≈ 30–40 tys. req i **5 000 UPDATE-ów na tabelę `profiles` co 10 min** (realny koszt WAL/replikacji, plus szum realtime na `profiles`).
- **Panele admina 30 s:** `SecurityDashboard` i `SubscriptionStatsPanel` odpytują co 30 s także wtedy, gdy zakładka jest niewidoczna.
- **Memory:** największe ryzyko w `VideoRoom` (peer/stream/mediapipe), `SecureMedia` (interwały + object URL), Leaflet (klastry przy remountach).

## E. Architektura do rozbicia

1. `Admin.tsx` → `AdminShell` (routing zakładek) + lazy moduły: Users, CMS, Events, Payments, Notifications, Email, Security, Integrations, AI, Media, System.
2. `App.tsx` → `PublicApp` (bez auth-timerów, bez version polling, bez last-seen) / `AppShell` dla tras zalogowanych.
3. `AuthContext` → rozdział na `SessionContext` (user/session), `ProfileContext`, `RolesContext`, `MfaContext`.
4. Duże komponenty: `TrainingManagement` 3018, `VideoRoom` 2673, `SecureMedia` 2574, `LivePreviewEditor` 2326, `EventRegistrationsManagement` 1987.

## F. Plan wdrożenia (etapami, każdy = osobne wdrożenie)

**Etap 1 — initial bundle (największy zysk, najmniejsze ryzyko)**
1. Usunąć `recharts`/`lib-pdf` z grafu entry (dynamiczny import `ui/chart` i eksporterów PDF) → znikną modulepreloady w `index.html`.
2. `docx` i `xlsx` w `platformStructureExport` → `await import()` w handlerze eksportu.
3. Weryfikacja: nowy build, porównanie `index.js` gzip i listy `modulepreload`.
Oczekiwane: initial ~750 kB gzip → **~390 kB**.

**Etap 2 — AdminShell**
Zamiana 59 statycznych importów na `lazy()` per moduł, zakładka renderowana dopiero po wybraniu. Cel: chunk `/admin` **2 477 kB → < 400 kB**, reszta on-demand. Test: wejście na każdą zakładkę + smoke CMS/Events/Users.

**Etap 3 — assety statyczne**
Kompresja `pwa-*.png` (1012 kB → < 60 kB każda), `favicon.png` (191 kB → < 20 kB), ocena `countries-50m.geojson` vs `110m` (porównanie wizualne przy zoomie mapy) + ładowanie GeoJSON tylko po otwarciu mapy. Cel: −3 do −6 MB transferu.

**Etap 4 — shelle tras**
`PublicApp` bez version pollingu, last-seen, inactivity, security hooks i banerów; usunięcie `console.log` auth state z produkcji.

**Etap 5 — sieć w idle**
Ujednolicenie pollingu (version 60 s → 5 min lub reakcja na SW `updatefound`), last-seen 2 min → 10 min i tylko przy realnej aktywności, wyłączenie 30-sekundowych refetchy przy `document.hidden`.

**Etap 6 — Context split + hotspoty render**
Rozdzielenie `AuthContext`; memoizacja wyłącznie tam, gdzie profiler React pokaże koszt (bez masowego `memo`/`useMemo`).

**Etap 7 — `lazyWithRetry`**
Uproszczenie do: 1 kontrolowana ponowna próba → sprawdzenie `/version.json` → reload tylko przy zmianie wersji → ErrorBoundary. Bez czyszczenia całego Cache Storage.

Po każdym etapie: production build + `eslint` + przejście `/`, `/login`, `/dashboard`, `/admin`, porównanie rozmiarów chunków i liczby requestów.

## Uwagi

- `package-lock.json` + `bun.lock` + `bun.lockb` — pozostawione bez zmian, zgodnie z ustaleniem. Nie wykryto konfliktu wersji wymagającego działania.
- `@playwright/test` i `rollup-plugin-visualizer` są w `dependencies` — nie trafiają do bundla (nieimportowane z `src`), ale to nieprawidłowa klasyfikacja; do przeniesienia dopiero po potwierdzeniu, że pipeline produkcyjny instaluje devDependencies. Zmiana nie daje zysku runtime.
- `d3-geo`, `topojson-client`, `world-atlas`, `compression`, `cors`, `express`, `multer` w `dependencies` — pierwsze trzy do weryfikacji jako martwe po migracji na Leaflet; ostatnie cztery obsługują `server.js`, nie SPA.
