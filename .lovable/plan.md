

## Naprawa nieskonczonego buforowania wideo na mobilnych urzadzeniach i PWA

### Zidentyfikowane przyczyny (5 problemow)

#### 1. `window.blur` agresywnie pauzuje wideo na mobile (KRYTYCZNY)
**Linia 1293-1297**: Handler `handleWindowBlur` pauzuje wideo i ustawia `isTabHidden = true` za kazdym razem gdy okno traci focus. Na mobile blur moze sie wywolyc gdy:
- Uzytkownik dotknie customowych kontrolek odtwarzacza
- Pojawi sie powiadomienie systemowe
- Uzytkownik przewinie strone
- Klawiatura ekranowa sie pojawi

Problem: **nie ma handlera `window.focus`** ktory by zdejmowel `isTabHidden`. Jedynym sposobem na reset jest `visibilitychange` z `!document.hidden`, ale `blur` czesto wystepuje BEZ zmiany visibility. Efekt: wideo zapauzowane na stale z overlayem "Wroc do karty".

#### 2. Smart buffering pauzuje wideo na mobile -> przeglądarka przestaje ladowac (KRYTYCZNY)
**Linia 716-719**: Gdy `isSlowNetworkNow` jest true, wideo jest pauzowane aby "poczekac na bufor". Problem: **mobilne przegladarki (szczegolnie Safari) depriorytetyzuja ladowanie zapauzowanych wideo**. Zdarzenie `progress` przestaje sie emitowac, wiec warunek `bufferedAhead >= minBuffer` nigdy nie jest spelniony. Brak timeoutu oznacza nieskonczone buforowanie.

#### 3. Brak timeoutu/recovery dla smart buffering
Gdy smart buffering sie aktywuje (linia 719), nie ma zadnego maksymalnego czasu oczekiwania. Jedyne sposoby na wyjscie:
- `canplay` event (moze nie przyjsc dla zapauzowanego wideo)
- `progress` event z wystarczajacym buforem (moze nie przyjsc)
- Reczny retry uzytkownika

Na mobile oba eventy moga przestac przychodzic = nieskonczone buforowanie.

#### 4. iOS Safari nie wspiera `navigator.connection` API
**Linia 87-101**: `isSlowNetwork()` zawsze zwraca `false` na iOS bo Safari nie implementuje Connection API. `getNetworkQuality()` zwraca `'unknown'`. Oznacza to ze na iOS:
- Konfiguracja adaptacyjna nigdy nie jest dostosowana do wolnej sieci
- `minBufferSeconds` zostaje na 3s nawet na bardzo wolnym WiFi/LTE
- Ale tez smart buffering nigdy nie pauzuje wideo (co ironicznie jest lepsze)

Problem polega na tym ze na Androidzie (ktory wspiera Connection API) smart buffering MOZE sie aktywowac i zablokować na stale.

#### 5. Token refresh + blur = restart wideo na mobile
**Linia 318-327**: Deferred token refresh czeka na pause. Na mobile `blur` czesto wywoluje pause, wiec token refresh jest stosowany natychmiast po kazdym blur. Zmiana URL restartuje ladowanie wideo.

### Plan naprawy

#### Zmiana 1: Usunac `window.blur` na mobile, dodac `window.focus`
**Plik: `src/components/SecureMedia.tsx`** (linie 1278-1324)
- Wykryc mobile (`window.innerWidth < 768` lub `'ontouchstart' in window`)
- Na mobile: NIE rejestrowac `handleWindowBlur` - zbyt agresywny
- Na wszystkich urzadzeniach: dodac `handleWindowFocus` ktory ustawia `isTabHidden = false`
- Zostawic `visibilitychange` i `pagehide` bez zmian (te dzialaja poprawnie)

#### Zmiana 2: Nigdy nie pauzowac wideo podczas smart buffering na mobile
**Plik: `src/components/SecureMedia.tsx`** (linia 716)
- Na mobile: zamiast `video.pause()`, pozwolic przegladarce na natywne buforowanie
- Ustawic `isBuffering = true` i pokazac spinner, ale NIE pauzowac wideo
- Mobilne przegladarki lepiej radza sobie z buforowaniem w tle gdy wideo jest "playing"

#### Zmiana 3: Dodac timeout recovery dla smart buffering (max 15s)
**Plik: `src/components/SecureMedia.tsx`** (w `handleWaiting`, po aktywacji smart buffering)
- Dodac `setTimeout` po 15s ktory:
  - Wznawia wideo (`video.play()`)
  - Czyści flagi buforowania
  - Loguje ostrzezenie
- Ref `smartBufferingTimeoutRef` do przechowywania timera
- Czyszczenie w `handleCanPlay` i w cleanup

#### Zmiana 4: Dodac fallback dla braku Connection API (iOS)
**Plik: `src/lib/videoBufferConfig.ts`**
- Gdy `navigator.connection` jest niedostepny: estymowac jakosc sieci na podstawie czasu ladowania pierwszego chunka wideo
- Dodac flage `connectionApiAvailable` do konfiguracji
- Na iOS: uzyc bardziej konserwatywnych wartosci domyslnych (`minBufferSeconds: 2` zamiast 3)

#### Zmiana 5: Zablokowac deferred token refresh po blur na mobile
**Plik: `src/components/SecureMedia.tsx`** (linia 1002-1010, handlePause)
- Sprawdzic czy pauza nastapila z powodu blur (`isTabHidden`)
- Jesli tak: NIE aplikowac deferred token refresh
- Aplikowac refresh tylko gdy uzytkownik swiadomie zapauzowel (kliknal pause)

### Pliki do modyfikacji
- `src/components/SecureMedia.tsx` -- zmiany 1, 2, 3, 5
- `src/lib/videoBufferConfig.ts` -- zmiana 4

### Szacowany wplyw
- Eliminacja falszywych "tab hidden" na mobile (blur nie pauzuje wideo)
- Smart buffering nie blokuje wideo w nieskonczonosc (max 15s timeout)
- Mobilne przegladarki moga buforowac w tle (brak pauzy na mobile)
- Token refresh nie restartuje wideo po kazdym blur
- iOS dostaje odpowiednie wartosci buforowania mimo braku Connection API

