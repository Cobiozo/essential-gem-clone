

# Plan: Admin zawsze może pisać do każdego użytkownika

## Problem

Gdy admin wybiera użytkownika (np. Jan Koterski), hook `useRecipientChatAccess` sprawdza czy ten użytkownik ma włączony czat. Jeśli czat jest wyłączony globalnie dla jego roli — hook zwraca `hasAccess: false` → UI blokuje pole wiadomości **zanim** admin zdąży cokolwiek napisać.

Rekord `admin_conversations` (który bypassuje tę blokadę) jest tworzony dopiero przy wysyłaniu wiadomości — problem jajka i kury.

## Rozwiązanie

Admin powinien **zawsze** móc pisać do każdego użytkownika. Wystarczy wyłączyć `recipientChatDisabled` gdy zalogowany użytkownik jest adminem.

## Zmiany

### 1. `src/components/chat-sidebar/ChatPanelContent.tsx`

Zmienić linię z `recipientChatDisabled`:

```typescript
// Było:
recipientChatDisabled={selectedDirectUserId ? !recipientHasAccess : false}

// Będzie:
recipientChatDisabled={selectedDirectUserId && !isAdmin ? !recipientHasAccess : false}
```

### 2. `src/pages/MessagesPage.tsx`

Ta sama zmiana:

```typescript
// Było:
recipientChatDisabled={selectedDirectUserId ? !recipientHasAccess : false}

// Będzie:
recipientChatDisabled={selectedDirectUserId && !isAdmin ? !recipientHasAccess : false}
```

## Efekt

- Admin może pisać do dowolnego użytkownika niezależnie od ustawień widoczności czatu
- Zwykli użytkownicy nadal podlegają sprawdzeniu `recipientChatAccess`
- Brak zmian w logice backendu — RLS i `checkRecipientChatAccess` w `sendDirectMessage` i tak bypassują dla aktywnych konwersacji admin

| Plik | Zmiana |
|------|--------|
| `src/components/chat-sidebar/ChatPanelContent.tsx` | `!isAdmin` guard na `recipientChatDisabled` |
| `src/pages/MessagesPage.tsx` | `!isAdmin` guard na `recipientChatDisabled` |

