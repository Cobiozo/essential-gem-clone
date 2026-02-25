

## Naprawa dlugiego i nieskonczonego buforowania wideo w szkoleniach

### Zidentyfikowane przyczyny problemow

#### 1. Petla buforowania (KRYTYCZNY)
Sekwencja zdarzen prowadzi do nieskonczonej petli:
- `waiting` event -> ustawia smart buffering -> pauzuje wideo (na wolnej sieci)
- `canplay` event -> 800ms opoznienie -> probuje wznowic
- Wznowienie triggeruje kolejne `waiting` jeszcze zanim bufor jest wystarczajacy
- Cykl powtarza sie w nieskonczonosc

#### 2. `handleStalled` natychmiast ustawia buforowanie (WAZNY)
Linia 714-718: zdarzenie `stalled` natychmiast ustawia `isBuffering = true` i `isBufferingRef = true` bez zadnego debounce. Przegladarki emituja `stalled` nawet gdy jest wystarczajaco danych do odtwarzania -- to powoduje falszywe wejscie w tryb buforowania.

#### 3. `video.load()` w retry niszczy bufor (WAZNY)
Funkcja `handleRetry` (linia 1247) wywoluje `video.load()`, co kasuje CALY zbuforowany material i zaczyna ladowanie od nowa. Na wolnej sieci to powoduje jeszcze dluzsze buforowanie.

#### 4. Brak `loadeddata` handlera w restricted mode
`videoReady` (ktore kontroluje `opacity: 0/1`) jest ustawiane tylko w `handleCanPlay`. Jesli `canplay` nie zdazy sie wyemitowac (wolna siec), wideo jest ukryte (`opacity: 0`) w nieskonczonosc -- uzytkownik widzi pusty ekran ze spinnerem.

#### 5. Token refresh restartuje wideo
Co 3.5 minuty token jest odswiezany (linia 304-322), co zmienia `signedUrl` i powoduje pelny reload elementu video -- utrata bufora i restart buforowania.

#### 6. Timeout canplay z 800ms opoznieniem
`handleCanPlay` opoznia wznowienie o 800ms (linia 792). W tym czasie moze przyjsc kolejny `waiting` event, co resetuje stan buforowania.

### Plan naprawy

#### Zmiana 1: Naprawic petle buforowania w `handleCanPlay`
- Natychmiastowe wznowienie odtwarzania w `handleCanPlay` bez 800ms opoznienia (przeniesc delay tylko na czyszczenie flagi UI `isBuffering`)
- Dodac guard `isResuming` ref zeby uniknac podwojnego wznowienia

#### Zmiana 2: Debounce dla `handleStalled`
- Zamiast natychmiastowego `setIsBuffering(true)`, dodac 2s timeout (podobnie jak w `handleWaiting`)
- Jesli `canplay` przyjdzie w ciagu 2s, anulowac stalled

#### Zmiana 3: Naprawic `handleRetry` -- bez `video.load()`
- Zamiast `video.load()` (ktore niszczy bufor): uzyc `video.currentTime = currentPos` + `video.play()`
- Tylko w przypadku bledu sieciowego (error handler) uzywac pelnego `load()`

#### Zmiana 4: Dodac `loadeddata` handler do ustawiania `videoReady`
- W obu trybach (restricted i unrestricted) nasluchiwac na `loadeddata` i ustawiac `videoReady = true`
- To zapobiegnie nieskonczonemu ukrywaniu wideo na wolnych sieciach

#### Zmiana 5: Naprawic token refresh aby nie restartowac wideo
- Zamiast zmieniac `signedUrl` (co triggeruje reload), uzyc `video.src` bezposrednio gdy wideo jest zapauzowane
- Jesli wideo gra -- odlozyc refresh do nastepnej pauzy

#### Zmiana 6: Zredukowac falszywe buforowanie
- W `handleWaiting`: jesli `video.readyState >= 3` (HAVE_FUTURE_DATA), zignorowac zdarzenie -- przegladarka ma wystarczajaco danych
- Dodac minimum 500ms guard po `canplay` zanim kolejny `waiting` moze ustawic buforowanie

### Pliki do modyfikacji
- `src/components/SecureMedia.tsx` -- wszystkie 6 zmian
- `src/lib/videoBufferConfig.ts` -- dodanie nowych parametrow konfiguracyjnych (`stalledDebounceMs`, `canplayGuardMs`)

### Szacowany wplyw
- Eliminacja nieskonczonej petli buforowania
- Szybszy start odtwarzania (brak falszywego stalled)
- Retry nie traci zbuforowanego materialu
- Wideo zawsze widoczne (nie ukryte przez brak canplay)
- Token refresh nie przerywa odtwarzania

