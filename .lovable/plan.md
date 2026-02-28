

## Naprawa: brak audio i video po zakonczeniu udostepniania ekranu

### Przyczyna

W funkcji `restoreCamera` (linia 1313-1376 w VideoRoom.tsx) po zakonczeniu screen share:

1. Nowy stream z `getUserMedia` jest pobierany (audio + video) -- OK
2. **Video track** jest zamieniany u wszystkich peerow przez `replaceTrack` -- OK
3. **Audio track** NIE jest zamieniany -- BUG

Stary audio track (z zatrzymanego screen share stream) jest martwy. Nowy audio track istnieje w lokalnym safe ale nigdy nie trafia do peerow.

Dodatkowo, jesli background jest aktywny i `processedStream` zastepuje raw stream, audio track z processed stream tez musi byc wyslany do peerow.

### Rozwiazanie

Dodac `replaceTrack` rowniez dla audio sendera w dwoch miejscach w `restoreCamera`:

**Miejsce 1 (linia ~1334-1338)**: Po zamianie video track, rowniez zamienic audio track:

```text
const videoTrack = stream.getVideoTracks()[0];
const audioTrack = stream.getAudioTracks()[0];
connectionsRef.current.forEach((conn) => {
  const senders = (conn as any).peerConnection?.getSenders();
  if (senders) {
    const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video');
    if (videoSender && videoTrack) videoSender.replaceTrack(videoTrack);
    const audioSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'audio');
    if (audioSender && audioTrack) audioSender.replaceTrack(audioTrack);
  }
});
```

**Miejsce 2 (linia ~1349-1354)**: Po zastosowaniu tla, jesli processed stream ma nowy audio track, rowniez go zamienic (zabezpieczenie):

```text
const processedVideoTrack = processedStream.getVideoTracks()[0];
const processedAudioTrack = processedStream.getAudioTracks()[0];
if (processedVideoTrack || processedAudioTrack) {
  connectionsRef.current.forEach((conn) => {
    const senders = (conn as any).peerConnection?.getSenders();
    if (senders) {
      if (processedVideoTrack) {
        const vs = senders.find((s: RTCRtpSender) => s.track?.kind === 'video');
        if (vs) vs.replaceTrack(processedVideoTrack);
      }
      if (processedAudioTrack) {
        const as_ = senders.find((s: RTCRtpSender) => s.track?.kind === 'audio');
        if (as_) as_.replaceTrack(processedAudioTrack);
      }
    }
  });
}
```

### Plik do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoRoom.tsx` | restoreCamera: dodac replaceTrack dla audio sendera w obu miejscach |

### Ryzyko

Niskie. `replaceTrack` jest bezpieczna operacja WebRTC -- jesli sender lub track nie istnieje, nic sie nie dzieje. Nie wymaga renegocjacji ICE.

