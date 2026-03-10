

# Fix: Refresh nie przywraca video/audio + miniaturka lokalna w trybie mówcy

## Problem 1: Refresh nie przywraca połączenia

**Przyczyna**: Upsert uczestnika (linia 1106-1109) używa `onConflict: 'room_id,user_id'`, ale unikalny indeks w bazie to **partial index** z klauzulą `WHERE (user_id IS NOT NULL)`. PostgreSQL wymaga dopasowania klauzuli WHERE w ON CONFLICT, czego Supabase JS nie wspiera. Skutek: upsert zawsze failuje z błędem `"there is no unique or exclusion constraint matching the ON CONFLICT specification"`. Uczestnik nie jest rejestrowany w tabeli → inni uczestnicy go nie widzą → brak połączeń → brak zdalnego video/audio.

Widać to wyraźnie w logach konsoli:
```
[VideoRoom] Failed to register participant (upsert): "there is no unique or exclusion constraint matching the ON CONFLICT specification"
[VideoRoom] Retry upsert also failed: ...
```

**Rozwiązanie**: Zamienić upsert na **delete + insert** — najpierw usunąć stary rekord tego użytkownika w tym pokoju, potem wstawić nowy. Bezpieczne, bo i tak aktualizujemy `peer_id` i `joined_at`.

## Problem 2: Miniaturka nie pokazuje lokalnego video w trybie mówcy

**Przyczyna**: `ThumbnailTile` (linia 332-344) **warunkowo renderuje** element `<video>` — gdy `showVideo` jest false (np. stream chwilowo null po zmianie widoku), element jest usuwany z DOM i `videoRef` staje się null. Gdy stream wraca, React tworzy nowy element video, ale useEffect na `participant.stream` może nie zdążyć ustawić `srcObject` w odpowiednim momencie. W kontraście, `VideoTile` (linia 233-247) **zawsze trzyma** `<video>` w DOM, ukrywając go przez `className="hidden"`.

**Rozwiązanie**: Zmienić `ThumbnailTile` aby zawsze renderować `<video>` w DOM (jak VideoTile), ukrywając go CSS-em zamiast usuwać z drzewa. Ten sam fix dla `MiniVideo` i `DraggableFloatingPiP`.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/meeting/VideoRoom.tsx` | Zastąpić upsert z `onConflict` na delete+insert (~linie 1104-1144) |
| `src/components/meeting/VideoGrid.tsx` | ThumbnailTile, MiniVideo, DraggableFloatingPiP: zawsze renderować `<video>` w DOM, ukrywać CSS-em |

## Szczegóły techniczne

### VideoRoom.tsx — participant registration (linie 1103-1144)
```typescript
// ZAMIAST upsert z onConflict:
// 1. Usuń stary rekord
await supabase.from('meeting_room_participants')
  .delete()
  .eq('room_id', roomId)
  .eq('user_id', user.id);

// 2. Wstaw nowy
const { error } = await supabase.from('meeting_room_participants')
  .insert({
    room_id: roomId,
    user_id: user.id,
    peer_id: peerId,
    display_name: displayName,
    is_active: true,
    joined_at: new Date().toISOString(),
  });
```

### VideoGrid.tsx — ThumbnailTile (linie 321-349)
```typescript
// Zamiast: {showVideo ? <video> : <div>}
// Zawsze renderuj video + fallback, ukryj nieaktywny:
<video ref={videoRef} ... className={showVideo ? '...' : 'hidden'} />
{!showVideo && (
  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
    <User className="h-5 w-5 text-zinc-500" />
  </div>
)}
```

Ten sam wzorzec dla `MiniVideo` (linie 602-611) i `DraggableFloatingPiP` (linie 681-700).

