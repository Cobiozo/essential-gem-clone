

# Wyswietlanie badge nieprzeczytanych wiadomosci per rozmowa

## Problem
Ikona czatu w topbarze poprawnie pokazuje laczna liczbe nieprzeczytanych (16), ale po otwarciu panelu czatu zaden element listy nie wskazuje, ktore rozmowy maja nowe wiadomosci. Dane sa juz dostepne w hookach -- `unreadCounts` map przechowuje klucze `dm-${userId}` i `incoming-${senderRole}` -- ale nigdy nie sa przekazywane do komponentow listy.

## Zmiany

### 1. Udostepnic `unreadCounts` z `useUnifiedChat`
**Plik: `src/hooks/useUnifiedChat.ts`**
- Dodac `unreadCounts` do zwracanego obiektu hooka (obecnie jest wewnetrznym stanem, nieeksportowanym)

### 2. Przekazac `unreadCounts` przez warstwy komponentow
**Pliki: `ChatPanelContent.tsx`, `MessagesPage.tsx`**
- Pobrac `unreadCounts` z hooka i przekazac do `MessagesSidebar`

**Plik: `MessagesSidebar.tsx`**
- Dodac prop `unreadCounts?: Map<string, number>`
- Przekazac do `TeamMembersSection` i uzyc w `ConversationListItem`
- Wyswietlic badge przy admin conversations: `unreadCounts.get('dm-' + conv.userId)`

**Plik: `TeamMembersSection.tsx`**
- Dodac prop `unreadCounts` i przekazac do kazdego `TeamMemberItem`

### 3. Dodac badge w `TeamMemberItem`
**Plik: `TeamMemberItem.tsx`**
- Dodac opcjonalny prop `unreadCount?: number`
- Gdy > 0, wyswietlic czerwony badge (destructive) z liczba po prawej stronie elementu (identyczny styl jak w `ChannelListItem`)

### 4. Badge w `ConversationListItem`
**Plik: `MessagesSidebar.tsx` (komponent wewnetrzny)**
- Dodac prop `unreadCount` do `ConversationListItem`
- Wyswietlic czerwony badge z liczba nieprzeczitanych

### 5. Rowniez w `ConversationsSidebar.tsx` (panel docked/PiP)
Ten komponent juz wyswietla `channel.unreadCount` -- ale nie obsluguje DM. Upewnic sie, ze tez przekazuje badge dla direct messages.

## Efekt
Po otwarciu panelu czatu uzytkownik od razu widzi, ktore rozmowy (DM i kanaly) maja nowe wiadomosci -- czerwony badge z liczba, identyczny jak na ikonach powiadomien.

## Pliki do edycji
- `src/hooks/useUnifiedChat.ts` (eksport `unreadCounts`)
- `src/components/chat-sidebar/ChatPanelContent.tsx`
- `src/pages/MessagesPage.tsx`
- `src/components/messages/MessagesSidebar.tsx`
- `src/components/messages/TeamMembersSection.tsx`
- `src/components/messages/TeamMemberItem.tsx`

