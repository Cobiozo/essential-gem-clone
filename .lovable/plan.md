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

## F. Plan wdrożenia (Etap 0–8)

Zasady nadrzędne:
- Etap jest zakończony wyłącznie wtedy, gdy **metryka poprawiła się w output buildu / Network / Profilerze** i nie wystąpiła regresja. Sam fakt „zmieniono kod na dynamiczny import” nie kończy etapu.
- Każdy etap kończy się: production build, `eslint`, istniejące testy, smoke testy `/`, `/login`, `/dashboard`, `/admin`, porównanie bundla, porównanie Network, kontrola błędów w console, kontrola regresji funkcjonalnej.
- Nie wolno stosować barrel exports (`admin/index.ts`) na granicach lazy modułów — dynamiczne importy wskazują konkretny plik (`import("./admin/modules/UsersAdmin")`), inaczej rollup ponownie skleja zależności i code splitting przestaje działać.

### Etap 0 — Baseline (obowiązkowy, bez zmian w kodzie)
Zapis do repo/notatki referencyjnej:
- production build + zachowany `dist/stats.html`,
- rozmiar `index.js` raw i gzip, pełna lista `modulepreload` z `dist/index.html`,
- rozmiar `Admin.js` raw i gzip, TOP 20 chunków,
- Network dla `/`, `/login`, `/dashboard`, `/admin`: liczba requestów, transfer JS, transfer assetów, transfer obrazów/GeoJSON,
- requesty i DB writes przez 10 min idle (zalogowany użytkownik),
- smoke testy kluczowych tras (wynik zapisany).
Kryterium: komplet danych baseline istnieje i jest porównywalny po każdym kolejnym etapie.
Zależność: blokuje wszystkie pozostałe etapy.

### Etap 1 — Initial bundle / preload
Zakres: usunięcie `recharts` (`components/ui/chart.tsx` i konsumentów), `jspdf`/`html2canvas`/`html2pdf.js` oraz `docx`/`xlsx` w `platformStructureExport` z critical path — dynamiczny import w miejscu użycia funkcji.
Ryzyko: przeniesienie ciężkiej biblioteki do innego shared chunka, który nadal ładuje się na starcie; opóźnienie pierwszego renderu wykresu.
Kryteria akceptacji (twarde):
- `dist/index.html` **nie zawiera** `modulepreload` dla `lib-pdf`,
- `dist/index.html` **nie zawiera** `modulepreload` dla `lib-charts`,
- gzip `index.js` faktycznie zmalał vs baseline (390 kB),
- graf importów potwierdza, że biblioteki nie trafiły do innego chunka ładowanego na starcie,
- wykresy i eksporty nadal działają (Statystyki, Security, Omega, eksport struktury).
Metryka przed/po: initial JS gzip; lista modulepreload; liczba requestów na `/`.
„Etap zakończony tylko wtedy, gdy graf importów i output buildu potwierdzają zniknięcie ciężkich bibliotek z critical path.”

### Etap 2 — AdminShell
Zakres: mały `AdminShell` (routing zakładek, layout, uprawnienia) + **10–15 logicznych modułów lazy**, nie 59 osobnych chunków: Users, CMS/Content, Events, Payments, Notifications/Communication, Email, Security, Integrations, AI, Media, System, Training, Reports/Statistics.
Drugi poziom lazy tylko dla wyjątkowo ciężkich funkcji wewnątrz modułu (np. `TemplateDndEditor`/fabric, `TrainingManagement`, edytory CMS).
Ryzyka: utrata stanu przy przełączaniu zakładek, rozjazd uprawnień moderatora, setki drobnych requestów przy zbyt drobnym podziale, przypadkowe scalenie modułów przez barrel export.
Kryteria akceptacji:
- chunk wejściowy `/admin` istotnie mniejszy (cel do potwierdzenia: ≤ 400–450 kB raw vs 2 477 kB),
- wejście na `/admin` nie pobiera kodu nieotwartych zakładek (potwierdzone w Network),
- liczba requestów przy otwarciu zakładki pozostaje jednocyfrowa,
- każda zakładka otwiera się bez błędu w console; smoke Users/CMS/Events.
Metryka przed/po: rozmiar chunku `/admin`, transfer JS przy wejściu, transfer przy otwarciu 3 typowych zakładek.
Zależność: po Etapie 1.

