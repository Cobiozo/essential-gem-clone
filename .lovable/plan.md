

# Blokada czatu dla uzytkownikow bez dostepu

## Problem
Gdy uzytkownik A pisze do uzytkownika B, ktory nie ma wlaczonego czatu (feature_visibility / chat_user_visibility), nic nie blokuje wyslania wiadomosci. Uzytkownik B dostaje powiadomienia mimo ze nie ma dostepu do czatu.

## Rozwiazanie

### 1. Sprawdzenie dostepu odbiorcy przed wyslaniem wiadomosci
**Plik: `src/hooks/useUnifiedChat.ts`** — funkcja `sendDirectMessage`

Przed insertem do `role_chat_messages`:
- Pobranie roli odbiorcy (juz jest: `recipientProfile.role`)
- Pobranie ustawien widocznosci czatu: `chat_sidebar_visibility` (globalnych) i `chat_user_visibility` (per-user override)
- Jesli odbiorca nie ma dostepu — zwrocic `false` i wyrzucic blad (np. `throw new Error('RECIPIENT_CHAT_DISABLED')`)

Rowniez: **nie wysylac powiadomienia** (user_notifications insert) ani emaila gdy odbiorca nie ma czatu.

### 2. Komunikat w UI przed otwarciem konwersacji
**Plik: `src/components/messages/FullChatWindow.tsx`**

Dodac nowy prop `recipientChatDisabled?: boolean`. Gdy `true`:
- Zamiast `MessageInput` wyswietlic komunikat: "Ten uzytkownik nie ma wlaczonego czatu. Wysylanie wiadomosci jest niemozliwe."
- Ukryc pole wejsciowe

### 3. Nowy hook helper: `useRecipientChatAccess`
**Nowy plik: `src/hooks/useRecipientChatAccess.ts`**

Hook przyjmuje `recipientUserId` i zwraca `{ hasAccess: boolean, loading: boolean }`.
Logika:
1. Pobranie `chat_user_visibility` per-user override dla odbiorcy
2. Jesli override istnieje — uzyc go
3. W przeciwnym razie pobranie `chat_sidebar_visibility` globalnej i sprawdzenie roli odbiorcy (z `profiles`)
4. Zwrocic wynik

### 4. Integracja w `ChatPanelContent.tsx`
- Uzyc `useRecipientChatAccess(selectedDirectUserId)` 
- Przekazac `recipientChatDisabled={!hasAccess}` do `FullChatWindow`

### 5. Blokada powiadomien po stronie nadawcy
**Plik: `src/hooks/useUnifiedChat.ts`** — w `sendDirectMessage`:
- Przed insertem notyfikacji i wywolaniem edge function, sprawdzic dostep odbiorcy
- Jesli brak dostepu — pominac insert do `user_notifications` i wywolanie `send-chat-notification-email`

## Pliki do edycji/utworzenia

| Plik | Zmiana |
|------|--------|
| `src/hooks/useRecipientChatAccess.ts` | Nowy hook — sprawdza czy odbiorca ma dostep do czatu |
| `src/hooks/useUnifiedChat.ts` | Sprawdzenie dostepu przed wyslaniem + pomiecie notyfikacji |
| `src/components/messages/FullChatWindow.tsx` | Nowy prop `recipientChatDisabled`, komunikat zamiast inputa |
| `src/components/chat-sidebar/ChatPanelContent.tsx` | Uzycie hooka i przekazanie propu |
| `src/pages/MessagesPage.tsx` | Analogiczna integracja jak w ChatPanelContent |

