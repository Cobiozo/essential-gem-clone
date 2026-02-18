

# Czat w spotkaniu + PiP (Picture-in-Picture) + pelna funkcjonalnosc

## Opis

Dodanie czatu tekstowego w pokoju spotkania (wysuwany panel z boku, jak w Zoom) oraz trybu Picture-in-Picture (PiP) umozliwiajacego minimalizacje video do malego okna. Dodatkowo -- pelna funkcjonalnosc przyciskow "Uczestnicy" (lista uczestnikow w panelu bocznym).

## Nowe funkcje

### 1. Czat w spotkaniu (MeetingChat)

Panel czatu wysuwany z prawej strony po kliknieciu "Czat" w kontrolkach:
- Wiadomosci zapisywane w Supabase (nowa tabela `meeting_chat_messages`)
- Real-time przez Supabase Realtime (subscribe na INSERT)
- Nazwa nadawcy + czas wyslania
- Auto-scroll do najnowszej wiadomosci
- Badge z liczba nieprzeczytanych wiadomosci na ikonie Czat
- Ciemny motyw (dopasowany do pokoju)

### 2. Panel Uczestnikow (ParticipantsPanel)

Panel wysuwany z prawej strony po kliknieciu "Uczestnicy":
- Lista aktywnych uczestnikow z ich statusem (mic on/off, camera on/off)
- Ikona awatara + nazwa
- Ciemny motyw

### 3. Picture-in-Picture (PiP)

Przycisk PiP w kontrolkach:
- Wykorzystuje natywne Web API `requestPictureInPicture()` na elemencie `<video>`
- Glowny mowca przechodzi do malego okna PiP
- Przycisk zmienia stan (aktywny/nieaktywny)
- Fallback: jesli przegladarka nie wspiera PiP, przycisk jest ukryty

## Zmiany w plikach

### Baza danych (migracja SQL)

Nowa tabela `meeting_chat_messages`:
- `id` (uuid PK)
- `room_id` (text, NOT NULL)
- `user_id` (uuid, NOT NULL)
- `display_name` (text)
- `content` (text, NOT NULL)
- `created_at` (timestamptz)

RLS: Uczestnicy moga czytac wiadomosci z pokoju w ktorym sa; kazdy moze wstawiac swoje.

### Nowe komponenty

| Plik | Opis |
|------|------|
| `src/components/meeting/MeetingChat.tsx` | Panel czatu: lista wiadomosci + input, Supabase realtime subscribe |
| `src/components/meeting/ParticipantsPanel.tsx` | Lista uczestnikow z ikonami statusu (mic/cam) |

### Zmiany w istniejacych plikach

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/MeetingControls.tsx` | Dodanie callbackow `onToggleChat`, `onToggleParticipants`, `onTogglePiP`; badge nieprzeczytanych na Czat; nowy przycisk PiP; props `isChatOpen`, `isParticipantsOpen`, `isPiPActive`, `unreadChatCount` |
| `src/components/meeting/VideoRoom.tsx` | Nowe stany: `isChatOpen`, `isParticipantsOpen`, `isPiPActive`, `unreadChatCount`; rendering paneli MeetingChat i ParticipantsPanel; logika PiP (requestPictureInPicture na video ref); przekazanie nowych propsow do MeetingControls |
| `src/components/meeting/VideoGrid.tsx` | Eksport ref do aktywnego video elementu (forwardRef lub callback) aby VideoRoom mogl wywolac PiP |

### Szczegoly techniczne PiP

```text
1. VideoGrid przekazuje ref do aktywnego <video> przez callback prop
2. VideoRoom przechowuje ten ref i wywoluje:
   videoElement.requestPictureInPicture()
3. Nasluchuje na 'enterpictureinpicture' i 'leavepictureinpicture'
4. document.pictureInPictureEnabled sprawdza wsparcie przegladarki
```

### Layout paneli bocznych

```text
+---------------------------+----------+
|                           |          |
|    VIDEO GRID             |  CZAT /  |
|    (zmniejsza sie)        |  LISTA   |
|                           |  (320px) |
|                           |          |
+---------------------------+----------+
|     KONTROLKI                        |
+--------------------------------------+
```

Panel boczny: szerokosc 320px na desktop, pelny ekran na mobile (overlay).