### Etap 3 — Idle network
Zakres:
- **Version polling** — najpierw audyt istniejącego SW (`public/sw-push.js`, rejestracja i `updatefound` w `main.tsx`, `SWUpdateBanner`). Rekomendowany model do potwierdzenia: SW `updatefound` jako mechanizm główny, `/version.json` wyłącznie jako fallback co 5–10 min, zatrzymany przy `document.hidden` (obecnie pauza już istnieje). Wariant końcowy podać po sprawdzeniu, czy SW faktycznie aktualizuje się przy każdym deployu.
- **`last_seen_at`** — najpierw znaleźć wszystkich konsumentów (`last_seen_at`, statusy online/offline, progi „online”) i opisać: jaki próg oznacza online, gdzie jest używany, czy rzadszy heartbeat wywoła fałszywe offline. Dopiero potem dobrać częstotliwość; model do oceny: zapis przy realnej aktywności + throttle, rzadszy heartbeat jako fallback, Presence tam, gdzie potrzebny jest realny realtime.
- **Refetche 30 s** (`SecurityDashboard`, `SubscriptionStatsPanel`) — wstrzymanie przy `document.hidden`/nieaktywnej zakładce.
Ryzyko: fałszywy status offline, opóźnione wykrycie nowej wersji.
Kryteria akceptacji: mniejsza liczba requestów i DB writes w 10 min idle vs baseline, brak regresji w wykrywaniu nowej wersji i w statusach online.
Metryka przed/po: requests/10 min, writes/10 min, per 100 i 1000 użytkowników.

### Etap 4 — Route shells
Zakres: oddzielenie pracy globalnej dla tras publicznych, auth i zalogowanych (`PublicApp` / `AppShell`): inactivity timeout, last-seen, banery, chat, MFA — tylko tam, gdzie mają sens. Usunięcie produkcyjnych `console.log` stanu auth.
**`useSecurityPreventions` — nie przenosić automatycznie.** Najpierw ustalić, co realnie chroni (publiczne formularze, checkout, rejestracja na wydarzenia, publiczne linki, materiały Bazy Wiedzy) i dopiero na tej podstawie zdecydować: globalny / wybrane trasy publiczne / tylko po zalogowaniu. Bezpieczeństwo i funkcjonalność mają pierwszeństwo przed mikrooptymalizacją.
Kryteria akceptacji: brak timerów i requestów użytkownikowych na trasach publicznych, brak utraty ochrony na trasach, gdzie była wymagana.

### Etap 5 — Assets / GeoJSON / PWA (dopiero po pomiarze transferu)
Najpierw klasyfikacja każdego assetu >200 kB: pobierany na initial load / preloadowany / pobierany po otwarciu funkcji / obecny w `public/`, ale nieużywany. Rozmiar pliku w repo ≠ transfer użytkownika.
Zakres po klasyfikacji: kompresja `pwa-*.png` (3× 1012 kB), `favicon.png` (191 kB), porównanie wizualne `countries-50m` (3,0 MB) vs `countries-110m` (838 kB) przy realnych poziomach zoomu, ładowanie GeoJSON dopiero po otwarciu mapy, usunięcie nieużywanych `news-hub-demo`/`reference*.jpg`/`textures` jeśli potwierdzone jako martwe.
Raport przed/po podaje osobno: rozmiar assetu, transfer initial, transfer po wejściu do funkcji. Bez obietnicy „−3 do −6 MB initial”, dopóki Network tego nie potwierdzi.

