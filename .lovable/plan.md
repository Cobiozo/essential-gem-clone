

# Naprawa trzech problemow: czat od dolu, NAT, wylogowanie

## 1. Czat - wiadomosci od dolu

**Plik**: `src/components/meeting/MeetingChat.tsx` (linia 188)

Zmiana kontenera wiadomosci z:
```
<div className="space-y-3">
```
na:
```
<div className="space-y-3 min-h-full flex flex-col justify-end">
```

To spowoduje, ze wiadomosci beda "przyklejone" do dolu - nowe pojawiaja sie na dole, stare przesuwaja sie ku gorze.

---

## 2. Polaczenia poza NAT (TURN relay)

**Problem**: Polaczenia dzialaja w sieci lokalnej (LAN) dzieki STUN, ale nie dzialaja miedzy roznymi sieciami (rozne NAT-y). Przyczyna: w fallbacku (linia 202-205) uzywane sa TYLKO serwery STUN, a glowna konfiguracja PeerJS nie wymusza uzycia relay.

**Plik**: `src/components/meeting/VideoRoom.tsx`

Zmiany:
- **Linia 273**: Dodanie konfiguracji PeerJS wymuszajacej uzycie relay gdy bezposrednie polaczenie nie jest mozliwe. Zmiana `debug: 0` na `debug: 1` tymczasowo dla diagnostyki, oraz dodanie w konfiguracji `iceTransportPolicy: 'all'` aby peer probowal wszystkich metod polaczenia (w tym TURN relay)
- Dodanie logowania stanu ICE na polaczeniach, aby wykrywac i raportowac problemy z NAT

```text
Przed:
const peer = new Peer({ config: { iceServers }, debug: 0 });

Po:
const peer = new Peer({
  config: {
    iceServers,
    iceTransportPolicy: 'all',
  },
  debug: 1,
});
```

- W funkcji `handleCall` (linia 462): dodanie monitorowania stanu ICE na polaczeniu (`call.peerConnection`) - logowanie zmian `iceConnectionState` dla diagnostyki. Gdy stan ICE zmieni sie na `'failed'`, automatyczna proba restartu ICE.

---

## 3. Wylogowanie podczas spotkania

**Problem**: `useInactivityTimeout` wylogowuje uzytkownika gdy przelacza karte na dluzej niz 31 minut. `setInterval` (linia 84-86 w VideoRoom) jest throttlowany przez przegladarke w ukrytych kartach, wiec `video-activity` nie jest emitowane wystarczajaco czesto.

**Rozwiazanie**: Nowe zdarzenia `meeting-active` i `meeting-ended`.

**Plik**: `src/components/meeting/VideoRoom.tsx` (linia 82-90)

Dodanie emisji `meeting-active` na mount i `meeting-ended` na unmount:

```text
useEffect(() => {
  window.dispatchEvent(new Event('meeting-active'));
  const interval = setInterval(() => {
    window.dispatchEvent(new Event('video-activity'));
  }, 60000);
  window.dispatchEvent(new Event('video-activity'));
  return () => {
    clearInterval(interval);
    window.dispatchEvent(new Event('meeting-ended'));
  };
}, []);
```

**Plik**: `src/hooks/useInactivityTimeout.ts`

Dodanie:
- Ref `isMeetingActiveRef` (boolean)
- Nasluchiwanie na `meeting-active` -> `isMeetingActiveRef.current = true`
- Nasluchiwanie na `meeting-ended` -> `isMeetingActiveRef.current = false`
- W `handleVisibilityChange` (linia 120-133): jesli `isMeetingActiveRef.current === true`, wykonaj `resetTimer()` zamiast sprawdzania czasu nieaktywnosci
- W `handleLogout` (linia 37): dodanie guardu `if (isMeetingActiveRef.current) return;`

---

## Podsumowanie zmian

| Plik | Zmiana |
|---|---|
| `MeetingChat.tsx` | `min-h-full flex flex-col justify-end` na kontenerze wiadomosci |
| `VideoRoom.tsx` | `iceTransportPolicy: 'all'`, `debug: 1`, monitoring ICE, emisja `meeting-active`/`meeting-ended` |
| `useInactivityTimeout.ts` | Flaga `isMeetingActiveRef` blokujaca wylogowanie + guard w `handleLogout` i `handleVisibilityChange` |

