

# Odczytywanie DM zmniejsza licznik nieprzeczytanych

## Problem
Po wejściu w konwersację DM wiadomości nie są oznaczane jako przeczytane w bazie — `selectDirectMember` wywołuje `fetchDirectMessages` ale nigdy `UPDATE ... SET is_read = true`. Licznik nieprzeczytanych nie spada.

## Zmiany — jeden plik: `src/hooks/useUnifiedChat.ts`

### 1. Nowa funkcja `markDirectAsRead(otherUserId)`
- `UPDATE role_chat_messages SET is_read = true, read_at = NOW() WHERE recipient_id = currentUser AND sender_id = otherUserId AND is_read = false`
- Aktualizacja lokalnego `unreadCounts` — ustawienie `dm-${otherUserId}` na 0

### 2. Wywołanie w `selectDirectMember` (linia ~442)
Po `fetchDirectMessages(userId)` dodać `markDirectAsRead(userId)`.

### 3. Wywołanie w realtimowym handlerze (linia ~1033)
Gdy przychodzi nowa wiadomość DM do aktualnie otwartej konwersacji (`record.sender_id === otherUserId && record.recipient_id === user.id`), od razu wywołać `markDirectAsRead(otherUserId)` — dzięki temu nowe wiadomości w otwartym czacie nie zwiększają licznika.

