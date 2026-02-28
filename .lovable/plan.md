
## Naprawa krytycznych bledow systemu spotkan wideo

### Problem 1: Przyciski mikrofonu/kamery nie reaguja na klikniecie

**Przyczyna glowna**: Funkcje `handleToggleMute` i `handleToggleCamera` w `VideoRoom.tsx` sprawdzaja `if (localStreamRef.current)` na poczatku. Jesli strumien jest `null` (np. getUserMedia nie powiodlo sie, lub sciezki zakonczyly sie po przejsciu na tle na mobilnym), cale cialo funkcji jest pomijane **bez zadnego komunikatu** -- uzytkownik klika przycisk i nic sie nie dzieje.

**Dodatkowy problem**: Element `<button>` w `ControlButton` (MeetingControls.tsx) nie ma atrybutu `type="button"`. W niektorych kontekstach przegladarki domyslny `type="submit"` moze powodowac nieoczekiwane zachowanie.

**Naprawa**:

1. **`MeetingControls.tsx`** -- dodac `type="button"` do elementu `<button>` w `ControlButton` (linia 62)
2. **`VideoRoom.tsx`** -- w `handleToggleMute` (linia 1096) i `handleToggleCamera` (linia 1111):
   - Dodac blok `else` z toastem "Brak strumienia audio/wideo. Sprobuj odswiezyc strone."
   - Dodac probe ponownego uzyskania strumienia (re-acquire getUserMedia) gdy sciezki sa w stanie `ended`
   - Jesli sciezki sa ended, automatycznie sprobowac `navigator.mediaDevices.getUserMedia()` i zaktualizowac `localStreamRef` + `localStream` state

### Problem 2: Uczestnicy nie widza siebie nawzajem

**Przyczyna glowna**: Baza danych NIE ZAWIERA zadnych rekordow w `meeting_room_participants` dla pokoju `4f13d929-ffc1-478a-8abe-07b2a9b7a953`. Oznacza to ze INSERT/UPSERT nie powiodl sie cicho. Kod na liniach 686-698 robi upsert z `onConflict: 'room_id,user_id'`, ale:

- Jesli nie ma unikatowego indeksu na `(room_id, user_id)`, upsert zglosi blad
- Blad jest logowany (`console.error`) ale uzytkownik NIE dostaje komunikatu
- Ponowna proba (linia 694-698) tez moze sie nie powiesc
- Bez rekordu w bazie: Postgres Realtime NIE wykrywa nowego uczestnika, heartbeat sync NIE widzi go, i jedynym kanalem sygnalizacji jest broadcast ktory moze byc stracony

**Naprawa**:

1. **`VideoRoom.tsx`** -- po INSERT/UPSERT uczestnika (linia 686-698):
   - Dodac walidacje: jesli oba upserty sie nie powioda, pokazac toast z bledem i zalogowac szczegoly
   - Dodac `SELECT` sprawdzajacy czy rekord faktycznie istnieje po upsert
   - Jesli nie istnieje -- sprobowac czysty INSERT (nie upsert)

2. **`VideoRoom.tsx`** -- dodac re-acquire media logic:
   - Nowa funkcja `reacquireLocalStream()` ktora probuje ponownie uzyskac getUserMedia
   - Wywolywana gdy `localStreamRef.current` jest null lub wszystkie sciezki sa ended
   - Po uzyskaniu nowego strumienia -- zaktualizowac wszystkie istniejace polaczenia peer (`replaceTrack`)

3. **`VideoRoom.tsx`** -- lepsze logowanie bledow polaczenia:
   - Logowac peer connection state changes z wiekszymi szczegolami
   - Dodac toast gdy ICE connection failuje permanentnie

### Problem 3: Brak informacji zwrotnej na mobile

**Przyczyna**: Na urzadzeniach mobilnych czesto dochodzi do utraty strumienia multimedia (przejscie na tle, zmiana karty, blokada ekranu). Kod nie informuje uzytkownika o utracie strumienia.

**Naprawa**:

1. **`VideoRoom.tsx`** -- dodac listener na `ended` event dla lokalnych sciezek audio/video
2. Gdy sciezka konczy sie nieoczekiwanie (nie przez uzytkownika), automatycznie sprobowac re-acquire
3. Jesli re-acquire sie nie powiedzie, pokazac toast z informacja

### Pliki do zmiany

| Plik | Operacja | Opis |
|------|----------|------|
| `src/components/meeting/MeetingControls.tsx` | Edycja | Dodanie `type="button"` do ControlButton |
| `src/components/meeting/VideoRoom.tsx` | Edycja | Re-acquire media, lepsze error handling, toast na brak strumienia, walidacja upsert uczestnika, track ended listeners |

### Szczegoly techniczne zmian w VideoRoom.tsx

**handleToggleMute (linia 1096)**:
```text
const handleToggleMute = async () => {
  let stream = localStreamRef.current;
  // Re-acquire if null or tracks ended
  if (!stream || stream.getAudioTracks().every(t => t.readyState === 'ended')) {
    stream = await reacquireLocalStream();
    if (!stream) {
      toast({ title: 'Brak dostepu do mikrofonu', description: 'Sprawdz uprawnienia przegladarki lub odswiez strone.', variant: 'destructive' });
      return;
    }
  }
  // ... reszta logiki toggle
};
```

**handleToggleCamera (linia 1111)** -- analogiczna zmiana.

**reacquireLocalStream (nowa funkcja)**:
```text
const reacquireLocalStream = async (): Promise<MediaStream | null> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    // ... fallbacki audio-only, video-only
    localStreamRef.current = stream;
    setLocalStream(stream);
    // replaceTrack w istniejacych polaczeniach
    return stream;
  } catch { return null; }
};
```

**Walidacja upsert uczestnika (po liniach 686-698)**:
```text
// Verify record exists
const { data: verify } = await supabase
  .from('meeting_room_participants')
  .select('id')
  .eq('room_id', roomId).eq('user_id', user.id)
  .maybeSingle();
if (!verify) {
  // Try plain insert as fallback
  await supabase.from('meeting_room_participants').insert({...});
}
```

**Track ended listeners (po uzyskaniu strumienia w init)**:
```text
stream.getTracks().forEach(track => {
  track.addEventListener('ended', () => {
    if (!cleanupDoneRef.current) {
      console.warn('[VideoRoom] Local track ended unexpectedly:', track.kind);
      reacquireLocalStream();
    }
  });
});
```
