
Cel: po odświeżeniu przywrócić media dokładnie wg zapamiętanego stanu (np. mic OFF + kamera ON), bez przypadków „brak video” po auto-rejoin.

1) Diagnoza i potwierdzenie źródła błędu
- Sprawdzę flow inicjalizacji w `VideoRoom.tsx` dla auto-rejoin:
  - obecnie fallback `getUserMedia` jest: A/V -> audio-only -> video-only.
- To powoduje, że przy chwilowym błędzie kamery po refresh (typowe na mobile/iOS i czasem desktop) sesja wpada w `audio-only`, mimo że zapisane ustawienie wymaga `videoEnabled=true`.

2) Refaktor pobierania mediów pod preferencje użytkownika
- Wydzielę wspólną funkcję do pobierania strumienia wg preferencji:
  - gdy `videoEnabled=true` i `audioEnabled=false`: priorytet `video` (nie audio-only jako pierwszy fallback),
  - gdy `videoEnabled=true` i `audioEnabled=true`: A/V, ale fallback najpierw do `video-only`, dopiero potem `audio-only`,
  - gdy `videoEnabled=false` i `audioEnabled=true`: audio-only,
  - gdy oba OFF: nadal pobieramy tracki technicznie (dla szybkiego toggle), ale po pobraniu wymuszamy `track.enabled` zgodnie ze stanem.
- Zastosuję tę samą logikę w:
  - `init()` (wejście po refresh),
  - `reacquireLocalStream()` (odzyskiwanie po utracie tracków),
  żeby zachowanie było spójne.

3) Twarde egzekwowanie zapamiętanego stanu po uzyskaniu streamu
- Po każdym udanym `getUserMedia` wymuszę:
  - audio tracks: `enabled = !isMutedRef.current` (lub `initialAudio` przy init),
  - video tracks: `enabled = !isCameraOffRef.current` (lub `initialVideo` przy init).
- Dodam guard: jeśli użytkownik ma `video ON`, ale stream nie ma live video tracka, uruchomię jeszcze jedną próbę „video-first” zanim zostanie zaakceptowany stream audio-only.

4) Poprawa UI fallback dla lokalnego kafla (żeby nie było „czarnego video”)
- W `VideoGrid.tsx` zmienię lokalne `showVideo` (VideoTile/Thumbnail/MiniVideo/PiP):
  - zamiast `participant.stream && !isCameraOff`
  - na sprawdzenie live video tracka + `!isCameraOff`.
- Dzięki temu gdy lokalnie jest audio-only, użytkownik zobaczy avatar/inicjały, a nie pusty/czarny obraz.

5) Stabilizacja zapisu/odczytu sesji
- Potwierdzę, że `sessionStorage(meeting_session_*)` jest aktualizowane po toggle mic/cam (już jest) i że odczyt przy auto-rejoin nie jest nadpisywany błędnym fallbackiem.
- Dodam lekkie logi diagnostyczne (dev) pokazujące:
  - zapisane preferencje,
  - wybraną ścieżkę pobrania mediów,
  - finalny skład tracków (audio/video live count).

Pliki do zmiany
- `src/components/meeting/VideoRoom.tsx`
  - `init()` + `reacquireLocalStream()` + wspólna funkcja acquire wg preferencji.
- `src/components/meeting/VideoGrid.tsx`
  - lokalne warunki `showVideo` oparte o live video track.

Kryteria akceptacji
- Scenariusz: mic OFF + kamera ON -> refresh -> kamera pozostaje widoczna, mic nadal OFF.
- Scenariusz: mic ON + kamera OFF -> refresh -> avatar/inicjały, bez czarnego video.
- Scenariusz: chwilowy błąd kamery po refresh -> aplikacja próbuje ścieżkę video-first przed degradacją do audio-only.
