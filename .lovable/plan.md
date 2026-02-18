

# Naprawa PiP - powrot do lobby po zmianie karty

## Problem

W `MeetingRoom.tsx` (linia 95) efekt `verifyAccess` zalezy od `[roomId, user]`. Gdy uzytkownik przelacza karty przegladarki, AuthContext moze zaktualizowac referencje obiektu `user` (np. przy `TOKEN_REFRESHED`). To powoduje ponowne uruchomienie efektu, ktory:

1. Resetuje `status` do `'loading'` (bo efekt startuje od nowa)
2. Ponownie weryfikuje dostep i ustawia `status` na `'lobby'`
3. Uzytkownik widzi ekran "Dolacz do spotkania" zamiast byc w pokoju

## Rozwiazanie

### Plik: `src/pages/MeetingRoom.tsx`

1. **Zmienic zaleznosc efektu** z `[roomId, user]` na `[roomId, user?.id]` - efekt uruchomi sie tylko gdy zmieni sie ID uzytkownika, nie referencja obiektu
2. **Dodac guard** - jesli `status` jest juz `'joined'` lub `'lobby'`, nie resetowac go ponownie przy ponownym uruchomieniu efektu
3. **Uzyc ref** do sledzenia czy weryfikacja juz sie odbywa, aby uniknac podwojnego wywolania

### Szczegoly techniczne

```text
Zmiana 1: Dependency array
- Bylo:  }, [roomId, user]);
- Bedzie: }, [roomId, user?.id]);

Zmiana 2: Guard na poczatku efektu
- Jesli status !== 'loading', nie uruchamiac ponownie weryfikacji
- Uzyc statusRef (useRef) zeby efekt mogl czytac aktualny status
  bez dodawania go do dependency array
```

Dzieki temu przelaczanie kart nie spowoduje ponownej weryfikacji i powrotu do lobby. Efekt uruchomi sie tylko raz (przy pierwszym renderze) lub gdy zmieni sie `roomId` albo zaloguje sie inny uzytkownik.

