
# Naprawa krytycznych bledow spotkania + nowe funkcje czatu

## Problem 1: Uczestnik zamiast imienia i nazwiska (KRYTYCZNY)

**Przyczyna**: W pliku `VideoRoom.tsx` linia 394-395, gdy uczestnik odbiera polaczenie PeerJS (`peer.on('call')`), nazwa jest zakodowana na sztywno jako `'Uczestnik'` bez `userId` i `avatarUrl`:
```
peer.on('call', (call) => {
  call.answer(stream); handleCall(call, 'Uczestnik');
});
```

Natomiast gdy to MY dzwonimy do kogos (linia 300, `callPeer`), poprawnie przekazujemy `displayName` i `userId`. Problem wystepuje wiec tylko u strony odbierajacej.

**Rozwiazanie**: PeerJS wspiera `metadata` w polaczeniach. Wyslemy `displayName`, `userId` i `avatarUrl` jako metadata przy kazdym polaczeniu, a przy odbieraniu odczytamy je z `call.metadata`.

### Zmiany w `VideoRoom.tsx`:

**a) callPeer** - dodanie metadata do `peer.call()`:
```typescript
const call = peerRef.current.call(remotePeerId, stream, {
  metadata: { displayName, userId, avatarUrl: localAvatarUrl }
});
```

**b) peer.on('call')** - odczytanie metadata z polaczenia:
```typescript
peer.on('call', async (call) => {
  const meta = call.metadata || {};
  let name = meta.displayName || 'Uczestnik';
  let callerUserId = meta.userId;
  let callerAvatar = meta.avatarUrl;

  // Fallback: lookup from DB if metadata missing
  if (!callerUserId) {
    const { data } = await supabase
      .from('meeting_room_participants')
      .select('display_name, user_id')
      .eq('room_id', roomId)
      .eq('peer_id', call.peer)
      .maybeSingle();
    if (data) {
      name = data.display_name || name;
      callerUserId = data.user_id;
    }
  }
  if (callerUserId && !callerAvatar) {
    const { data: prof } = await supabase.from('profiles')
      .select('avatar_url').eq('user_id', callerUserId).single();
    callerAvatar = prof?.avatar_url || undefined;
  }

  call.answer(stream);
  handleCall(call, name, callerAvatar, callerUserId);
});
```

To naprawi rownoczesnie:
- Wyswietlanie imienia i nazwiska zamiast "Uczestnik"
- Avatar uczestnika
- Mozliwosc nadania wspolprowadzacego (wymaga `userId`)
- Dostep do czatu (wymaga poprawnego `userId` w uprawnieniach)

---

## Problem 2: Brak mozliwosci nadania wspolprowadzacego

**Przyczyna**: `ParticipantsPanel` wyswietla przycisk wspolprowadzacego tylko gdy `p.userId` jest ustawione (warunek w linii 135). Poniewaz `userId` nie bylo przekazywane przy odbieraniu polaczen (Problem 1), przycisk nigdy sie nie pojawial.

**Rozwiazanie**: Naprawienie Problemu 1 automatycznie rozwiazuje ten problem - `userId` bedzie poprawnie ustawione dla kazdego uczestnika.

---

## Problem 3: Uczestnik nie mogl pisac na czacie

**Przyczyna**: Prawdopodobnie powiazane z Problemem 1 - brak poprawnego `userId` moglzaklocac logike uprawnien. Dodatkowo sprawdze, czy logika `canChat` w `VideoRoom.tsx` jest poprawna. Aktualnie `canChat = canManage || meetingSettings.allowChat` - jesli czat jest wlaczony (allowChat=true), kazdy powinien moc pisac. Jesli settings nie zaladowaly sie poprawnie dla uczestnika, `allowChat` moze byc `false`.

**Rozwiazanie**: Upewnie sie, ze domyslne ustawienia (`DEFAULT_SETTINGS`) maja `allowChat: true` (juz tak jest) i ze uczestnik laduje ustawienia z bazy prawidlowo.

---

## Problem 4: Powiadomienie o nowych wiadomosciach na czacie

