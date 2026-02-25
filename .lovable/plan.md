
## Pelny audyt WebRTC i P2P -- wyniki

### Co dziala poprawnie

1. **Architektura sygnalizacji**: Poprawne uzycie Supabase Realtime broadcast do sygnalizacji peer-joined/peer-left/settings-changed. Kanaly sa poprawnie czyszczone przy unmount.

2. **TURN/STUN**: Prawidlowa generacja ephemeral HMAC-SHA1 credentials dla ExpressTURN. Fallback do STUN-only gdy brak sekretu. Obsluga gosci przez X-Guest-Token header.

3. **Heartbeat i ghost cleanup**: Poprawna synchronizacja co 30s z baza danych, 90s stale threshold, usuwanie widm z lokalnej listy i zamykanie ich connections.

4. **Screen share onended**: Poprawnie uzywa `isScreenSharingRef` i dedykowanej `restoreCamera()` -- naprawione w poprzedniej iteracji.

5. **Auto-PiP**: Dziala przy screen share (desktop) i przy zmianie karty (visibilitychange).

6. **Roles/permissions**: Host, co-host, guest -- poprawna logika uprawnien, broadcast zmian ustawien.

7. **Czat**: Optymistyczne wstawianie, deduplikacja, wiadomosci prywatne, reconnect przy CHANNEL_ERROR.

8. **Media fallback**: Prawidlowy fallback audio+video -> audio -> video przy inicjalizacji.

9. **beforeunload**: Uzywanie sendBeacon + keepalive fetch jako fallback -- poprawne.

10. **Track ended detection**: Listeners na remote tracks z automatycznym reconnect -- poprawne.

### Znalezione problemy

#### Problem 1: `callPeer` nie jest `useCallback` -- stale closure w `visibilitychange` (SREDNI)
**Linia 722**: `callPeer` jest zwykla funkcja, nie `useCallback`. Jest uzywana wewnatrz `handleVisibilityChange` (linia 472) ktory jest w `useEffect` z dependency `[roomId, user, guestTokenId]`. Jesli `localAvatarUrl` zmieni sie po montowaniu, `callPeer` w visibility handler dalej uzywa starego `localAvatarUrl`. To nie jest krytyczne, ale powoduje ze przy reconnect po zmianie karty, metadata moze nie zawierac aktualnego avatara.

**Naprawa**: Zamienic `callPeer` na `useCallback` z odpowiednimi zaleznosciami, lub uzyc ref.

#### Problem 2: `handleCall` nie jest stabilna referencja -- potencjalny problem (NISKI)
`handleCall` jest tez zwykla funkcja. Jest uzywana w `peer.on('call')` wewnatrz init `useEffect`. Poniewaz init useEffect ustawia handler tylko raz (przy montowaniu), to closure jest stale ale zawiera `stream` z momentu inicjalizacji -- co jest poprawne bo odpowiada na call z aktualnym stream. Ten problem jest niski bo `call.answer(stream)` uzywa lokalny `stream` z closure ktory jest aktualny w momencie init.

#### Problem 3: Brak `isCameraOff` state w broadcast `media-state-changed` dla remote (SREDNI)
**Linia 625-633**: Broadcast `media-state-changed` aktualizuje tylko `isMuted` w participants state. Nie aktualizuje `isCameraOff`. W `ParticipantsPanel` (linia 194-196) `isCameraOff` jest renderowane, ale nigdy aktualizowane po stronie remote -- zawsze pokazuje domyslna wartosc.

**Naprawa**: Dodac `isCameraOff` do `media-state-changed` payload i do state update w `setParticipants`.

#### Problem 4: `restoreCamera` nie odtwarza audio-only jesli kamera niedostepna (NISKI)
**Linia 836**: `restoreCamera` wywoluje `getUserMedia({ video: true, audio: true })` bez fallbacku. Jesli kamera jest zajeta/niedostepna, cala funkcja sie nie powiedzie i screen share nie zostanie poprawnie zamkniete.

**Naprawa**: Dodac fallback audio-only w catch, podobnie jak w init.

#### Problem 5: `coHostUserIds` w closure settings-changed handler (SREDNI)
**Linia 593**: `const isManager = !guestMode && (isHost || (user && coHostUserIds.includes(user.id)));` -- `coHostUserIds` jest z closure init useEffect ktory ustawia handlery. Jesli co-host zostanie dodany PÓZNIEJ, handler settings-changed dalej uzywa starego `coHostUserIds = []`, wiec nowy co-host zostanie potraktowany jako zwykly uczestnik i jego mikrofon/kamera moga zostac wymuszone.

