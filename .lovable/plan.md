
# Naprawa 4 problemow - Meeting Room

## Znaleziona glowna przyczyna

Logi bazy danych pokazuja **"infinite recursion detected in policy for relation meeting_room_participants"**. Polityka SELECT na tabeli `meeting_room_participants` odwoluje sie do SAMEJ SIEBIE:

```
SELECT policy: room_id IN (SELECT mrp.room_id FROM meeting_room_participants mrp WHERE mrp.user_id = auth.uid())
```

To powoduje nieskonczona petle - zeby przeczytac tabele, RLS musi przeczytac te sama tabele, co znow odpala RLS, itd. To blokuje WSZYSTKIE operacje: upsert uczestnika, odczyt listy uczestnikow, wysylanie wiadomosci na czacie (bo chat RLS tez sprawdza te tabele).

## Plan napraw

### Krok 1: Naprawic RLS na meeting_room_participants (SQL migration)

Usunac rekurencyjna polityke SELECT i zastapic ja prosta:
- Kazdy zalogowany uzytkownik moze widziec uczestnikow w pokoju (bez samoreferencji)
- Alternatywnie: uzytkownik widzi swoje wlasne rekordy PLUS rekordy w pokojach, w ktorych uczestniczy (przez funkcje SQL z SECURITY DEFINER zeby ominac RLS)

Najprostsze rozwiazanie - uzytkownik widzi uczestnikow w pokojach gdzie sam jest uczestnikiem, uzywajac funkcji helper:

```sql
-- Funkcja SECURITY DEFINER omija RLS
CREATE OR REPLACE FUNCTION get_user_meeting_rooms(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT room_id FROM meeting_room_participants WHERE user_id = p_user_id AND is_active = true; $$;

-- Nowa polityka SELECT bez rekurencji
DROP POLICY "Users can view participants in their room" ON meeting_room_participants;
CREATE POLICY "Users can view participants in their room" ON meeting_room_participants
  FOR SELECT TO authenticated
  USING (room_id IN (SELECT get_user_meeting_rooms(auth.uid())) OR has_role(auth.uid(), 'admin'));
```

### Krok 2: Naprawic lobby - brak podgladu kamery/mikrofonu

Na screenshocie widac ze kamera jest wlaczona ale podglad jest czarny. Problem w `MeetingLobby.tsx`:
- `getUserMedia` jest wywolywane z `video: videoEnabled` w useEffect z pustym dependency array `[]`, ale `videoEnabled` jest `true` domyslnie wiec to powinno dzialac
- Prawdopodobny problem: `videoRef.current` nie jest jeszcze zamontowany gdy stream jest gotowy

Naprawa: dodac dodatkowy useEffect ktory ustawia `srcObject` gdy `previewStream` sie zmieni.

### Krok 3: Naprawic object-cover na glownym video

Screenshot pokazuje ze obraz jest przyciety (widac tylko czubek glowy). Problem: `object-cover` na glownym video rozciaga i przycina obraz.

Naprawa w `VideoGrid.tsx`: zmienic `object-cover` na `object-contain` dla glownego video (VideoTile w trybie pelnoekranowym). Miniaturki moga zostac z `object-cover`.

### Krok 4: Naprawic nawigacje po wyjsciu

W `VideoRoom.tsx` `handleLeave` wywoluje `onLeave()` ktory w `MeetingRoomPage` robi `navigate('/events')`. To powinno dzialac, ale jesli `cleanup()` rzuci blad lub sie zawiesi, `onLeave()` nigdy nie zostanie wywolany.

Naprawa: dodac timeout safety i uzyc `finally` block.

## Zmieniane pliki

1. **SQL migration** - naprawic RLS na `meeting_room_participants` (usunac rekurencje)
2. **`src/components/meeting/VideoGrid.tsx`** - zmienic `object-cover` na `object-contain` dla glownego video
3. **`src/components/meeting/MeetingLobby.tsx`** - dodac useEffect na ustawianie srcObject po zmianie streamu
4. **`src/components/meeting/VideoRoom.tsx`** - dodac timeout safety w handleLeave

## Szczegoly techniczne

### Zmiana RLS (Krok 1)
- Utworzyc funkcje `get_user_meeting_rooms` z SECURITY DEFINER (omija RLS, nie powoduje rekurencji)
- Usunac stara polityke SELECT
- Utworzyc nowa polityke SELECT uzywajaca tej funkcji
- To naprawi rownoczesnie: liste uczestnikow, rejestracje uczestnika (upsert), i czat (bo chat RLS tez odpytuje meeting_room_participants)

### Zmiana VideoGrid (Krok 3)
- Glowny VideoTile: `object-contain` (cala osoba widoczna, czarne pasy po bokach)
- Miniaturki: `object-cover` (przyciete ale ladniejsze w malym rozmiarze)

### Zmiana MeetingLobby (Krok 2)
- Dodac useEffect reagujacy na zmiane `previewStream` ktory ustawia `videoRef.current.srcObject`

### Zmiana handleLeave (Krok 4)
- Opakowac cleanup w Promise.race z 3s timeout
- Zapewnic ze onLeave() zawsze sie wykona
