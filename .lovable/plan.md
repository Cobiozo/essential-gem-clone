# Stage 6 — trace źródeł aktualizacji stanu (`?stage6TraceUpdates=1`)

Cel: zamiast kolejnych A/B, przechwycić realne wywołania setState/dispatch/store-subscription podczas 120 s bezczynności na `/dashboard` i zagregować je wg komponentu/hooka.

## A. Gdzie wpiąć instrumentation

1. **Globalny patch Reacta przed pierwszym renderem** — w `src/main.tsx`, zaraz po imporcie React, tylko gdy flaga jest aktywna. Owijamy `React.useState`, `React.useReducer`, `React.useSyncExternalStore` i `React.useEffect` (ten ostatni tylko po to, by znać „właściciela”):
   - `useState` → zwracamy opakowany setter, który przy wywołaniu inkrementuje licznik w mapie `ownerKey → count`.
   - `useReducer` → to samo dla `dispatch`.
   - `useSyncExternalStore` → opakowujemy `subscribe`, licząc wywołania `onStoreChange` (to pokrywa SessionTimer po Stage 6A, sidebar, react-query itd.).
   - Właściciel ustalany raz, w momencie wywołania hooka, przez jednorazowy `new Error().stack` przycięty do 3–4 ramek — koszt płacony przy montowaniu, nie przy każdym update.
2. **Znacznik commitów** — lekki `onCommitFiberRoot` (bez fiber walk): tylko licznik + timestamp, żeby powiązać liczbę updates z liczbą commitów i wykryć bursty (odstęp <100 ms).
3. **Ręczne oznaczenie globalnych źródeł** — nie jest potrzebna edycja kontekstów: wszystkie ich `useState` przechodzą przez patch z punktu 1, więc `AuthProvider`, `LanguageProvider`, `ChatSidebarProvider`, `SidebarProvider`, `EditingProvider` pojawią się w raporcie po stacku.
4. **Raport z konsoli** — `window.__PURE_STAGE6_UPDATE_REPORT()` zwraca posortowaną listę źródeł (updates, updates/min, udział %), listę burstów i sumaryczną liczbę commitów; auto-stop po 180 s.

## B. Ograniczenia metody

- Produkcyjny bundle jest zminifikowany: nazwy komponentów w stacku często będą skrócone (`Kb`, `chunk-XYZ.js:12:345`). Sourcemapy w DevTools mogą to częściowo odwzorować; jeżeli nie — atrybucja będzie na poziomie pliku/offsetu, nie nazwy.
- Zliczamy wywołania setterów, nie faktyczne re-rendery: React może zbatchować kilka setState w jeden commit albo zrobić bailout, gdy wartość się nie zmienia. Wszystkie liczby są przybliżone.
- Nie obejmiemy aktualizacji spoza React API: zewnętrznych store'ów, które wymuszają render inną drogą, oraz aktualizacji pochodzących z kodu rozszerzeń przeglądarki.
- Patch działa tylko dla hooków wywołanych po nałożeniu wrappera — dlatego musi być w `main.tsx` przed `createRoot`.
- Sam wrapper dokłada minimalny narzut (jedna inkrementacja licznika na update), co może nieznacznie przesunąć wyniki czasowe.

## C. Pliki do zmiany

| Plik | Zmiana |
| --- | --- |
| `src/lib/stage6Flags.ts` | nowa stała `STAGE6_TRACE_UPDATES` (ten sam wzorzec `hasFlag`) |
| `src/lib/stage6UpdateTracer.ts` (nowy) | całość instrumentacji + `__PURE_STAGE6_UPDATE_REPORT()` |
| `src/main.tsx` | 3 linie: warunkowy import/wywołanie `installUpdateTracer()` przed `createRoot` |

Bez flagi: żaden kod tracera się nie wykonuje (early return), zero patchy Reacta, zero listenerów — brak narzutu runtime. Żadnych zmian w komponentach, kontekstach, Auth, Supabase, realtime, timerach ani optymalizacji.

Po implementacji: typecheck + production build + SHA, następnie STOP — bez optymalizacji.