### Etap 6 — Render hotspots / AuthContext
Najpierw React Profiler: które zmiany Contextu wyzwalają re-render, ile komponentów, które rendery są kosztowne. Dopiero potem wybór rozwiązania: podział Contextu, osobne Providery, store z selectorami, memoizacja `value` Providera albo pozostawienie obecnej architektury. Podział na 4 konteksty nie jest z góry przesądzony.
Kryterium: zmierzone zmniejszenie render fan-out, nie liczba nowych plików. Bez masowego `React.memo`/`useMemo`/`useCallback`.
W tym etapie także priorytetyzacja `select('*')` (296 wystąpień) wg kosztu:
- **P1** — częste, duże tabele/rekordy, listy bez limitu (m.in. `AiCompassWidget` 9×, `QuickStatsWidget`, `NotificationSystemManagement`, `useTranslations`),
- **P2** — średnie kolekcje pobierane przy wejściu na ekran,
- **P3** — pojedynczy mały rekord, sporadycznie — **nie zmieniać**.
Przepisywane są wyłącznie P1 i wybrane P2 z uzasadnionym zyskiem.

### Etap 7 — `lazyWithRetry` (dopiero po stabilizacji chunków)
Nie ruszać przed Etapem 1 i 2, bo obie zmiany przebudowują strukturę chunków i assetów.
Zakres po stabilizacji: zmierzyć realne `ChunkLoadError` w produkcji, następnie uprościć do: 1 kontrolowana ponowna próba → sprawdzenie `/version.json` → reload tylko po potwierdzonej zmianie wersji → ErrorBoundary. Usunięcie globalnego purge Cache Storage i hard reloadu z `?v=`.
Kryterium: brak wzrostu liczby błędów ładowania chunków po zmianie.

### Etap 8 — Dependency cleanup + performance budgets
Zakres: weryfikacja martwych zależności (`d3-geo`, `topojson-client`, `world-atlas`), duplikatów (`xlsx` vs `xlsx-js-style`, `jspdf`/`html2pdf.js`), poprawna klasyfikacja `@playwright/test` i `rollup-plugin-visualizer` (dopiero po potwierdzeniu, że pipeline produkcyjny instaluje devDependencies). Bez zmiany package managera i lockfile.
**Performance budgets** (wartości do potwierdzenia po Etapie 1–2, nie ustawiać ślepo):
- initial JS gzip ≤ 450 kB — liczone jako **cały JS pobierany automatycznie przed interakcją użytkownika**: entry + wszystkie chunki z `modulepreload` + shared chunks ładowane z entry, nie tylko sam `index.js`,
- AdminShell raw ≤ 400–450 kB — **cel orientacyjny**, nie twardy próg; kryterium nadrzędne: wejście na `/admin` nie pobiera kodu nieotwartych modułów (potwierdzone w Network),
- pojedynczy zwykły route chunk ≤ 500 kB raw,
- funkcje >500 kB wyłącznie on-demand,
- brak `lib-pdf` i `lib-charts` w `modulepreload` entry,
- limity: liczba requestów initial, requestów idle/10 min, DB writes idle/10 min.

### Kolejność zależności
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. **Etapy 3 i 4 NIE mogą być prowadzone równolegle** — Etap 4 zaczyna się dopiero po zamknięciu Etapu 3 (oba dotykają pollingu/timerów i App.tsx; równoległa praca powoduje konflikty i niemierzalne wyniki). Etap 5 wymaga danych Network z Etapu 0, Etap 7 wymaga zakończonych 1 i 2, Etap 8 domyka budżety na podstawie wyników 1–2.

## Uwagi

- `package-lock.json` + `bun.lock` + `bun.lockb` — pozostawione bez zmian, zgodnie z ustaleniem. Nie wykryto konfliktu wersji wymagającego działania.
- `compression`, `cors`, `express`, `multer` obsługują `server.js`, nie SPA — nie trafiają do bundla.

