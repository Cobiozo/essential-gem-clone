

## Analiza problemów z płynnością WebRTC — Plan napraw

### Zidentyfikowane przyczyny zamrożonego/niestabilnego obrazu

Po przeanalizowaniu `VideoRoom.tsx`, `VideoGrid.tsx`, `VideoBackgroundProcessor.ts` i konfiguracji TURN zidentyfikowałem następujące problemy:

---

### Problem 1: Brak limitu bitrate na połączeniach peer-to-peer
W `callPeer` (linia 1302) i `handleCall` (linia 1308) nie ma żadnego ustawienia `maxBitrate` na `RTCRtpSender`. PeerJS domyślnie nie ogranicza bitrate, co prowadzi do:
- Przesyłania zbyt dużej ilości danych → przeciążenie TURN relay → zamrożony obraz
- Braku adaptacji do przepustowości sieci

**Naprawa:** Po nawiązaniu połączenia (w `handleCall`, po `call.on('stream')`) ustawić `setParameters()` na video senderze z `maxBitrate` ~800kbps (mobile) / ~1500kbps (desktop). Dodać też degradację jakości przy wielu uczestnikach (simulcast-like).

### Problem 2: Brak retransmisji wideo po zatrzymaniu odtwarzania
W `VideoTile` (VideoGrid.tsx, linia 136) wideo jest ustawiane raz przy zmianie streamu. Jeśli przeglądarka zapauzuje wideo (np. tło, pamięć), nie ma mechanizmu cyklicznego sprawdzania i ponownego uruchamiania `play()`.

**Naprawa:** Dodać `setInterval` co 3s w `VideoTile` który sprawdza `video.paused && video.srcObject` i wywołuje `play()`.

### Problem 3: Wrapping streamu w `handleToggleCamera` tworzy nowy MediaStream
Linia 1635-1640: `new MediaStream(stream.getTracks())` tworzy nowy obiekt streamu za każdym toggle kamery. To powoduje re-render `VideoTile` z nowym referencją `participant.stream`, co resetuje `srcObject` i może chwilowo zamrozić obraz.

**Naprawa:** Zamiast tworzyć nowy `MediaStream`, togglować `track.enabled` bez zmiany referencji streamu. Usunąć wrapping.

### Problem 4: TURN health check blokuje start połączenia o ~3s
`filterReachableTurnServers()` testuje każdy serwer z 3s timeout przed zainicjowaniem PeerJS. Na wolnej sieci to dodatkowe 3s opóźnienia.

**Naprawa:** Uruchomić health check asynchronicznie (non-blocking). Rozpocząć PeerJS natychmiast z pełną listą serwerów, a w tle testować dostępność. Po zakończeniu testu — zaktualizować konfigurację ICE przez `peer.options.config` dla przyszłych połączeń.

### Problem 5: Brak degradacji jakości wideo przy wielu uczestnikach
Kamera zawsze wysyła 1280x720@24fps (desktop) niezależnie od liczby uczestników. Przy 4+ uczestnikach to zbyt dużo dla mesh P2P.

**Naprawa:** Dynamicznie obniżać rozdzielczość i framerate przez `applyConstraints()` na video track:
- 1 uczestnik: 1280x720 @ 24fps
- 2-3 uczestników: 640x480 @ 20fps  
- 4+ uczestników: 480x360 @ 15fps

### Problem 6: Stale `stream` closure w init useEffect
Linia 999: `callPeer(..., stream, ...)` używa `stream` z closure `init()`. Jeśli stream zostanie zastąpiony (reacquire, background effect), nowe połączenia dostaną stary stream.

**Naprawa:** Zmienić na `localStreamRef.current || stream` (co częściowo jest już robione w `callPeer` linia 1301, ale w broadcast handler linia 999 nadal używa closure).

---

### Zmiany w plikach

**1. `src/components/meeting/VideoRoom.tsx`**
- Dodać funkcję `applyBitrateLimits(call, participantCount)` — ustawia `maxBitrate` na video senderze
- Wywołać ją w `handleCall` po `call.on('stream')`
- Dodać `useEffect` reagujący na `participants.length` — dynamicznie obniżać rozdzielczość kamery
- Usunąć wrapping `new MediaStream()` w `handleToggleCamera`
- Naprawić closure `stream` w broadcast handler (użyć `localStreamRef.current`)
- Uczynić TURN health check non-blocking (start peer natychmiast, testuj w tle)

**2. `src/components/meeting/VideoGrid.tsx`**
- W `VideoTile`: dodać `setInterval` co 3s sprawdzający `video.paused` i wywołujący `play()`
- Dodać `video.onpause` handler który natychmiast próbuje wznowić odtwarzanie (z wyjątkiem świadomych pauz)

### Zakres
2 pliki, ~80 linii nowego kodu, bez zmian w edge function ani strukturze bazy danych.

