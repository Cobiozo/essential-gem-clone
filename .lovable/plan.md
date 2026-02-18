
# Ukrycie asystentow i funkcje wyciszania uczestnikow

## 1. Ukrycie ikon asystentow podczas spotkania

W `src/App.tsx` - komponent `ChatWidgetsWrapper` juz ukrywa widgety na stronach InfoLink. Dodanie analogicznego warunku dla sciezki `/meeting-room/`:

```text
const isMeetingPage = location.pathname.startsWith('/meeting-room/');
if (!user || isInfoLinkPage || isMeetingPage) return null;
```

## 2. Przycisk "Wycisz wszystkich"

W `src/components/meeting/ParticipantsPanel.tsx` - dodanie przycisku "Wycisz wszystkich" w naglowku panelu uczestnikow. Klikniecie wysle broadcast przez Supabase Realtime do wszystkich uczestnikow z zadaniem wyciszenia mikrofonu.

W `src/components/meeting/VideoRoom.tsx` - dodanie:
- Callbacka `onMuteAll` ktory wysyla broadcast `mute-all` przez kanal Realtime
- Callbacka `onMuteParticipant(peerId)` ktory wysyla broadcast `mute-peer` z peerId
- Listenera na te eventy - gdy lokalny uzytkownik otrzyma `mute-all` lub `mute-peer` skierowany do niego, automatycznie wycisza swoj mikrofon

## 3. Wyciszanie po najechaniu na uczestnika

W `src/components/meeting/ParticipantsPanel.tsx` - po najechaniu kursorem na wiersz uczestnika (nie-lokalnego) pojawi sie przycisk:
- Jesli uczestnik nie jest wyciszony: ikona "Wycisz" (MicOff)
- Jesli uczestnik jest wyciszony: ikona "Odcisz" (Mic) - wyslanie prosby o odciszenie

Klikniecie wysyla odpowiedni broadcast do konkretnego uczestnika.

## Szczegoly techniczne

### Pliki do zmiany:

1. **`src/App.tsx`** (linia 150-153) - dodanie warunku `isMeetingPage`

2. **`src/components/meeting/ParticipantsPanel.tsx`**:
   - Nowe propsy: `onMuteAll`, `onMuteParticipant(peerId)`
   - Przycisk "Wycisz wszystkich" w naglowku (obok "X")
   - Hover state na wierszach uczestnikow z przyciskiem wyciszenia

3. **`src/components/meeting/VideoRoom.tsx`**:
   - Nowe handlery: `handleMuteAll`, `handleMuteParticipant`
   - Broadcast eventow `mute-all` i `mute-peer` przez kanal Realtime
   - Listener na te eventy - automatyczne wyciszanie lokalnego mikrofonu po otrzymaniu
   - Przekazanie callbackow do `ParticipantsPanel`

### Przeplyw wyciszania:

```text
Host klika "Wycisz wszystkich"
  -> VideoRoom wysyla broadcast { event: 'mute-all' }
  -> Kazdy uczestnik otrzymuje event
  -> Automatycznie wycisza swoj mikrofon
  -> Wyswietla toast "Zostales wyciszony przez prowadzacego"

Host najedza na uczestnika i klika "Wycisz"
  -> VideoRoom wysyla broadcast { event: 'mute-peer', payload: { targetPeerId } }
  -> Konkretny uczestnik otrzymuje event
  -> Automatycznie wycisza swoj mikrofon
```
