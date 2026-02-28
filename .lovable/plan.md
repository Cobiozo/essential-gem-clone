

## Naprawa dwoch problemow: brak odznaki nieprzeczytanych + udostepnianie ekranu na mobile

### Problem 1: Brak liczby nieprzeczytanych wiadomosci przy ikonce Czatu

**Przyczyna**: Funkcja `fetchUnreadCounts` w `useUnifiedChat.ts` liczy tylko wiadomosci broadcastowe (po `sender_role`). Wiadomosci bezposrednie (DM) -- gdzie `recipient_id` jest konkretnym uzytkownikiem -- sa calkowicie pomijane. Dlatego `totalUnread` jest zawsze 0, jesli uzytkownik ma tylko nieprzeczytane DM-y.

**Naprawa** w `src/hooks/useUnifiedChat.ts` -- rozszerzenie `fetchUnreadCounts`:

Dodac drugie zapytanie do `role_chat_messages` liczace nieprzeczytane wiadomosci bezposrednie:

```text
// Existing: broadcast unread
const { data: broadcastData } = await supabase
  .from('role_chat_messages')
  .select('sender_role')
  .eq('recipient_role', currentRole)
  .eq('is_read', false)
  .or(`recipient_id.eq.${user.id},recipient_id.is.null`);

// NEW: direct message unread
const { data: dmData } = await supabase
  .from('role_chat_messages')
  .select('sender_id')
  .eq('recipient_id', user.id)
  .eq('is_read', false)
  .not('sender_id', 'is', null);
```

Polaczyc wyniki w jednej mapie `counts`:
- Broadcast: klucze `incoming-{role}` (jak dotychczas)
- DM: klucze `dm-{sender_id}` (nowe)

Dzieki temu `totalUnread` zsumuje zarowno broadcast jak i DM.

### Problem 2: Przycisk udostepniania ekranu nieaktywny na mobile

**Przyczyna**: `getDisplayMedia` API nie jest dostepne na iOS Safari (calkowicie brak wsparcia) i na wiekszosci przegladarek mobilnych. Warunek `isScreenShareSupported` poprawnie wykrywa brak, ale przycisk jest po prostu wyszarzony bez wyjasnienia.

**Naprawa** w `src/components/meeting/MeetingControls.tsx`:

Dodac dedykowany tooltip dla mobilnych urzadzen, ktory wyjasni dlaczego przycisk jest nieaktywny:

```text
disabled={!canScreenShare && !canManage || !isScreenShareSupported}
disabledTooltip={!isScreenShareSupported 
  ? "Udostępnianie ekranu nie jest obsługiwane na tym urządzeniu" 
  : disabledTip}
```

Trzeba przekazac `isScreenShareSupported` do `MeetingControls` jako nowy prop.

Zmiany w `src/components/meeting/VideoRoom.tsx`:
- Przekazac `isScreenShareSupported` do `MeetingControls`

Zmiany w `src/components/meeting/MeetingControls.tsx`:
- Dodac prop `isScreenShareSupported`
- Zmienic logike `disabled` i `disabledTooltip` dla przycisku ekranu

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/hooks/useUnifiedChat.ts` | Rozszerzyc `fetchUnreadCounts` o liczenie nieprzeczytanych DM |
| `src/components/meeting/MeetingControls.tsx` | Dodac prop `isScreenShareSupported`, pokazac tooltip "nie obslugiwane na tym urzadzeniu" |
| `src/components/meeting/VideoRoom.tsx` | Przekazac `isScreenShareSupported` do MeetingControls |