**Stan obecny**: Badge z liczba nieprzeczytanych wiadomosci (`unreadChatCount`) juz istnieje na przycisku "Czat" w `MeetingControls`. Dzialanie: gdy czat jest zamkniety i przyjdzie nowa wiadomosc, licznik sie zwieksza. Gdy uzytkownik otworzy czat, licznik jest resetowany.

**Weryfikacja**: Logika w `handleNewChatMessage` (linia 600-602) i `handleToggleChat` (linia 590-593) wyglada poprawnie. Badge renderuje sie w `MeetingControls` (linia 69-73, linia 163). Ten element juz dziala.

---

## Problem 5: Widok mowcy - przelaczanie na aktywnego mowce

**Stan obecny**: Detekcja mowcy (`useActiveSpeakerDetection`) juz istnieje i dziala. Automatycznie wykrywa kto mowi na podstawie Web Audio API z 800ms debounce i progiem 10. Aktywny mowca wyswietla sie na glownym widoku w trybie "Mowca".

**Potencjalny problem**: Linia 244 wyklucza `isLocal` z detekcji mowcy - to poprawne (uzytkownik nie powinien widziec siebie jako glownego mowce). Jesli detekcja nie dziala dobrze, moge obnizyc prog lub poprawic responsywnosc. Ale mechanizm jest juz zaimplementowany poprawnie.

**Wniosek**: Ten element juz dziala. Ewentualne problemy z wyswietlaniem mowcy wynikaly z tego, ze uczestnik byl wyswietlany jako "Uczestnik" (Problem 1), co moglo byc mylace.

---

## Problem 6: Wiadomosci prywatne w czacie (NOWA FUNKCJA)

Dodanie mozliwosci wysylania wiadomosci do konkretnego uczestnika spotkania.

### Zmiany w bazie danych:
Dodanie kolumny `target_user_id` (opcjonalnej) do tabeli `meeting_chat_messages`:
```sql
ALTER TABLE meeting_chat_messages
ADD COLUMN target_user_id uuid REFERENCES auth.users(id) DEFAULT NULL;
```
- `NULL` = wiadomosc publiczna (do wszystkich)
- Ustawione = wiadomosc prywatna do konkretnego uzytkownika

### Zmiany w `MeetingChat.tsx`:

**a) Props** - dodanie listy uczestnikow:
```typescript
interface MeetingChatProps {
  // ...existing
  participants?: { peerId: string; displayName: string; userId?: string }[];
}
```

**b) Stan** - dodanie wybranego odbiorcy:
```typescript
const [targetUser, setTargetUser] = useState<{userId: string; name: string} | null>(null);
```

**c) Selektor odbiorcy** - dropdown nad polem wiadomosci:
- Domyslnie: "Wszyscy"
- Lista uczestnikow z opcja wyslania prywatnej wiadomosci

**d) Filtrowanie wyswietlanych wiadomosci**:
- Wiadomosci publiczne (`target_user_id = null`) - widoczne dla wszystkich
- Wiadomosci prywatne - widoczne tylko dla nadawcy i odbiorcy
- Oznaczenie "(prywatna)" przy prywatnych wiadomosciach

**e) Wysylanie** - dodanie `target_user_id` do insertu

### Zmiany w `VideoRoom.tsx`:
- Przekazanie listy uczestnikow do `MeetingChat`

---

## Podsumowanie zmian

| Plik | Zmiana |
|---|---|
| `VideoRoom.tsx` | Metadata w callPeer, odczyt metadata w peer.on('call'), przekazanie uczestnikow do MeetingChat |
| `MeetingChat.tsx` | Selektor odbiorcy (wszyscy/prywatnie), filtrowanie wiadomosci prywatnych, oznaczenie "(prywatna)" |
| Migracja SQL | Dodanie kolumny `target_user_id` do `meeting_chat_messages` |

## Kolejnosc implementacji

1. Migracja SQL - kolumna `target_user_id`
2. `VideoRoom.tsx` - naprawa metadata w polaczeniach PeerJS (KRYTYCZNE)
3. `MeetingChat.tsx` - wiadomosci prywatne i selektor odbiorcy
