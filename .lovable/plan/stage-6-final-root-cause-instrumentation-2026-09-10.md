# Stage 6 — final root-cause instrumentation

## Zakres

Wyłącznie rozbudowa istniejącej diagnostyki `?stage6TraceUpdates=1`. Bez optymalizacji, zmian zachowania aplikacji, nowych flag A/B, refaktoru komponentów ani zmian Supabase.

## Implementacja

1. Rozszerzyć tracer do modelu zdarzeń `dispatch → commit`:
   - przechwytywać `useState`, `useReducer` i `useSyncExternalStore`;
   - dla źródła przechowywać licznik, pierwszy/ostatni czas i maksymalnie 3 przykładowe stosy;
   - bez fiber walk na hot path; owner, hook index i render stack ustalać tylko przy rejestracji hooka.

2. Dodać klasyfikację dispatchu:
   - render, commit/ref, layout/passive effect, event, timer/RAF, observer, external store lub unknown;
   - opakować diagnostycznie rejestrację callbacków timerów, RAF i observerów, aby zachować stos miejsca utworzenia oraz wyliczyć rzeczywistą częstotliwość callbacku;
   - wrappery będą aktywne wyłącznie pod istniejącą flagą i przy wyłączonej fladze nie wprowadzą runtime overhead.

3. Odrzucać wtórne aktualizacje refów:
   - stosy z `safelyAttachRef`, `commitAttachRef`, `composeRefs`, Radix Slot oraz znanymi setterami Select oznaczać `SECONDARY_COMMIT_UPDATE`;
   - nie przypisywać ich jako `FIRST_DISPATCH`.

4. Korelować commity:
   - przechowywać ograniczony bufor ostatnich kandydatów na pierwszy dispatch;
   - dla każdego `onCommitFiberRoot` przypisać najbliższy wcześniejszy, niewykorzystany pierwotny dispatch w krótkim oknie korelacji;
   - raportować deltę dispatch→commit, komponent, hook, caller i stack;
   - osobno oznaczać commity bez wiarygodnego dispatchu.

5. Dodać bursty z progiem `<250 ms`:
   - start, czas trwania, liczba commitów, pierwszy/ostatni dispatch i zagregowane źródło;
   - rozróżniać wiele niezależnych burstów od jednego źródła generującego serię commitów.

6. Rozszerzyć istniejące API konsoli, bez dodawania nowej flagi:
   - `__PURE_STAGE6_UPDATE_RESET()` — zeruje próbkę;
   - `__PURE_STAGE6_UPDATE_REPORT()` — zatrzymuje i zwraca sekcje A–H;
   - `__PURE_STAGE6_UPDATE_STACKS(n)` — szczegóły ograniczone do top źródeł;
   - marker wersji/statusu pozostanie dostępny w `window`.

7. Raport będzie zawierał:
   - commits/min i pokrycie korelacją;
   - TOP 10 pierwotnych źródeł z updates/min i correlated commits;
   - burst analysis;
   - external-store, provider/context, timer/RAF/observer i Supabase/fetch correlation;
   - jednoznaczny `ROOT CAUSE = ...` tylko przy dominującym, wiarygodnym źródle; w przeciwnym razie wymagany komunikat o potrzebie instrumentacji scheduler-level.

## Weryfikacja

- Uruchomić TypeScript check przez `tsgo` oraz production build.
- Sprawdzić, że bez flagi tracer nie instaluje wrapperów ani globalnego API.
- Sprawdzić strukturę raportu testem deterministycznym/syntetycznym, bez wykonywania requestów aplikacji.
- Nie wykonywać ani nie fabrykować authenticated testu 120–180 s: środowisko ma zewnętrzny Supabase (`external_unmanaged`) i nie udostępnia sesji zwykłego użytkownika. Po wdrożeniu test produkcyjny wymaga ręcznego `RESET → 120–180 s idle → REPORT/STACKS` w zalogowanej sesji.
- Podać zmienione pliki, production build i dokładny SHA, po czym zatrzymać się bez optymalizacji.

## Ograniczenia techniczne

- Publiczne API React 18 nie ujawnia bezpośrednio fazy layout/passive ani nazwy context providera dla każdego dispatchu; klasyfikacja będzie jawnie oznaczona jako heurystyczna.
- `onCommitFiberRoot` nie ujawnia przyczyny commitu. Korelacja czasowa nie jest dowodem scheduler-level przy concurrent rendering, batchingu i transition.
- Minifikowany production bundle bez prywatnej sourcemapy poda lokalizacje bundle; tracer nie opublikuje sourcemapy.
- Bez patchowania prywatnych scheduler/reconciler internals nie da się zagwarantować relacji 1:1 między dispatchami i commitami. Raport pokaże confidence i commity nieprzypisane.