**Naprawa**: Uzyc ref `coHostUserIdsRef` synchronizowanego ze state.

#### Problem 6: Brak cleanup dla `iceDisconnectTimersRef` przy unmount (NISKI)
**Linia 82**: `iceDisconnectTimersRef` przechowuje timeouty ale nie sa czyszczone w cleanup. Moze powodowac memory leak i opoznione wywolania po unmount.

**Naprawa**: Dodac czyszczenie timerow w cleanup.

#### Problem 7: `handleNewChatMessage` closure problem z `isChatOpen` (NISKI)
**Linia 1021-1023**: `useCallback` z dependency `[isChatOpen]`. Jesli `isChatOpen` zmieni sie, nowa instancja `handleNewChatMessage` jest tworzona, ale `MeetingChat` moze jeszcze uzywac starej referencji z powodu Realtime subscription closure. To jest mitygowane przez fakt ze MeetingChat tworzy nowa subscription gdy `onNewMessage` sie zmieni (jest w dependency array na linii 146 MeetingChat).

#### Problem 8: `sendBeacon` w beforeunload uzywa PATCH ale beacon tylko wspiera POST (SREDNI)
**Linia 321**: `navigator.sendBeacon(url, ...)` wysyla POST, ale endpoint REST Supabase wymaga PATCH do update. sendBeacon zawsze wysyla POST -- wiec to wywolanie nigdy nie zadziala. Na szczescie jest fallback z `fetch` + `keepalive: true` ponizej (linia 323-328), ale ten tez moze nie zadzialaC bo brakowalo `Authorization` headera.

**Naprawa**: Usunac sendBeacon (nie dziala z PATCH), uzyc tylko `fetch` z keepalive i dodac Authorization header.

---

### Plan naprawy (6 zmian)

#### Zmiana 1: Naprawic broadcast `media-state-changed` -- dodac `isCameraOff`
- W `handleToggleCamera` (linia 886-888): juz wysyla `isCameraOff: newCameraOff` -- OK
- W `setParticipants` handler dla `media-state-changed` (linia 627-631): dodac update `isCameraOff` z payload
- Dodac `isCameraOff` do interfejsu `RemoteParticipant`

#### Zmiana 2: Dodac `coHostUserIdsRef` i uzyc w settings-changed handler
- Dodac `const coHostUserIdsRef = useRef(coHostUserIds)` + sync effect
- W handler `settings-changed` (linia 593): uzyc `coHostUserIdsRef.current`

#### Zmiana 3: Naprawic `restoreCamera` -- dodac fallback
- W `restoreCamera` (linia 836): dodac try/catch z fallbackiem audio-only
- Zawsze ustawic `setIsScreenSharing(false)` nawet jesli getUserMedia sie nie uda

#### Zmiana 4: Naprawic `beforeunload` -- usunac sendBeacon, naprawic fetch
- Usunac `navigator.sendBeacon()` (nie dziala z PATCH)
- W `fetch` z `keepalive`: dodac `Authorization` header z sesji (lub uzyc service role jesli dostepny)
- Alternatywnie: uzyc RPC/function call zamiast REST

#### Zmiana 5: Dodac cleanup dla `iceDisconnectTimersRef`
- W `cleanup` function (linia 300): dodac czyszczenie wszystkich timerow z `iceDisconnectTimersRef`

#### Zmiana 6: Zamienic `callPeer` na `useCallback`
- Uzyc `useCallback` z zaleznosciami `[displayName, user?.id, localAvatarUrl]`
- Lub przelaczys na ref pattern dla `localAvatarUrl`

### Pliki do modyfikacji
- `src/components/meeting/VideoRoom.tsx` -- wszystkie 6 zmian

### Podsumowanie
System WebRTC jest w dobrym stanie po poprzednich naprawach. Glowne problemy to:
- **Srednie**: brak `isCameraOff` sync, stale `coHostUserIds` closure, niedzialajacy sendBeacon
- **Niskie**: brak fallbacku w restoreCamera, brak cleanup timerow, callPeer closure

Zadne z tych problemow nie powoduje krytycznych awarii, ale naprawienie ich poprawi niezawodnosc i poprawnosc UI.
