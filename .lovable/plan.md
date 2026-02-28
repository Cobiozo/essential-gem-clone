

## Naprawa: automatyczne przywracanie sesji po odswiezeniu strony

### Problem

Po odswiezeniu strony (F5 / pull-to-refresh) stan `status` zaczyna od `'loading'`, weryfikacja ustawia go na `'lobby'` i uzytkownik musi ponownie kliknac "Dolacz do spotkania". Nie ma zadnego mechanizmu zapamietywania, ze uzytkownik byl juz w pokoju.

### Rozwiazanie

Uzyc `sessionStorage` do zapamietania stanu "joined" oraz ustawien audio/video. Po odswiezeniu, jesli sesja istnieje i uzytkownik ma dostep, automatycznie pominac lobby i przejsc bezposrednio do `VideoRoom`.

### Zmiany

**Plik: `src/pages/MeetingRoom.tsx`**

1. **Zapisywanie sesji przy dolaczeniu** -- w `handleJoin` zapisac do `sessionStorage` informacje o aktywnej sesji:
   ```text
   sessionStorage.setItem(`meeting_session_${roomId}`, JSON.stringify({
     audioEnabled: audio,
     videoEnabled: video,
     settings: settings || null,
     joinedAt: Date.now()
   }));
   ```

2. **Usuwanie sesji przy wyjsciu** -- w `handleLeave` usunac wpis:
   ```text
   sessionStorage.removeItem(`meeting_session_${roomId}`);
   ```

3. **Auto-rejoin po weryfikacji dostepu** -- w obu useEffect-ach (authenticated i guest), po pomyslnej weryfikacji sprawdzic czy istnieje zapisana sesja w `sessionStorage`. Jesli tak (i nie starsza niz 5 minut):
   - Zamiast ustawiac `status = 'lobby'`, od razu wywolac logike dolaczania (ustawic `audioEnabled`, `videoEnabled`, `initialSettings` z zapisanych danych i ustawic `status = 'joined'`)
   - Dla hosta: odtworzyc rowniez `meetingSettings`
   - Lobby stream nie bedzie dostepny (bo strona sie odswiezyla), wiec `VideoRoom` sam pobierze nowy strumien z kamery/mikrofonu (to juz dziala -- fallback w `init` gdy `initialStream` jest null)

4. **Walidacja wieku sesji** -- jesli `joinedAt` jest starsze niz 5 minut, zignorowac zapisana sesje i pokazac lobby normalnie. Zapobiega to auto-rejoin do dawno zakonczonych spotkan.

5. **Obsluga password-gate** -- jesli spotkanie wymaga hasla, a uzytkownik ma zapisana sesje (wczesniej juz podal haslo), pominac bramke hasla i przejsc do joined.

### Diagram przeplywu

```text
Odswiezenie strony
      |
  status = 'loading'
      |
  Weryfikacja dostepu (istniejacy useEffect)
      |
  Dostep OK?
      |
  +---+---+
  |       |
 TAK     NIE -> unauthorized/error (bez zmian)
  |
  Czy sessionStorage ma meeting_session_{roomId}?
  |
  +---+---+
  |       |
 TAK     NIE -> status = 'lobby' (bez zmian)
  |
  Czy joinedAt < 5 min temu?
  |
  +---+---+
  |       |
 TAK     NIE -> usun stara sesje, status = 'lobby'
  |
  Przywroc audio/video/settings
  status = 'joined' (pomija lobby)
```

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/pages/MeetingRoom.tsx` | Zapis sesji w handleJoin, usuwanie w handleLeave, auto-rejoin w useEffect weryfikacji |

Jedna zmiana w jednym pliku -- minimalne ryzyko regresji. `VideoRoom` nie wymaga zmian, bo juz obsluguje brak `initialStream` (pobiera nowy strumien w `init`).

