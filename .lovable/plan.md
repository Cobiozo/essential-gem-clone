

# Fix: Video/audio nie wznawia się po ponownym dołączeniu + ustawienia nie są zapamiętywane

## Diagnoza

### 1. cleanup() nie filtruje po peer_id — wyścig z nową sesją

W network logs widać PATCH o 13:00:12 **bez `peer_id`**:
```
PATCH ...meeting_room_participants?room_id=eq.05623d5e...&user_id=eq.818aef5e...
body: {"is_active":false,"left_at":"..."}
```

To pochodzi z `cleanup()` (linia 637-642), wywoływanego przez React unmount (useEffect return). Mimo że `beforeunload` został naprawiony z `peer_id`, **cleanup()** nadal patchuje po samym `room_id + user_id` — deaktywuje **nowy** rekord stworzony przez świeżą sesję.

Efekt: nowa sesja rejestruje się (INSERT), ale zaraz potem stary cleanup ją dezaktywuje → inni uczestnicy nie widzą użytkownika jako aktywnego → nie nawiązują połączenia.

### 2. Stan mikrofonu/kamery nie jest zapisywany podczas spotkania

`handleToggleMute` i `handleToggleCamera` zmieniają state `isMuted`/`isCameraOff`, ale **nie aktualizują sessionStorage**. Zapis do `meeting_session_${roomId}` następuje tylko raz — w `MeetingRoom.handleJoin()`.

Efekt: po odświeżeniu auto-rejoin wczytuje stare ustawienia z momentu dołączenia. Użytkownik miał wyłączony mikrofon → po odświeżeniu mikrofon się włącza.

## Plan naprawy (1 plik)

### `src/components/meeting/VideoRoom.tsx`

**Fix 1**: W `cleanup()` (linia ~637-642) dodać filtr `peer_id`, analogicznie do `beforeunload`:

```typescript
// Cache peer_id before cleanup destroys the peer
const cleanupPeerId = peerRef.current?.id;

// ... later in cleanup:
const q = supabase.from('meeting_room_participants')
  .update({ is_active: false, left_at: new Date().toISOString() })
  .eq('room_id', roomId).eq('user_id', user.id);
if (cleanupPeerId) q.eq('peer_id', cleanupPeerId);
await q;
```

To samo dla guesta (linia ~613-618).

**Fix 2**: W `handleToggleMute` i `handleToggleCamera` — po zmianie stanu, aktualizować sessionStorage:

```typescript
// Po setIsMuted(newMuted) w handleToggleMute:
if (roomId) {
  const raw = sessionStorage.getItem(`meeting_session_${roomId}`);
  if (raw) {
    const session = JSON.parse(raw);
    session.audioEnabled = !newMuted;
    sessionStorage.setItem(`meeting_session_${roomId}`, JSON.stringify(session));
  }
}
```

Analogicznie dla kamery w `handleToggleCamera`.

| Zmiana | Linie | Opis |
|---|---|---|
| cleanup() peer_id filter | ~600-670 | Zapobiega dezaktywacji nowej sesji przez stary cleanup |
| handleToggleMute persist | ~1814-1818 | Zapisuje stan mikrofonu do sessionStorage |
| handleToggleCamera persist | ~1834-1838 | Zapisuje stan kamery do sessionStorage |

