
## Naprawa gubienia sygnalow w spotkaniach WebRTC

### Glowna przyczyna: Brak reconnect logic na kanale sygnalizacyjnym

**Plik: `src/components/meeting/VideoRoom.tsx`, linia 662-666**

Kanal `supabase.channel(`meeting:${roomId}`)` obsluguje WSZYSTKIE sygnaly P2P:
- `peer-joined` / `peer-left`
- `media-state-changed`
- `settings-changed`
- `mute-all` / `mute-peer` / `unmute-request`
- `meeting-ended`
- `co-host-assigned` / `co-host-removed`

Subskrypcja wygląda tak:
```text
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED' && !cancelled) {
    await channel.send(...peer-joined...);
  }
});
```

**Problem**: Nie ma handlera dla `CHANNEL_ERROR` ani `TIMED_OUT`. Gdy kanal Realtime sie rozlaczy (zmiana sieci, timeout, problem serwerowy), wszystkie sygnaly sa CICHE gubione. Nowi uczestnicy nie sa widoczni, media state nie jest synchronizowany, mute/unmute nie dziala.

Dla porownania: `MeetingChat` (linia 128-131) MA reconnect logic:
```text
if (status === 'CHANNEL_ERROR') {
  setTimeout(setupChannel, 3000);
}
```

### Dodatkowe problemy

#### Problem 2: Brak re-announcement po reconnect
Nawet gdyby kanal sie reconnectowel, nie ma ponownego wyslania `peer-joined`. Inni uczestnicy ktory dolaczyli podczas disconnectu nie beda wiedziec o istniejaych peerach.

#### Problem 3: Brak okresowej synchronizacji kanalu
Heartbeat (co 30s) synchronizuje DB, ale nie weryfikuje czy kanal broadcast jest aktywny. Moze byc sytuacja ze DB jest aktualne ale kanal jest martwy.

### Plan naprawy (1 plik)

**Plik: `src/components/meeting/VideoRoom.tsx`**

#### Zmiana 1: Dodac CHANNEL_ERROR handler z reconnect

W `channel.subscribe()` (linia 662):
- Dodac obsluge statusow `CHANNEL_ERROR` i `TIMED_OUT`
- Przy bledzie: usunac stary kanal, stworzyc nowy z wszystkimi handlerami
- Wyekstrahowac setup kanalu do osobnej funkcji `setupSignalingChannel` (podobnie jak w MeetingChat)
- Ref `channelReconnectAttemptsRef` z limitem 5 prob, reset przy sukcesie

#### Zmiana 2: Re-announce po reconnect

Po udanym reconnect (`SUBSCRIBED`):
- Wyslac ponownie `peer-joined` z aktualnymi danymi
- Pobrac aktualnych uczestnikow z DB i nawiazac brakujace polaczenia (jak w `handleVisibilityChange`)

#### Zmiana 3: Dodac channel health check w heartbeat

W heartbeat (linia 372-437):
- Sprawdzic stan kanalu: `channelRef.current?.state`
- Jesli kanal nie jest w stanie `joined`, wywolac reconnect
- Logowac stan kanalu dla diagnostyki

#### Zmiana 4: Dodac exponential backoff do reconnect

- Pierwsza proba: 2s
- Druga: 4s
- Trzecia: 8s
- Czwarta: 16s
- Piata: 32s
- Po 5 probach: toast z bledem i propozycja recznego odswiezenia

### Szacowany wplyw
- Kanal sygnalizacyjny bedzie sie automatycznie reconnectowac po utracie polaczenia
- Uczestnicy beda re-announced po reconnect -- nie beda "niewidzialni"
- Heartbeat bedzie dodatkowym watchdogiem dla kanalu
- Exponential backoff zapobiega floodowaniu serwera przy dluzszych przerwach
