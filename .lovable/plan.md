

# Fix: Brak video, brak przełączania na mówcę + video wraca po kliknięciu przycisku

## Diagnoza

### 1. Widok mówcy nie uwzględnia lokalnego użytkownika
W `VideoGrid.tsx` linia 428: `if (!p.isLocal && avg > maxLevel)` — filtr `!p.isLocal` uniemożliwia przełączenie widoku na Ciebie gdy mówisz.

### 2. `reconnectToPeer` nie sprawdza nowego peer_id w DB
Po 3 nieudanych próbach reconnect (linia 1628-1635) peer jest trwale usuwany z UI. Ale po odświeżeniu strony remote peer ma **nowy peer_id** — stare 3 próby nigdy nie zadziałają bo łączą się ze starym ID. Brak fallbacku do sprawdzenia DB po `userId`.

### 3. Video wraca dopiero po kliknięciu mikrofonu/kamery
Kliknięcie przycisku wywołuje `reacquireLocalStream()` (linia 1810-1812), który:
- Pobiera nowy stream z `getUserMedia` 
- Wywołuje `replaceTrack()` na wszystkich połączeniach (linia 1751-1761)

To naprawia **lokalne** video. Ale dlaczego wraca **remote** video? Bo kliknięcie to **user gesture** — odblokowanie autoplay policy. Logi potwierdzają: `"Autoplay blocked — playing muted"` × 3 o 13:10:02. Video elementy grały wyciszone, ale po interakcji użytkownika heartbeat (linia 154-160) wznawia je z dźwiękiem. Dodatkowo `userHasInteracted` (linia 35) zmienia się na `true`, co pozwala kolejnym `playVideoSafe` grać z pełnym audio.

Problem: na pasywnym webinarze użytkownik nie klika — `userHasInteracted` pozostaje `false` po odświeżeniu strony, a autoplay policy blokuje video z dźwiękiem.

## Plan zmian (2 pliki)

### `src/components/meeting/VideoGrid.tsx`

**Zmiana 1** — Linia 428: Usunąć `!p.isLocal`:
```typescript
if (avg > maxLevel) {
```

**Zmiana 2** — Dodać auto-unlock: po pierwszym "autoplay blocked", wyświetlić transparent overlay z przyciskiem "Kliknij aby odblokować dźwięk" który ustawia `userHasInteracted = true` i wznawia wszystkie video z audio. To jest standardowe rozwiązanie dla pasywnych webinarów.

### `src/components/meeting/VideoRoom.tsx`

**Zmiana 3** — W `reconnectToPeer` (linia 1628-1635), po 3 nieudanych próbach, zamiast `removePeer()` sprawdzić DB po `userId`:

```typescript
if (attempts >= 3) {
  const participant = participantsRef.current.find(p => p.peerId === peerId);
  if (participant?.userId) {
    const { data } = await supabase
      .from('meeting_room_participants')
      .select('peer_id, display_name')
      .eq('room_id', roomId)
      .eq('user_id', participant.userId)
      .eq('is_active', true)
      .neq('peer_id', peerId)
      .maybeSingle();
    if (data?.peer_id && !connectionsRef.current.has(data.peer_id)) {
      // Peer wrócił z nowym ID — połącz się
      reconnectingPeersRef.current.delete(peerId);
      reconnectAttemptsRef.current.delete(peerId);
      setParticipants(prev => prev.filter(p => p.peerId !== peerId));
      callPeer(data.peer_id, data.display_name || 'Uczestnik', localStreamRef.current!, undefined, participant.userId);
      return;
    }
  }
  removePeer(peerId);
  return;
}
```

| Plik | Zmiana |
|---|---|
| `VideoGrid.tsx` | Mówca: usunąć `!p.isLocal`, dodać audio unlock overlay |
| `VideoRoom.tsx` | reconnectToPeer: DB fallback po userId na nowy peer_id |

