

# Prywatna konwersacja admin-uzytkownik: dwustronna komunikacja

## Problem
Gdy admin inicjuje prywatna rozmowe z uzytkownikiem, system blokuje odpowiedzi uzytkownika jesli:
- Globalnie czat jest wylaczony dla roli admina (chat_sidebar_visibility)
- Hook `useRecipientChatAccess` zwraca `false` dla admina jako odbiorcy
- W `sendDirectMessage` blokada `checkRecipientChatAccess` nie rozroznia aktywnej konwersacji admin-user od zwyklego pisania

Konwersacja prywatna zainicjowana przez admina powinna byc **dwustronna** — uzytkownik musi moc odpowiadac.

## Rozwiazanie

### 1. `useRecipientChatAccess.ts` — pomijanie blokady jesli jest aktywna admin-konwersacja

W `checkRecipientChatAccess` dodac opcjonalny parametr `senderUserId`. Jesli podany, sprawdzic w tabeli `admin_conversations` czy istnieje otwarta konwersacja miedzy tymi dwoma uzytkownikami. Jesli tak — zwrocic `true` (pomijajac globalne ustawienia widocznosci).

```typescript
export const checkRecipientChatAccess = async (
  recipientUserId: string, 
  senderUserId?: string
): Promise<boolean> => {
  // NEW: If there's an active admin conversation, always allow
  if (senderUserId) {
    const { data: adminConv } = await supabase
      .from('admin_conversations')
      .select('status')
      .or(`and(admin_user_id.eq.${recipientUserId},target_user_id.eq.${senderUserId}),and(admin_user_id.eq.${senderUserId},target_user_id.eq.${recipientUserId})`)
      .eq('status', 'open')
      .maybeSingle();
    
    if (adminConv) return true;
  }
  
  // ... existing per-user override and global role checks
};
```

### 2. Hook `useRecipientChatAccess` — przekazac ID aktualnego usera

Dodac import `useAuth` i przekazac `user.id` do `checkRecipientChatAccess(recipientUserId, user.id)`.

### 3. `useUnifiedChat.ts` — `sendDirectMessage`

Przekazac `user.id` do `checkRecipientChatAccess(recipientId, user.id)` tak aby aktywna admin-konwersacja omijala blokade.

### 4. `FullChatWindow.tsx` — bez zmian

Logika `canSend` juz obsluguje `adminConversationStatus === 'closed'` prawidlowo. Jesli konwersacja jest otwarta i `recipientChatDisabled` bedzie `false` (dzieki poprawce w hooku), uzytkownik bedzie mogl pisac.

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useRecipientChatAccess.ts` | Dodac sprawdzanie `admin_conversations` przed blokada; przyjac `senderUserId` |
| `src/hooks/useUnifiedChat.ts` | Przekazac `user.id` do `checkRecipientChatAccess` |

