
# Plan: Naprawa widoczności wiadomości prywatnych + nowa logika usuwania konwersacji

## Znalezione problemy

### Problem 1: Partner nie widzi wiadomości od admina
**Przyczyna**: W bazie danych obie strony mają `is_deleted: true` w tabeli `conversation_user_settings`. Admin wcześniej usunął konwersację z Sebastianem, a Sebastian usunął konwersację z adminem. Mimo że admin wysłał NOWĄ wiadomość (widoczna w bazie), sidebar odfiltrowuje tę konwersację bo `is_deleted = true`.

Kod filtrujący w MessagesPage/ChatPanelContent:
```
adminConversations.filter(c => !isDeleted(c.userId) && ...)
```
Efekt: konwersacja nie wyświetla się w sidebarze partnera, mimo że nowa wiadomość istnieje w bazie.

### Problem 2: Logika usuwania konwersacji
Aktualnie "Usuń" tylko ustawia flagę `is_deleted: true`, ale nie kasuje historii. Po cofnięciu flagi wszystkie stare wiadomości wracają. Użytkownik chce trwałego usunięcia historii z jego perspektywy.

## Rozwiązanie

### 1. Auto-reset `is_deleted` przy nowej wiadomości (useUnifiedChat.ts)

W `sendDirectMessage` — po wysłaniu wiadomości, automatycznie resetuj `is_deleted` dla nadawcy:
```typescript
// Po udanym INSERT wiadomości:
await supabase.from('conversation_user_settings')
  .update({ is_deleted: false, deleted_at: null })
  .eq('user_id', user.id)
  .eq('other_user_id', recipientId);
```

### 2. Auto-reset `is_deleted` dla odbiorcy przy nowej wiadomości (useUnifiedChat.ts)

W `sendDirectMessage` — po wysłaniu, resetuj też flagę u odbiorcy, ale zachowaj `deleted_at` jako marker "od kiedy pokazywać wiadomości":
```typescript
await supabase.from('conversation_user_settings')
  .update({ is_deleted: false })  // NIE resetuj deleted_at - to marker historii
  .eq('user_id', recipientId)
  .eq('other_user_id', user.id)
  .eq('is_deleted', true);
```

### 3. Filtrowanie historii po `deleted_at` (useUnifiedChat.ts)

W `fetchDirectMessages` — po pobraniu wiadomości, odfiltruj te starsze niż `deleted_at` z `conversation_user_settings`:
```typescript
const { data: setting } = await supabase
  .from('conversation_user_settings')
  .select('deleted_at')
  .eq('user_id', user.id)
  .eq('other_user_id', otherUserId)
  .maybeSingle();

// Filtruj wiadomości — pokaż tylko te po deleted_at
if (setting?.deleted_at) {
  data = data.filter(m => m.created_at > setting.deleted_at);
}
```

### 4. Informacja u drugiej strony o usunięciu (FullChatWindow)

Gdy użytkownik A usunie konwersację, u użytkownika B wyświetl komunikat systemowy:
- Sprawdź `conversation_user_settings` drugiej strony — jeśli ma `deleted_at`, pokaż baner: "Użytkownik usunął historię tej rozmowy"
- Wiadomości sprzed `deleted_at` drugiej strony pozostają widoczne u B

### 5. Realtime: dodanie `recipient_role === 'all'` (useUnifiedChat.ts)

Bonus fix — brak realtime dla broadcastów `recipient_role: 'all'`:
```typescript
const isRelevant =
  record.sender_id === user.id ||
  record.recipient_id === user.id ||
  (record.recipient_id === null && (
    record.recipient_role === currentRole || 
    record.recipient_role === 'all'  // <-- brakujący warunek
  ));
```

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useUnifiedChat.ts` | Auto-reset is_deleted przy wysyłce, filtrowanie historii po deleted_at, fix realtime 'all' |
| `src/components/messages/FullChatWindow.tsx` | Komunikat systemowy o usunięciu konwersacji przez drugą stronę |
| `src/hooks/useConversationSettings.ts` | Zachowanie `deleted_at` jako markera historii przy usuwaniu |

## Efekt

- Admin wysyła wiadomość do Sebastiana → `is_deleted` automatycznie resetowane u obu stron → Sebastian widzi konwersację i nową wiadomość
- Partner klika "Usuń rozmowę" → flaga `is_deleted: true` + `deleted_at` = teraz → stare wiadomości znikają trwale z jego widoku
- Druga strona widzi info: "Użytkownik usunął historię rozmowy" + zachowuje swoją historię
- Nowe wiadomości po usunięciu → konwersacja wraca jako "nowa" (bez starej historii)
- Broadcasty `recipient_role: 'all'` poprawnie odświeżają się w realtime
