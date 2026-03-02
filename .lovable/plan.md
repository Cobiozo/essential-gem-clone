
Cel: usunąć trwały błąd produkcyjny `Cannot read properties of undefined (reading 'useLayoutEffect')` w `vendor-utils-*.js`.

Diagnoza po analizie kodu:
- `server.js` ma poprawne nagłówki no-cache dla `index.html` i SPA fallback.
- `sw-push.js` już nie cache’uje `/assets/*.js` i `/assets/*.css`.
- `vite.config.ts` ma bardzo agresywne, ręczne `manualChunks` (szczególnie `vendor-utils` z `@dnd-kit/*` + `@supabase/*` + `date-fns`), co jest znanym źródłem błędów inicjalizacji React hooków po buildzie (kolejność/cyrkularność chunków).

Do I know what the issue is?
Tak — najbardziej prawdopodobna przyczyna to obecna strategia chunkowania (`manualChunks`) generująca niestabilny bundle produkcyjny, a nie sam Service Worker.

Plan naprawy (wdrożenie kodowe):

1) Uproszczenie chunkowania w `vite.config.ts` (priorytet)
- Usunąć ręczne grupy:
  - `vendor-core`
  - `vendor-ui`
  - `vendor-utils`
- Zostawić tylko chunki dla naprawdę ciężkich bibliotek ładowanych na żądanie (`xlsx`, `jspdf/html2canvas/html2pdf.js`, `fabric`, `recharts`, `jszip`, `embla`), najlepiej przez funkcję `manualChunks(id)` opartą o `id.includes(...)`.
- Dla całej reszty (React, Router, TanStack, Radix, dnd-kit, Supabase) pozwolić Vite/Rollup decydować automatycznie.
- Utrzymać `resolve.dedupe` dla React.

2) Stabilizacja CJS/ESM dla bibliotek typu dnd-kit
- W `build.commonjsOptions` dodać:
  - `transformMixedEsModules: true`
- Cel: uniknąć błędnych interopów przy paczkach publikowanych jako mix CJS/ESM.

3) Ograniczenie ryzyka „cross-feature chunk”
- Nie mieszać w jednym ręcznym chunku:
  - bibliotek DnD (UI z hookami React)
  - biblioteki backendowej (`@supabase/supabase-js`)
- To było obecnie w `vendor-utils` i jest architektonicznie kruche.

Plan wdrożenia na produkcję (krytyczne kroki operacyjne):
1. Na serwerze:
   - `rm -rf dist` (usunąć stary build całkowicie)
   - wgrać nowy `dist` jako komplet
2. Restart procesu:
   - `pm2 restart <app> --update-env`
3. Twarde odświeżenie po stronie klienta:
   - najlepiej test w oknie incognito (bez starego SW/session cache)
4. Walidacja HTTP:
   - `index.html` musi mieć `no-cache, no-store, must-revalidate`
   - `/assets/*.js` powinny mieć `immutable`

Checklist testów po poprawce:
1) Wejście na `/` jako niezalogowany — brak błędu w konsoli.
2) Logowanie i przejście na dashboard — brak `useLayoutEffect` exception.
3) Wejście na widok używający DnD (np. panel lidera/edytor bloków) — DnD działa, brak crash.
4) Otworzyć app po kolejnym deployu — brak regresji „white screen / hook undefined”.

Ryzyka i fallback:
- Jeśli błąd nadal wystąpi po uproszczeniu chunków:
  1. tymczasowo całkowicie wyłączyć `manualChunks` (poza domyślnym podziałem Vite),
  2. ponowić czysty deploy (`rm -rf dist` + restart PM2),
  3. dopiero potem wracać do selektywnej optymalizacji bundle.

Zakres plików do zmiany:
- `vite.config.ts` (główna naprawa).
- (bez zmian funkcjonalnych) `server.js` i `public/sw-push.js` pozostają jak są, bo obecnie są zgodne z dobrymi praktykami cache-control.
